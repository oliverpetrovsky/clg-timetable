import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Quiz, Branch, Notification } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

// Fallback dynamic seed quizzes when collection is empty for the batch
const DEFAULT_QUIZZES = [
  {
    subject: 'Data Structures & Algorithms',
    title: 'Quiz 1: Advanced Trees & Graph Traversals',
    description: 'Covers Red-Black Trees, AVL Trees, BFS/DFS, Dijkstra, and Topological Sort with complexity analysis.',
    dateOffsetDays: 3,
    time: '10:00 AM – 11:00 AM',
    room: 'Lab 201',
    totalMarks: 25,
    weightage: '10%',
    topics: ['AVL Trees', 'Red-Black Trees', 'Dijkstra Algorithm', 'Topological Sort'],
    status: 'upcoming',
  },
  {
    subject: 'Mathematics - 1',
    title: 'Midterm Assessment: Linear Algebra & Vector Spaces',
    description: 'Eigenvalues, Eigenvectors, Gram-Schmidt orthogonalization, and Matrix Factorizations (SVD, LU).',
    dateOffsetDays: 7,
    time: '02:00 PM – 03:30 PM',
    room: 'Academic Block Audi-1',
    totalMarks: 50,
    weightage: '20%',
    topics: ['Eigenvalues & Eigenvectors', 'Vector Spaces', 'SVD & LU Decomposition'],
    status: 'upcoming',
  },
  {
    subject: 'Computer Networks',
    title: 'Quiz 2: Transport & Network Layer Protocols',
    description: 'TCP 3-way handshake, Congestion Control (Tahoe/Reno), CIDR Subnetting, and Distance Vector Routing.',
    dateOffsetDays: 12,
    time: '11:30 AM – 12:30 PM',
    room: 'Room 304',
    totalMarks: 20,
    weightage: '10%',
    topics: ['TCP Congestion Control', 'CIDR Subnetting', 'BGP & OSPF Routing'],
    status: 'upcoming',
  },
  {
    subject: 'Database Management Systems',
    title: 'Lab Quiz: SQL Triggers, Indices & Normalization',
    description: 'Hands-on query execution, 3NF/BCNF Decomposition, and indexing strategies in PostgreSQL.',
    dateOffsetDays: 18,
    time: '02:00 PM – 04:00 PM',
    room: 'Software Lab 3',
    totalMarks: 30,
    weightage: '15%',
    topics: ['Triggers & Stored Procedures', 'BCNF Decomposition', 'B+ Tree Indexing'],
    status: 'upcoming',
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const year = searchParams.get('year');
    const status = searchParams.get('status') || 'all';
    const section = searchParams.get('section');

    await connectToDatabase();

    const query: Record<string, any> = {};

    if (year) {
      query.year = parseInt(year);
    }

    if (status !== 'all') {
      query.status = status;
    }

    if (section && section.toUpperCase() !== 'ALL') {
      const secUpper = section.toUpperCase().trim();
      query.$or = [
        { section: null },
        { section: '' },
        { section: 'ALL' },
        { section: 'All' },
        { section: secUpper },
      ];
    }

    if (branchId) {
      if (mongoose.Types.ObjectId.isValid(branchId)) {
        query.branchId = new mongoose.Types.ObjectId(branchId);
      } else {
        const bDoc = await Branch.findOne({
          $or: [{ code: branchId.toUpperCase() }, { name: branchId }],
        });
        if (bDoc) query.branchId = bDoc._id;
      }
    }

    let docs = await Quiz.find(query)
      .populate('branchId', 'name code')
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
          branch_id: branchId || '1',
          branchId: branchId || '1',
          year: year ? parseInt(year) : 1,
          section: section || 'A',
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
          branch_name: 'Engineering',
          branch_code: 'CSE',
          created_by_name: 'Academic Office',
        };
      });

      return NextResponse.json({ quizzes: generated });
    }

    const quizzes = docs.map((q: any) => ({
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
      branch_name: q.branchId?.name || '',
      branch_code: q.branchId?.code || '',
      created_by_name: q.createdBy?.name || '',
    }));

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

    let branchObjectId: mongoose.Types.ObjectId | undefined;
    if (body.branchId) {
      if (mongoose.Types.ObjectId.isValid(body.branchId.toString())) {
        branchObjectId = new mongoose.Types.ObjectId(body.branchId.toString());
      } else {
        const bDoc = await Branch.findOne({
          $or: [{ code: body.branchId.toString().toUpperCase() }, { name: body.branchId.toString() }],
        });
        if (bDoc) branchObjectId = bDoc._id as mongoose.Types.ObjectId;
      }
    }

    if (!branchObjectId) {
      const defaultBranch = await Branch.findOne();
      if (defaultBranch) branchObjectId = defaultBranch._id as mongoose.Types.ObjectId;
    }

    const createdByObjectId = user && mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : undefined;

    const newQuiz = await Quiz.create({
      branchId: branchObjectId,
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

    if (branchObjectId) {
      await Notification.create({
        branchId: branchObjectId,
        year: body.year || 1,
        title: 'New Quiz Announced',
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
