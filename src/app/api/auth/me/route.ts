import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models';
import mongoose from 'mongoose';

export async function GET() {
  const tokenUser = await getCurrentUser();
  if (!tokenUser) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const userDoc = await User.findById(tokenUser.id).populate('branchId', 'name code').lean();
    if (!userDoc) {
      return NextResponse.json({ user: tokenUser });
    }

    const branchObj = userDoc.branchId as any;
    const user = {
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      branchId: branchObj?._id ? branchObj._id.toString() : (userDoc.branchId ? userDoc.branchId.toString() : null),
      branch_id: branchObj?._id ? branchObj._id.toString() : (userDoc.branchId ? userDoc.branchId.toString() : null),
      branch_code: branchObj?.code || '',
      branch_name: branchObj?.name || '',
      year: userDoc.year || tokenUser.year || null,
      section: userDoc.section || tokenUser.section || 'A',
    };

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: tokenUser });
  }
}

export async function PUT(req: Request) {
  const tokenUser = await getCurrentUser();
  if (!tokenUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { branchId, year, section } = await req.json();
    await connectToDatabase();

    const updateFields: Record<string, any> = {};
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

    const updatedUserDoc = await User.findByIdAndUpdate(
      tokenUser.id,
      { $set: updateFields },
      { new: true }
    ).populate('branchId', 'name code').lean();

    if (!updatedUserDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const branchObj = (updatedUserDoc as any).branchId;
    const user = {
      id: updatedUserDoc._id.toString(),
      name: updatedUserDoc.name,
      email: updatedUserDoc.email,
      role: updatedUserDoc.role,
      branchId: branchObj?._id ? branchObj._id.toString() : ((updatedUserDoc as any).branchId ? (updatedUserDoc as any).branchId.toString() : null),
      branch_id: branchObj?._id ? branchObj._id.toString() : ((updatedUserDoc as any).branchId ? (updatedUserDoc as any).branchId.toString() : null),
      branch_code: branchObj?.code || '',
      branch_name: branchObj?.name || '',
      year: (updatedUserDoc as any).year || null,
      section: (updatedUserDoc as any).section || 'A',
    };

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

