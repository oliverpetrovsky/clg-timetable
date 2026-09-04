import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Notification } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const userObjectId = mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : null;

    const branchObjectId = user.branchId && mongoose.Types.ObjectId.isValid(user.branchId)
      ? new mongoose.Types.ObjectId(user.branchId)
      : null;

    const orConditions: any[] = [];
    if (userObjectId) orConditions.push({ userId: userObjectId });
    if (branchObjectId) {
      orConditions.push({
        branchId: branchObjectId,
        $or: [{ year: user.year }, { year: null }, { year: { $exists: false } }],
      });
    }
    // Global notifications (all branches / all 1st years)
    orConditions.push({
      branchId: null,
      $or: [{ year: user.year }, { year: null }, { year: { $exists: false } }],
    });
    orConditions.push({
      branchId: { $exists: false },
      $or: [{ year: user.year }, { year: null }, { year: { $exists: false } }],
    });

    const query = orConditions.length > 0 ? { $or: orConditions } : {};

    const docs = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const notifications = docs.map((n: any) => ({
      id: n._id.toString(),
      _id: n._id.toString(),
      user_id: n.userId?.toString(),
      branch_id: n.branchId?.toString(),
      year: n.year,
      title: n.title,
      message: n.message,
      type: n.type || 'info',
      is_read: n.isRead ? 1 : 0,
      isRead: n.isRead,
      created_at: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    await connectToDatabase();

    if (id === 'all') {
      const userObjectId = mongoose.Types.ObjectId.isValid(user.id)
        ? new mongoose.Types.ObjectId(user.id)
        : null;

      const branchObjectId = user.branchId && mongoose.Types.ObjectId.isValid(user.branchId)
        ? new mongoose.Types.ObjectId(user.branchId)
        : null;

      const orConditions: any[] = [];
      if (userObjectId) orConditions.push({ userId: userObjectId });
      if (branchObjectId) {
        orConditions.push({
          branchId: branchObjectId,
          $or: [{ year: user.year }, { year: null }, { year: { $exists: false } }],
        });
      }
      orConditions.push({
        branchId: null,
        $or: [{ year: user.year }, { year: null }, { year: { $exists: false } }],
      });
      orConditions.push({
        branchId: { $exists: false },
        $or: [{ year: user.year }, { year: null }, { year: { $exists: false } }],
      });

      if (orConditions.length > 0) {
        await Notification.updateMany({ $or: orConditions }, { $set: { isRead: true } });
      }
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      await Notification.findByIdAndUpdate(id, { $set: { isRead: true } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
