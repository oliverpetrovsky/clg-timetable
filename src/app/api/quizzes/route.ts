import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Quiz, Branch, Notification } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

// Fallback seed quizzes with rich batch targeting
const DEFAULT_QUIZZES = [
  {
    subject: 'Mathematics - 1',
    title: 'Midterm 1: Linear Algebra & Vector Spaces',
    description: 'Eigenvalues, Eigenvectors, Gram-Schmidt orthogonalization, and Matrix Factorizations (SVD, LU). Common for all first years.',
    dateOffsetDays: 3,
    time: '02:00 PM – 03:30 PM',
    room: 'Main Auditorium (Audi-1)',
    totalMarks: 50,
    weightage: '20%',
    topics: ['Eigenvalues & Eigenvectors', 'Vector Spaces', 'SVD & LU Decomposition'],
    status: 'upcoming',
    targetType: 'all_first_years',
    targetBranchCodes: ['ALL', 'CSE', 'ECE', 'AI&DS'],
    targetLabel: 'All 1st Years (CSE, ECE, AI&DS)',
    year: 1,
    section: 'ALL',
  },
  {
    subject: 'Probability & Statistics',
    title: 'Quiz 1: Random Variables & Joint Distributions',
    description: 'Conditional probability, Bayes Theorem, Continuous Random Variables, Expectation, and Joint CDF/PDF.',
    dateOffsetDays: 6,
    time: '11:00 AM – 12:00 PM',
    room: 'Room 203 (AI Wing)',
    totalMarks: 25,
    weightage: '10%',
    topics: ['Bayes Theorem', 'Random Variables', 'Joint Probability Distributions'],
    status: 'upcoming',
    targetType: 'specific_branches',
    targetBranchCodes: ['AI&DS'],
    targetLabel: 'AI&DS Year 1 Only',
    year: 1,
    section: 'B',
  },
  {
    subject: 'Data Structures & Algorithms',
    title: 'Quiz 1: Advanced Trees & Graph Traversals',
    description: 'Covers Red-Black Trees, AVL Trees, BFS/DFS, Dijkstra, and Topological Sort with complexity analysis.',
    dateOffsetDays: 9,
    time: '10:00 AM – 11:00 AM',
    room: 'Lab 201',
    totalMarks: 25,
    weightage: '10%',
    topics: ['AVL Trees', 'Red-Black Trees', 'Dijkstra Algorithm', 'Topological Sort'],
    status: 'upcoming',
    targetType: 'specific_branches',
    targetBranchCodes: ['CSE'],
    targetLabel: 'CSE Year 1 (Section A)',
    year: 1,
    section: 'A',
  },
  {
    subject: 'Basic Electronic Circuits',
    title: 'Quiz 2: Diode Models & Op-Amp Circuits',
    description: 'Diode clipping/clamping, Zener voltage regulators, inverting & non-inverting Op-Amp configurations.',
    dateOffsetDays: 13,
    time: '09:30 AM – 10:30 AM',
    room: 'Hardware Lab 102',
    totalMarks: 20,
    weightage: '10%',
    topics: ['Zener Regulators', 'Op-Amp Circuits', 'Filter Design'],
    status: 'upcoming',
    targetType: 'specific_section',
    targetBranchCodes: ['ECE', 'AI&DS'],
    targetLabel: 'Section B (ECE & AI&DS)',
    year: 1,
    section: 'B',
  },
  {
    subject: 'Computer Networks',
    title: 'Quiz 2: Transport & Network Layer Protocols',
    description: 'TCP 3-way handshake, Congestion Control (Tahoe/Reno), CIDR Subnetting, and Distance Vector Routing.',
    dateOffsetDays: 16,
    time: '11:30 AM – 12:30 PM',
    room: 'Room 304',
    totalMarks: 20,
    weightage: '10%',
    topics: ['TCP Congestion Control', 'CIDR Subnetting', 'BGP & OSPF Routing'],
    status: 'upcoming',
    targetType: 'all_branch_year',
    targetBranchCodes: ['CSE', 'ECE'],
    targetLabel: 'CSE & ECE Year 2',
    year: 2,
    section: 'ALL',
  },
  {
    subject: 'Database Management Systems',
    title: 'Lab Quiz: SQL Triggers, Indices & Normalization',
    description: 'Hands-on query execution, 3NF/BCNF Decomposition, and indexing strategies in PostgreSQL.',
    dateOffsetDays: 20,
    time: '02:00 PM – 04:00 PM',
    room: 'Software Lab 3',
    totalMarks: 30,
    weightage: '15%',
    topics: ['Triggers & Stored Procedures', 'BCNF Decomposition', 'B+ Tree Indexing'],
    status: 'upcoming',
    targetType: 'specific_branches',
    targetBranchCodes: ['CSE', 'AI&DS'],
    targetLabel: 'CSE & AI&DS Year 2',
    year: 2,
    section: 'ALL',
  },
];

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

    let docs = await Quiz.find(status !== 'all' ? { status } : {})
      .populate('branchId', 'name code')
      .populate('targetBranches', 'name code')
      .populate('createdBy', 'name')
      .sort({ date: 1 })
      .lean();

    // If no quizzes exist in DB yet, generate initial contextual quizzes
    if (docs.length === 0) {
      const today = new Date();
      const generated = DEFAULT_QUIZZES.map((q, idx) => {
        const qDate = new Date(today);
        qDate.setDate(today.getDate() + q.dateOffsetDays);
        const dateStr = qDate.toISOString().split('T')[0];

        return {
          id: `seed-quiz-${idx + 1}`,
          _id: `seed-quiz-${idx + 1}`,
          branch_id: branchDoc?._id?.toString() || branchId || '1',
          branchId: branchDoc?._id?.toString() || branchId || '1',
          year: q.year,
          section: q.section,
          subject: q.subject,
          title: q.title,
          description: q.description,
          date: dateStr,
          due_date: dateStr,
          time: q.time,
          room: q.room,
          totalMarks: q.totalMarks,
          weightage: q.weightage,
          topics: q.topics,
          status: q.status,
          targetType: q.targetType,
          targetBranchCodes: q.targetBranchCodes,
          targetLabel: q.targetLabel,
          branch_name: branchDoc?.name || 'Academic Department',
          branch_code: branchCode || 'ALL',
          created_by_name: 'Academic Office',
        };
      });

      // Filter generated items based on request
      const filtered = generated.filter(q => {
        // Target type filter
        if (targetTypeParam && targetTypeParam !== 'all' && q.targetType !== targetTypeParam) {
          return false;
        }

        // Year filter
        if (yearParam && parseInt(yearParam) !== q.year) {
          // If quiz is all_years, let it pass
          if (q.targetType !== 'all') return false;
        }

        // Batch / Branch targeting
        if (branchCode) {
          const isAllTarget =
            q.targetType === 'all_first_years' ||
            q.targetType === 'all' ||
            (q.targetBranchCodes && (q.targetBranchCodes.includes('ALL') || q.targetBranchCodes.includes(branchCode)));

          if (!isAllTarget) return false;
        }

        // Section filter
        if (section && section.toUpperCase() !== 'ALL' && q.section && q.section.toUpperCase() !== 'ALL') {
          if (q.section.toUpperCase() !== section.toUpperCase()) return false;
        }

        return true;
      });

      return NextResponse.json({ quizzes: filtered.length > 0 ? filtered : generated });
    }

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
