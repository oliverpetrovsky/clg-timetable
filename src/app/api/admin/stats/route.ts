import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, Assignment, TimetableEntry } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const isBranchAdmin = user.role === 'admin';
    const branchObjectId = isBranchAdmin && user.branchId && mongoose.Types.ObjectId.isValid(user.branchId)
      ? new mongoose.Types.ObjectId(user.branchId)
      : null;

    const userQuery: Record<string, any> = { role: 'student' };
    if (isBranchAdmin && branchObjectId) {
      userQuery.branchId = branchObjectId;
    }

    const assignmentQuery: Record<string, any> = {};
    if (isBranchAdmin && branchObjectId) {
      assignmentQuery.branchId = branchObjectId;
    }

    const activeAssignmentQuery: Record<string, any> = { status: 'active' };
    if (isBranchAdmin && branchObjectId) {
      activeAssignmentQuery.branchId = branchObjectId;
    }

    const timetableQuery: Record<string, any> = {};
    if (isBranchAdmin && branchObjectId) {
      timetableQuery.branchId = branchObjectId;
    }

    const [totalStudents, totalAssignments, activeAssignments, totalEntries] = await Promise.all([
      User.countDocuments(userQuery),
      Assignment.countDocuments(assignmentQuery),
      Assignment.countDocuments(activeAssignmentQuery),
      TimetableEntry.countDocuments(timetableQuery),
    ]);

    return NextResponse.json({
      stats: {
        totalStudents,
        totalAssignments,
        activeAssignments,
        totalEntries,
      },
    });
  } catch (error: any) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
