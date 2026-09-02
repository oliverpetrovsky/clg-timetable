import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models';

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

