import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, Branch } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const userDocs = await User.find()
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    const users = userDocs.map((u: any) => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      year: u.year || null,
      section: u.section || null,
      created_at: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
      branch_name: u.branchId?.name || '',
      branch_code: u.branchId?.code || '',
      branchId: u.branchId?._id ? u.branchId._id.toString() : (u.branchId ? u.branchId.toString() : null),
    }));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { userId, role, branchId, year, section } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (role && !['student', 'admin', 'superadmin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role === 'superadmin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only superadmins can assign superadmin role' }, { status: 403 });
    }

    await connectToDatabase();

    const updateFields: Record<string, any> = {};
    if (role) {
      updateFields.role = role;
    }
    if (branchId !== undefined) {
      if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
        updateFields.branchId = new mongoose.Types.ObjectId(branchId);
      } else if (branchId === null || branchId === '') {
        updateFields.branchId = null;
      }
    }
    if (year !== undefined) {
      updateFields.year = year ? Number(year) : null;
    }
    if (section !== undefined) {
      updateFields.section = section ? section.toString().toUpperCase().trim() : null;
    }

    await User.findByIdAndUpdate(userId, { $set: updateFields });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
