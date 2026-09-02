import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Quiz, Branch, Notification } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
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
      const bCodes = q.targetBranchCodes || (q.targetBranches?.map((b: any) => b.code) || []);
      if (q.branchId?.code && !bCodes.includes(q.branchId.code)) {
        bCodes.push(q.branchId.code);
      }

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
        targetType: q.targetType || 'specific_branches',
        targetBranchCodes: bCodes,
        targetLabel: q.targetLabel || (q.targetType === 'all_first_years' ? 'All 1st Years (CSE, ECE, AI&DS)' : `${bCodes.join(', ') || 'Branch'} Year ${q.year}`),
        branch_name: q.branchId?.name || '',
        branch_code: q.branchId?.code || '',
        created_by_name: q.createdBy?.name || '',
      };
    });

    // Apply batch targeting filters
    if (yearParam || branchCode || section || targetTypeParam) {
      quizzes = quizzes.filter(q => {
        if (targetTypeParam && targetTypeParam !== 'all' && q.targetType !== targetTypeParam) {
          return false;
        }

        if (yearParam && parseInt(yearParam) !== q.year) {
          if (q.targetType !== 'all') return false;
        }

        if (branchCode) {
          const isTargeted =
            q.targetType === 'all_first_years' ||
            q.targetType === 'all' ||
            (q.targetBranchCodes && (q.targetBranchCodes.includes('ALL') || q.targetBranchCodes.includes(branchCode)));

          if (!isTargeted) return false;
        }

        if (section && section.toUpperCase() !== 'ALL' && q.section && q.section.toUpperCase() !== 'ALL') {
          if (q.section.toUpperCase() !== section.toUpperCase()) return false;
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
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    if (!body.title || !body.subject || !body.date) {
      return NextResponse.json(
        { error: 'title, subject, and date are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let targetBranchCodes = body.targetBranchCodes || [];
    let targetType = body.targetType || 'specific_branches';
    let targetLabel = body.targetLabel;

    // Resolve branch ObjectIds
    let branchObjectIds: mongoose.Types.ObjectId[] = [];
    if (targetBranchCodes.length > 0) {
      const branches = await Branch.find({ code: { $in: targetBranchCodes.map((c: string) => c.toUpperCase()) } });
      branchObjectIds = branches.map(b => b._id as mongoose.Types.ObjectId);
    }

    let primaryBranchId = branchObjectIds[0];
    if (!primaryBranchId && body.branchId) {
      if (mongoose.Types.ObjectId.isValid(body.branchId.toString())) {
        primaryBranchId = new mongoose.Types.ObjectId(body.branchId.toString());
      } else {
        const bDoc = await Branch.findOne({
          $or: [{ code: body.branchId.toString().toUpperCase() }, { name: body.branchId.toString() }],
        });
        if (bDoc) primaryBranchId = bDoc._id as mongoose.Types.ObjectId;
      }
    }

    if (!primaryBranchId) {
      const defaultBranch = await Branch.findOne();
      if (defaultBranch) primaryBranchId = defaultBranch._id as mongoose.Types.ObjectId;
    }

    // Auto-generate target label if not supplied
    if (!targetLabel) {
      if (targetType === 'all_first_years') {
        targetLabel = 'All 1st Years (CSE, ECE, AI&DS)';
      } else if (targetType === 'all_branch_year') {
        targetLabel = `All Year ${body.year || 1} Students`;
      } else if (targetType === 'specific_section') {
        targetLabel = `Section ${body.section || 'B'} (${targetBranchCodes.join(' & ') || 'Batch'})`;
      } else if (targetBranchCodes.length === 1) {
        targetLabel = `${targetBranchCodes[0]} Year ${body.year || 1} Only`;
      } else if (targetBranchCodes.length > 1) {
        targetLabel = `${targetBranchCodes.join(' & ')} Year ${body.year || 1}`;
      } else {
        targetLabel = `Year ${body.year || 1} Batch`;
      }
    }

    const createdByObjectId = user && mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : undefined;

    const newQuiz = await Quiz.create({
      branchId: primaryBranchId,
      targetBranches: branchObjectIds,
      targetBranchCodes: targetBranchCodes.length > 0 ? targetBranchCodes : ['ALL'],
      targetType,
      targetLabel,
      year: body.year || 1,
      section: body.section || undefined,
      subject: body.subject,
      title: body.title,
      description: body.description || undefined,
      date: body.date,
      time: body.time || undefined,
      room: body.room || undefined,
      totalMarks: body.totalMarks ? Number(body.totalMarks) : undefined,
      weightage: body.weightage || undefined,
      topics: body.topics || (body.description ? [body.description] : []),
      status: body.status || 'upcoming',
      createdBy: createdByObjectId,
    });

    if (primaryBranchId) {
      await Notification.create({
        branchId: primaryBranchId,
        year: body.year || 1,
        title: `New Quiz Announced: ${targetLabel}`,
        message: `"${body.title}" for ${body.subject} on ${body.date}${body.time ? ` (${body.time})` : ''}`,
        type: 'info',
      });
    }

    return NextResponse.json({ quiz: newQuiz }, { status: 201 });
  } catch (error: any) {
    console.error('Quiz create error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    if (mongoose.Types.ObjectId.isValid(id)) {
      await Quiz.findByIdAndUpdate(id, { $set: updates });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Quiz update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    if (mongoose.Types.ObjectId.isValid(id)) {
      await Quiz.findByIdAndDelete(id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Quiz delete error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
