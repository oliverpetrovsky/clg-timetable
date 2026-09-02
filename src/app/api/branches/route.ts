import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Branch } from '@/lib/models';
import { ensureDatabaseBootstrapped } from '@/lib/bootstrap';

export const dynamic = 'force-dynamic';

const ALLOWED_BRANCH_CODES = ['CSE', 'ECE', 'AI&DS'];

export async function GET() {
  try {
    await connectToDatabase();
    await ensureDatabaseBootstrapped();
    const branchDocs = await Branch.find({ code: { $in: ALLOWED_BRANCH_CODES } })
      .sort({ code: 1 })
      .lean();

    const branches = branchDocs.map(b => ({
      id: b._id.toString(),
      _id: b._id.toString(),
      name: b.name,
      code: b.code,
      description: b.description || '',
    }));

    return NextResponse.json({ branches });
  } catch (error: any) {
    console.error('Fetch branches error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
