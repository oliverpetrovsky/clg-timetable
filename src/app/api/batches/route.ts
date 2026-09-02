import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Batch, Branch } from '@/lib/models';
import { getCurrentUser } from '@/lib/auth';
import { ensureDatabaseBootstrapped } from '@/lib/bootstrap';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    await ensureDatabaseBootstrapped();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const year = searchParams.get('year');
    const section = searchParams.get('section');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query: Record<string, any> = {};
    if (!includeInactive) {
      query.isActive = true;
    }

    if (branchId) {
      if (mongoose.Types.ObjectId.isValid(branchId)) {
        query.branchId = new mongoose.Types.ObjectId(branchId);
      } else {
        const branchDoc = await Branch.findOne({
          $or: [{ code: branchId.toUpperCase() }, { name: branchId }],
        });
        if (branchDoc) {
          query.branchId = branchDoc._id;
        }
      }
    }

    if (year) {
      query.year = parseInt(year);
    }

    if (section) {
      query.section = section.toUpperCase();
    }

    const batchDocs = await Batch.find(query)
      .populate('branchId', 'name code')
      .sort({ year: 1, section: 1 })
      .lean();

    const batches = batchDocs.map((b: any) => ({
      id: b._id.toString(),
      _id: b._id.toString(),
      branchId: b.branchId?._id?.toString() || b.branchId?.toString(),
      branchCode: b.branchId?.code || '',
      branchName: b.branchId?.name || '',
      year: b.year,
      section: b.section,
      programme: b.programme,
      name: b.name,
      isActive: b.isActive ?? true,
    }));

    return NextResponse.json({ batches });
  } catch (error: any) {
    console.error('Fetch batches error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Unauthorized: only Superadmin can manage academic batches' },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const body = await req.json();
    const { branchId, year, section, programme, name } = body;

    if (!branchId || !year || !section || !programme) {
      return NextResponse.json(
        { error: 'branchId, year, section, and programme are required' },
        { status: 400 }
      );
    }

    const newBatch = await Batch.create({
      branchId: new mongoose.Types.ObjectId(branchId),
      year: parseInt(year),
      section: section.toUpperCase(),
      programme,
      name: name || `Year ${year} - Section ${section.toUpperCase()} (${programme})`,
      isActive: true,
    });

    return NextResponse.json({ batch: newBatch }, { status: 201 });
  } catch (error: any) {
    console.error('Create batch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create batch' },
      { status: 500 }
    );
  }
}
