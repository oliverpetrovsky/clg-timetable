import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Quiz, Branch, Notification } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { quizSchema } from '@/lib/validations';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const yearParam = searchParams.get('year');
    const status = searchParams.get('status') || 'all';
    const section = searchParams.get('section');
    const targetTypeParam = searchParams.get('targetType');

    await connectToDatabase();

    // Resolve branch document if branchId is provided
    let branchDoc: any = null;
    let branchCode = '';
    if (branchId && branchId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(branchId)) {
        branchDoc = await Branch.findById(branchId).lean();
      } else {
        branchDoc = await Branch.findOne({
          $or: [{ code: branchId.toUpperCase() }, { name: branchId }],
        }).lean();
      }
      if (branchDoc) {
        branchCode = branchDoc.code;
      }
    }

    const docs = await Quiz.find(status !== 'all' ? { status } : {})
      .populate('branchId', 'name code')
      .populate('targetBranches', 'name code')
      .populate('createdBy', 'name')
      .sort({ date: 1 })
      .lean();

    // Format DB docs
    let quizzes = docs.map((q: any) => {
      let bCodes: string[] = q.targetBranchCodes ? [...q.targetBranchCodes] : [];
      if (q.targetBranches && Array.isArray(q.targetBranches)) {
        q.targetBranches.forEach((b: any) => {
          if (b?.code && !bCodes.includes(b.code)) {
            bCodes.push(b.code);
          }
        });
      }
      if (q.branchId?.code && !bCodes.includes(q.branchId.code)) {
        bCodes.push(q.branchId.code);
      }

      const isAll1stYears =
        q.targetType === 'all_first_years' ||
        (q.targetLabel && /all (1st|first) years?/i.test(q.targetLabel)) ||
        (q.year === 1 && (bCodes.includes('ALL') || (bCodes.includes('CSE') && bCodes.includes('ECE'))));

      if (isAll1stYears) {
        ['ALL', 'CSE', 'ECE', 'AI&DS'].forEach(c => {
          if (!bCodes.includes(c)) bCodes.push(c);
        });
      }

      const defaultLabel = isAll1stYears
        ? 'All 1st Years (CSE, ECE, AI&DS)'
        : `${bCodes.join(', ') || 'Branch'} Year ${q.year}`;

      return {
        id: q._id.toString(),
        _id: q._id.toString(),
        branch_id: q.branchId?._id?.toString() || branchId,
        branchId: q.branchId?._id?.toString() || branchId,
        year: q.year,
        section: q.section || null,
        subject: q.subject,
        title: q.title,
        description: q.description || null,
        date: q.date,
        due_date: q.date,
        time: q.time || null,
        room: q.room || null,
        totalMarks: q.totalMarks || null,
        weightage: q.weightage || null,
        topics: q.topics || [],
        status: q.status || 'upcoming',
        targetType: isAll1stYears ? 'all_first_years' : (q.targetType || 'specific_branches'),
        targetBranchCodes: bCodes,
        targetLabel: q.targetLabel || defaultLabel,
        branch_name: q.branchId?.name || '',
        branch_code: q.branchId?.code || '',
        created_by_name: q.createdBy?.name || '',
      };
    });

    // Apply batch targeting filters
    if (yearParam || branchCode || section || targetTypeParam) {
      const yearNum = yearParam ? parseInt(yearParam) : null;
      const secUpper = section ? section.toUpperCase().trim() : null;
      const upperBranchCode = branchCode ? branchCode.toUpperCase().trim() : '';

      quizzes = quizzes.filter(q => {
        const isAll1stYears =
          q.targetType === 'all_first_years' ||
          (q.targetLabel && /all (1st|first) years?/i.test(q.targetLabel)) ||
          (q.year === 1 && (q.targetBranchCodes?.includes('ALL') || (q.targetBranchCodes?.includes('CSE') && q.targetBranchCodes?.includes('ECE'))));

        if (targetTypeParam && targetTypeParam !== 'all') {
          if (targetTypeParam === 'all_first_years' && !isAll1stYears) {
            return false;
          }
          if (targetTypeParam !== 'all_first_years' && q.targetType !== targetTypeParam) {
            return false;
          }
        }

        // Year matching
        if (yearNum !== null) {
          if (isAll1stYears) {
            if (yearNum !== 1) return false;
          } else if (q.targetType === 'all') {
            // Applies to all years
          } else if (q.year !== yearNum) {
            return false;
          }
        }

        // Branch matching (e.g. ECE, CSE, AI&DS)
        // ECE 1st year are part of all 1st years!
        if (upperBranchCode) {
          const isTargeted =
            (isAll1stYears && (yearNum === 1 || q.year === 1)) ||
            q.targetType === 'all' ||
            (q.targetType === 'all_branch_year' && (yearNum === null || q.year === yearNum)) ||
            (q.targetBranchCodes && (q.targetBranchCodes.includes('ALL') || q.targetBranchCodes.includes(upperBranchCode))) ||
            q.branch_code?.toUpperCase() === upperBranchCode;

          if (!isTargeted) return false;
        }

        // Section matching (e.g. 'A', 'B')
        // All 1st years quizzes cover ALL sections (Sec A for CSE, Sec B for ECE/AI&DS)
        if (secUpper && secUpper !== 'ALL') {
          if (isAll1stYears && (yearNum === 1 || q.year === 1)) {
            // Apply across all 1st year sections
          } else if (q.section && q.section.toUpperCase() !== 'ALL') {
            if (q.section.toUpperCase() !== secUpper) return false;
          }
        }

        return true;
      });
    }

    return NextResponse.json({ quizzes });
  } catch (error: any) {
    console.error('Quizzes fetch error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Only admins and superadmins can schedule quizzes for batches
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json(
      { error: 'Unauthorized: Only admins can schedule quizzes for batches' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = quizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const data = parsed.data;
    let targetBranchCodes: string[] = data.targetBranchCodes || [];
    let targetType = data.targetType || 'specific_branches';
    let targetLabel = data.targetLabel;

    const isEntireFirstYears =
      targetType === 'all_first_years' ||
      data.targetPresetId === 'all_first_years' ||
      (data.year === 1 && (targetBranchCodes.includes('ALL') || (targetBranchCodes.includes('CSE') && targetBranchCodes.includes('ECE'))));

    const isAllBatches =
      targetType === 'all' ||
      data.targetPresetId === 'all_batches' ||
      (targetBranchCodes.includes('ALL') && !data.year);

    const isAllBranchYear =
      targetType === 'all_branch_year' ||
      data.targetPresetId === 'all_branch_year' ||
      (targetBranchCodes.includes('ALL') && data.year && data.year > 1);

    if (isEntireFirstYears) {
      targetType = 'all_first_years';
      targetBranchCodes = ['ALL', 'CSE', 'ECE', 'AI&DS'];
      if (!targetLabel) targetLabel = 'All 1st Years (CSE, ECE, AI&DS)';
      data.year = 1;
      data.section = 'ALL';
    } else if (isAllBatches) {
      targetType = 'all';
      targetBranchCodes = ['ALL', 'CSE', 'ECE', 'AI&DS'];
      if (!targetLabel) targetLabel = 'All Batches & Branches';
      data.section = 'ALL';
    } else if (isAllBranchYear) {
      targetType = 'all_branch_year';
      if (targetBranchCodes.length === 0 || targetBranchCodes.includes('ALL')) {
        targetBranchCodes = data.year === 2 || data.year === 3 ? ['CSE', 'ECE', 'AI&DS'] : ['CSE', 'ECE'];
      }
      if (!targetLabel) targetLabel = `All Year ${data.year} Batches (${targetBranchCodes.filter(c => c !== 'ALL').join(', ')})`;
      data.section = 'ALL';
    }

    // Resolve branch ObjectIds
    let branchObjectIds: mongoose.Types.ObjectId[] = [];
    if (targetType === 'all_first_years' || targetType === 'all') {
      const allBranches = await Branch.find({ code: { $in: ['CSE', 'ECE', 'AI&DS'] } });
      branchObjectIds = allBranches.map(b => b._id as mongoose.Types.ObjectId);
    } else if (targetBranchCodes.length > 0) {
      const codes = targetBranchCodes.map((c: string) => c.toUpperCase());
      if (codes.includes('ALL')) {
        const allBranches = await Branch.find({ code: { $in: ['CSE', 'ECE', 'AI&DS'] } });
        branchObjectIds = allBranches.map(b => b._id as mongoose.Types.ObjectId);
      } else {
        const branchCodesToFind = codes.flatMap(c => (c === 'AI&DS' || c === 'AIDS' ? ['AI&DS', 'AIDS'] : [c]));
        const branches = await Branch.find({ code: { $in: branchCodesToFind } });
        branchObjectIds = branches.map(b => b._id as mongoose.Types.ObjectId);
      }
    }

    // Determine primary branch ID (prefer user's branch if matched)
    let primaryBranchId: mongoose.Types.ObjectId | null = null;
    if (user.branchId && mongoose.Types.ObjectId.isValid(user.branchId)) {
      const userBranchObjId = new mongoose.Types.ObjectId(user.branchId);
      if (branchObjectIds.some(b => b.equals(userBranchObjId))) {
        primaryBranchId = userBranchObjId;
      }
    }

    if (!primaryBranchId && branchObjectIds.length > 0) {
      primaryBranchId = branchObjectIds[0];
    }

    if (!primaryBranchId && data.branchId && data.branchId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(data.branchId.toString())) {
        primaryBranchId = new mongoose.Types.ObjectId(data.branchId.toString());
      } else {
        const bDoc = await Branch.findOne({
          $or: [{ code: data.branchId.toString().toUpperCase() }, { name: data.branchId.toString() }],
        });
        if (bDoc) primaryBranchId = bDoc._id as mongoose.Types.ObjectId;
      }
    }

    if (!primaryBranchId && user.branchId && mongoose.Types.ObjectId.isValid(user.branchId)) {
      primaryBranchId = new mongoose.Types.ObjectId(user.branchId);
    }

    if (!primaryBranchId) {
      const defaultBranch = await Branch.findOne();
      if (defaultBranch) primaryBranchId = defaultBranch._id as mongoose.Types.ObjectId;
    }

    // Auto-generate target label if not supplied
    if (!targetLabel) {
      if (targetType === 'all_first_years') {
        targetLabel = 'All 1st Years (CSE, ECE, AI&DS)';
      } else if (targetType === 'all') {
        targetLabel = 'All Batches & Branches';
      } else if (targetType === 'all_branch_year') {
        targetLabel = `All Year ${data.year || 1} Students`;
      } else if (targetType === 'specific_section') {
        targetLabel = `Section ${data.section || 'A'} (${targetBranchCodes.filter(c => c !== 'ALL').join(' & ') || 'Batch'})`;
      } else if (targetBranchCodes.length === 1) {
        targetLabel = `${targetBranchCodes[0]} Year ${data.year || 1} Only`;
      } else if (targetBranchCodes.length > 1) {
        targetLabel = `${targetBranchCodes.filter(c => c !== 'ALL').join(' & ')} Year ${data.year || 1}`;
      } else {
        targetLabel = `Year ${data.year || 1} Batch`;
      }
    }

    const createdByObjectId = mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : undefined;

    const newQuiz = await Quiz.create({
      branchId: primaryBranchId,
      targetBranches: branchObjectIds,
      targetBranchCodes: targetBranchCodes.length > 0 ? targetBranchCodes : ['ALL'],
      targetType,
      targetLabel,
      year: data.year || 1,
      section: data.section || undefined,
      subject: data.subject,
      title: data.title,
      description: data.description || undefined,
      date: data.date,
      time: data.time || undefined,
      room: data.room || undefined,
      totalMarks: data.totalMarks ? Number(data.totalMarks) : undefined,
      weightage: data.weightage || undefined,
      topics: data.topics || (data.description ? [data.description] : []),
      status: data.status || 'upcoming',
      createdBy: createdByObjectId,
    });

    // Notify all targeted branches (CSE, ECE, AI&DS, etc.)
    const targetBranchesToNotify = branchObjectIds.length > 0 ? branchObjectIds : (primaryBranchId ? [primaryBranchId] : []);
    if (targetBranchesToNotify.length > 0) {
      await Promise.all(
        targetBranchesToNotify.map(bId =>
          Notification.create({
            branchId: bId,
            year: data.year || 1,
            title: `New Quiz Announced: ${targetLabel}`,
            message: `"${data.title}" for ${data.subject} on ${data.date}${data.time ? ` (${data.time})` : ''}`,
            type: 'info',
          })
        )
      );
    }

    return NextResponse.json({ quiz: newQuiz }, { status: 201 });
  } catch (error: any) {
    console.error('Quiz create error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized: Only admins can edit quizzes' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid Quiz ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const updateFields: Record<string, any> = {};
    if (updates.title !== undefined) updateFields.title = updates.title;
    if (updates.subject !== undefined) updateFields.subject = updates.subject;
    if (updates.description !== undefined) updateFields.description = updates.description;
    if (updates.date !== undefined) updateFields.date = updates.date;
    if (updates.time !== undefined) updateFields.time = updates.time;
    if (updates.room !== undefined) updateFields.room = updates.room;
    if (updates.totalMarks !== undefined) updateFields.totalMarks = updates.totalMarks ? Number(updates.totalMarks) : undefined;
    if (updates.weightage !== undefined) updateFields.weightage = updates.weightage;
    if (updates.targetLabel !== undefined) updateFields.targetLabel = updates.targetLabel;
    if (updates.status !== undefined) updateFields.status = updates.status;

    await Quiz.findByIdAndUpdate(id, { $set: updateFields });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Quiz update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized: Only admins can delete quizzes' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid Quiz ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    await Quiz.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Quiz delete error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

