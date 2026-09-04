import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, Assignment, TimetableEntry, Quiz } from '@/lib/models';
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

    const quizQuery: Record<string, any> = {};
    if (isBranchAdmin && branchObjectId) {
      quizQuery.$or = [
        { branchId: branchObjectId },
        { targetBranches: branchObjectId },
        { targetBranchCodes: 'ALL' },
        { targetType: 'all_first_years' },
        { targetType: 'all' },
        { targetType: 'all_branch_year' },
      ];
    }

    const upcomingQuizQuery: Record<string, any> = { ...quizQuery, status: 'upcoming' };

    const [totalStudents, totalAssignments, activeAssignments, totalEntries, totalQuizzes, upcomingQuizzes] = await Promise.all([
      User.countDocuments(userQuery),
      Assignment.countDocuments(assignmentQuery),
      Assignment.countDocuments(activeAssignmentQuery),
      TimetableEntry.countDocuments(timetableQuery),
      Quiz.countDocuments(quizQuery),
      Quiz.countDocuments(upcomingQuizQuery),
    ]);

    return NextResponse.json({
      stats: {
        totalStudents,
        totalAssignments,
        activeAssignments,
        totalEntries,
        totalQuizzes,
        upcomingQuizzes,
      },
    });
  } catch (error: any) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

