import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Assignment, Branch, Notification } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { assignmentSchema } from '@/lib/validations';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const year = searchParams.get('year');
    const status = searchParams.get('status') || 'active';
    const section = searchParams.get('section');

    if (!branchId || !year) {
      return NextResponse.json(
        { error: 'branchId and year are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const yearNum = parseInt(year);

    // Resolve branch document
    let branchDoc: any = null;
    let branchCode = '';
    let branchObjectId: mongoose.Types.ObjectId | null = null;

    if (branchId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(branchId)) {
        branchObjectId = new mongoose.Types.ObjectId(branchId);
        branchDoc = await Branch.findById(branchObjectId).lean();
      } else {
        branchDoc = await Branch.findOne({
          $or: [{ code: branchId.toUpperCase() }, { name: branchId }],
        }).lean();
        if (branchDoc) branchObjectId = branchDoc._id;
      }
      if (branchDoc) {
        branchCode = branchDoc.code.toUpperCase();
      }
    }

    // Build branch matching conditions:
    // Match this branch OR multi-branch targets OR all 1st years (ECE is part of all 1st years) OR global assignments
    const branchOrConditions: any[] = [];
    if (branchObjectId) {
      branchOrConditions.push({ branchId: branchObjectId });
      branchOrConditions.push({ targetBranches: branchObjectId });
    }
    if (branchCode) {
      branchOrConditions.push({ targetBranchCodes: branchCode });
    }
    branchOrConditions.push({ targetBranchCodes: 'ALL' });
    branchOrConditions.push({ targetType: 'all' });
    branchOrConditions.push({ targetType: 'all_branch_year' });
    branchOrConditions.push({ branchId: null });
    branchOrConditions.push({ branchId: { $exists: false } });

    // If Year 1: ECE 1st year is part of all 1st years!
    if (yearNum === 1) {
      branchOrConditions.push({ targetType: 'all_first_years' });
      branchOrConditions.push({ targetLabel: { $regex: /all (1st|first) years?/i } });
    }

    const query: Record<string, any> = {
      year: yearNum,
      $or: branchOrConditions,
    };

    if (status !== 'all') {
      query.status = status;
    }

    const docs = await Assignment.find(query)
      .populate('branchId', 'name code')
      .populate('targetBranches', 'name code')
      .populate('createdBy', 'name')
      .sort({ dueDate: 1 })
      .lean();

    const secUpper = section ? section.toUpperCase().trim() : null;

    let assignments = docs.map((a: any) => {
      let bCodes: string[] = a.targetBranchCodes ? [...a.targetBranchCodes] : [];
      if (a.targetBranches && Array.isArray(a.targetBranches)) {
        a.targetBranches.forEach((b: any) => {
          if (b?.code && !bCodes.includes(b.code)) {
            bCodes.push(b.code);
          }
        });
      }
      if (a.branchId?.code && !bCodes.includes(a.branchId.code)) {
        bCodes.push(a.branchId.code);
      }

      const isAll1stYears =
        a.targetType === 'all_first_years' ||
        (a.targetLabel && /all (1st|first) years?/i.test(a.targetLabel)) ||
        (a.year === 1 && (bCodes.includes('ALL') || (bCodes.includes('CSE') && bCodes.includes('ECE'))));

      if (isAll1stYears) {
        ['ALL', 'CSE', 'ECE', 'AI&DS'].forEach(c => {
          if (!bCodes.includes(c)) bCodes.push(c);
        });
      }

      return {
        id: a._id.toString(),
        _id: a._id.toString(),
        branch_id: a.branchId?._id?.toString() || branchId,
        branchId: a.branchId?._id?.toString() || branchId,
        year: a.year,
        section: a.section || null,
        subject: a.subject,
        title: a.title,
        description: a.description || null,
        due_date: a.dueDate,
        dueDate: a.dueDate,
        priority: a.priority || 'medium',
        status: a.status || 'active',
        targetType: isAll1stYears ? 'all_first_years' : (a.targetType || 'specific_branches'),
        targetBranchCodes: bCodes,
        targetLabel: a.targetLabel || (isAll1stYears ? 'All 1st Years (CSE, ECE, AI&DS)' : undefined),
        branch_name: a.branchId?.name || '',
        branch_code: a.branchId?.code || '',
        created_by_name: a.createdBy?.name || '',
      };
    });

    if (secUpper && secUpper !== 'ALL') {
      assignments = assignments.filter((a: any) => {
        const isAll1stYears =
          a.targetType === 'all_first_years' ||
          (a.targetLabel && /all (1st|first) years?/i.test(a.targetLabel));

        if (isAll1stYears && a.year === 1) {
          return true; // All 1st years assignments apply to all sections
        }

        if (!a.section || a.section.toUpperCase() === 'ALL' || a.section === '') {
          return true;
        }

        return a.section.toUpperCase() === secUpper;
      });
    }

    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error('Assignments fetch error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = assignmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const data = parsed.data;
    let targetType = data.targetType || 'specific_branches';
    let targetBranchCodes: string[] = data.targetBranchCodes || [];
    let targetLabel = data.targetLabel;

    const isAll1stYearsTarget =
      targetType === 'all_first_years' ||
      data.branchId === 'all' ||
      (data.year === 1 && targetBranchCodes.includes('ALL')) ||
      (data.year === 1 && data.branchId === 'all');

    if (isAll1stYearsTarget) {
      targetType = 'all_first_years';
      targetBranchCodes = ['ALL', 'CSE', 'ECE', 'AI&DS'];
      if (!targetLabel) targetLabel = 'All 1st Years (CSE, ECE, AI&DS)';
      data.section = 'ALL';
      data.year = 1;
    }

    // Resolve branch ObjectIds
    let branchObjectIds: mongoose.Types.ObjectId[] = [];
    if (targetType === 'all_first_years') {
      const allBranches = await Branch.find({ code: { $in: ['CSE', 'ECE', 'AI&DS'] } });
      branchObjectIds = allBranches.map(b => b._id as mongoose.Types.ObjectId);
    } else if (targetBranchCodes.length > 0) {
      const branches = await Branch.find({ code: { $in: targetBranchCodes.map((c: string) => c.toUpperCase()) } });
      branchObjectIds = branches.map(b => b._id as mongoose.Types.ObjectId);
    }

    let primaryBranchId = branchObjectIds[0];
    if (!primaryBranchId && data.branchId && data.branchId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(data.branchId.toString())) {
        primaryBranchId = new mongoose.Types.ObjectId(data.branchId.toString());
      } else {
        const bDoc = await Branch.findOne({ $or: [{ code: data.branchId.toString().toUpperCase() }, { name: data.branchId.toString() }] });
        if (bDoc) primaryBranchId = bDoc._id as mongoose.Types.ObjectId;
      }
    }

    if (!primaryBranchId) {
      const defaultBranch = await Branch.findOne();
      if (defaultBranch) primaryBranchId = defaultBranch._id as mongoose.Types.ObjectId;
    }

    if (user.role === 'admin' && user.branchId && primaryBranchId && user.branchId !== primaryBranchId.toString() && targetType !== 'all_first_years') {
      return NextResponse.json(
        { error: 'You can only create assignments for your own branch' },
        { status: 403 }
      );
    }

    const createdByObjectId = mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : undefined;

    const newAssignment = await Assignment.create({
      branchId: primaryBranchId,
      targetBranches: branchObjectIds,
      targetBranchCodes: targetBranchCodes.length > 0 ? targetBranchCodes : ['ALL'],
      targetType,
      targetLabel,
      year: data.year,
      section: data.section || undefined,
      subject: data.subject,
      title: data.title,
      description: data.description || undefined,
      dueDate: data.dueDate,
      priority: data.priority || 'medium',
      createdBy: createdByObjectId,
    });

    // Create notifications for all targeted branches
    const targetBranchesToNotify = branchObjectIds.length > 0 ? branchObjectIds : (primaryBranchId ? [primaryBranchId] : []);
    if (targetBranchesToNotify.length > 0) {
      await Promise.all(
        targetBranchesToNotify.map(bId =>
          Notification.create({
            branchId: bId,
            year: data.year,
            title: `New Assignment: ${targetLabel || data.title}`,
            message: `"${data.title}" for ${data.subject} — Due: ${data.dueDate}`,
            type: 'assignment',
          })
        )
      );
    }

    return NextResponse.json({ id: newAssignment._id.toString() }, { status: 201 });
  } catch (error: any) {
    console.error('Assignment create error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid Assignment ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const updateFields: Record<string, any> = {};
    if (updates.title) updateFields.title = updates.title;
    if (updates.description !== undefined) updateFields.description = updates.description;
    if (updates.dueDate || updates.due_date) updateFields.dueDate = updates.dueDate || updates.due_date;
    if (updates.priority) updateFields.priority = updates.priority;
    if (updates.status) updateFields.status = updates.status;

    await Assignment.findByIdAndUpdate(id, { $set: updateFields });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Assignment update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid assignment ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    await Assignment.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Assignment delete error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
