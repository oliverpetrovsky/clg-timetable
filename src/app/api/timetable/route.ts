import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { TimetableEntry, Branch, User, Notification } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { timetableEntrySchema } from '@/lib/validations';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const year = searchParams.get('year');
    const section = searchParams.get('section') || 'A';

    if (!branchId || !year) {
      return NextResponse.json(
        { error: 'branchId and year are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Query filter
    const query: Record<string, any> = {
      year: parseInt(year),
      section,
    };

    if (mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    } else {
      // Find branch by code or name
      const bDoc = await Branch.findOne({ $or: [{ code: branchId.toUpperCase() }, { name: branchId }] });
      if (bDoc) query.branchId = bDoc._id;
    }

    const docs = await TimetableEntry.find(query)
      .populate('branchId', 'name code')
      .populate('createdBy', 'name')
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    const entries = docs.map((t: any) => ({
      id: t._id.toString(),
      _id: t._id.toString(),
      branch_id: t.branchId?._id?.toString() || branchId,
      branchId: t.branchId?._id?.toString() || branchId,
      year: t.year,
      section: t.section,
      day_of_week: t.dayOfWeek,
      dayOfWeek: t.dayOfWeek,
      start_time: t.startTime,
      startTime: t.startTime,
      end_time: t.endTime,
      endTime: t.endTime,
      subject: t.subject,
      teacher: t.teacher || null,
      room: t.room || null,
      type: t.type || 'lecture',
      branch_name: t.branchId?.name || '',
      branch_code: t.branchId?.code || '',
      created_by_name: t.createdBy?.name || '',
    }));

    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error('Timetable fetch error:', error);
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
    const parsed = timetableEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const data = parsed.data;

    let branchObjectId: mongoose.Types.ObjectId;
    if (mongoose.Types.ObjectId.isValid(data.branchId.toString())) {
      branchObjectId = new mongoose.Types.ObjectId(data.branchId.toString());
    } else {
      const bDoc = await Branch.findOne({ $or: [{ code: data.branchId.toString().toUpperCase() }, { name: data.branchId.toString() }] });
      if (!bDoc) {
        return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
      }
      branchObjectId = bDoc._id as mongoose.Types.ObjectId;
    }

    // Branch admins can only modify their own branch (unless superadmin)
    if (user.role === 'admin' && user.branchId && user.branchId !== branchObjectId.toString()) {
      return NextResponse.json(
        { error: 'You can only manage timetable for your own branch.' },
        { status: 403 }
      );
    }

    const createdByObjectId = mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : undefined;

    const newEntry = await TimetableEntry.create({
      branchId: branchObjectId,
      year: data.year,
      section: data.section || 'A',
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      subject: data.subject,
      teacher: data.teacher || undefined,
      room: data.room || undefined,
      type: data.type || 'lecture',
      createdBy: createdByObjectId,
    });

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayText = dayNames[data.dayOfWeek] || 'upcoming';

    // Create notification for students in that branch & year
    await Notification.create({
      branchId: branchObjectId,
      year: data.year,
      title: 'Timetable Updated',
      message: `${data.subject} (${data.type}) has been added to ${dayText} schedule (${data.startTime} - ${data.endTime})`,
      type: 'timetable_change',
    });

    return NextResponse.json({ id: newEntry._id.toString() }, { status: 201 });
  } catch (error: any) {
    console.error('Timetable create error:', error);
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
      return NextResponse.json({ error: 'Valid entry ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const entry = await TimetableEntry.findById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 });
    }

    if (user.role === 'admin' && user.branchId && entry.branchId.toString() !== user.branchId) {
      return NextResponse.json({ error: 'You can only delete entries for your own branch' }, { status: 403 });
    }

    await TimetableEntry.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Timetable delete error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
