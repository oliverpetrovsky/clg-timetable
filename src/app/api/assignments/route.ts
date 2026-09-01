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

    if (!branchId || !year) {
      return NextResponse.json(
        { error: 'branchId and year are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const query: Record<string, any> = {
      year: parseInt(year),
    };

    if (status !== 'all') {
      query.status = status;
    }

    if (mongoose.Types.ObjectId.isValid(branchId)) {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    } else {
      const bDoc = await Branch.findOne({ $or: [{ code: branchId.toUpperCase() }, { name: branchId }] });
      if (bDoc) query.branchId = bDoc._id;
    }

    const docs = await Assignment.find(query)
      .populate('branchId', 'name code')
      .populate('createdBy', 'name')
      .sort({ dueDate: 1 })
      .lean();

    const assignments = docs.map((a: any) => ({
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
      branch_name: a.branchId?.name || '',
      branch_code: a.branchId?.code || '',
      created_by_name: a.createdBy?.name || '',
    }));

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

    if (user.role === 'admin' && user.branchId && user.branchId !== branchObjectId.toString()) {
      return NextResponse.json(
        { error: 'You can only create assignments for your own branch' },
        { status: 403 }
      );
    }

    const createdByObjectId = mongoose.Types.ObjectId.isValid(user.id)
      ? new mongoose.Types.ObjectId(user.id)
      : undefined;

    const newAssignment = await Assignment.create({
      branchId: branchObjectId,
      year: data.year,
      section: data.section || undefined,
      subject: data.subject,
      title: data.title,
      description: data.description || undefined,
      dueDate: data.dueDate,
      priority: data.priority || 'medium',
      createdBy: createdByObjectId,
    });

    // Create notification
    await Notification.create({
      branchId: branchObjectId,
      year: data.year,
      title: 'New Assignment',
      message: `"${data.title}" for ${data.subject} — Due: ${data.dueDate}`,
      type: 'assignment',
    });

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
