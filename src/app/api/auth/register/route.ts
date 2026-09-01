import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, Branch } from '@/lib/models';
import { hashPassword, isAllowedEmail, createToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, branchId, year, section } = parsed.data;

    if (!isAllowedEmail(email)) {
      return NextResponse.json(
        { error: 'Only emails from the permitted college domain are allowed.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 400 }
      );
    }

    // Resolve branch ID if passed as string/code
    let branchObjectId: mongoose.Types.ObjectId | undefined;
    if (mongoose.Types.ObjectId.isValid(branchId.toString())) {
      branchObjectId = new mongoose.Types.ObjectId(branchId.toString());
    } else {
      const bDoc = await Branch.findOne({ $or: [{ code: branchId.toString().toUpperCase() }, { name: branchId.toString() }] });
      if (bDoc) branchObjectId = bDoc._id as mongoose.Types.ObjectId;
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'student',
      branchId: branchObjectId,
      year,
      section: section || 'A',
    });

    const token = await createToken({
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      branchId: newUser.branchId ? newUser.branchId.toString() : null,
      year: newUser.year || null,
      section: newUser.section || null,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
