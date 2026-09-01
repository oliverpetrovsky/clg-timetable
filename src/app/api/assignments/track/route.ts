import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { AssignmentTracking, Assignment } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const userObjectId = new mongoose.Types.ObjectId(user.id);
    const trackingDocs = await AssignmentTracking.find({ userId: userObjectId })
      .populate('assignmentId')
      .lean();

    const tracking = trackingDocs.map((t: any) => ({
      id: t._id.toString(),
      assignment_id: t.assignmentId?._id?.toString() || t.assignmentId?.toString(),
      assignmentId: t.assignmentId?._id?.toString() || t.assignmentId?.toString(),
      user_id: t.userId?.toString(),
      status: t.status || 'pending',
      notes: t.notes || null,
      completed_at: t.completedAt ? t.completedAt.toISOString() : null,
      title: t.assignmentId?.title || '',
      subject: t.assignmentId?.subject || '',
      due_date: t.assignmentId?.dueDate || '',
      priority: t.assignmentId?.priority || 'medium',
    }));

    return NextResponse.json({ tracking });
  } catch (error: any) {
    console.error('Track fetch error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assignmentId, status, notes } = await req.json();

    if (!assignmentId || !mongoose.Types.ObjectId.isValid(assignmentId)) {
      return NextResponse.json({ error: 'Valid assignment ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const userObjectId = new mongoose.Types.ObjectId(user.id);
    const assignmentObjectId = new mongoose.Types.ObjectId(assignmentId);

    const completedAt = status === 'completed' ? new Date() : undefined;

    await AssignmentTracking.findOneAndUpdate(
      { assignmentId: assignmentObjectId, userId: userObjectId },
      {
        $set: {
          status: status || 'pending',
          notes: notes || null,
          completedAt,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Track assignment error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
