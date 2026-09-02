import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { verifyPassword, createToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { ensureDatabaseBootstrapped } from '@/lib/bootstrap';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    await connectToDatabase();
    await ensureDatabaseBootstrapped();

    const normalizedEmail = email.trim().toLowerCase();

    // Check for configured Super Admin credentials
    const configuredAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'classreps@iiitb.ac.in').toLowerCase().trim();
    const configuredAdminPassword = process.env.SUPER_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'AdminSecure#2026!iiitbKey$99';

    let user = await User.findOne({ email: normalizedEmail });

    // Auto-provision or update Super Admin if credentials match env secrets
    if (normalizedEmail === configuredAdminEmail && password === configuredAdminPassword) {
      if (!user) {
        const passwordHash = await bcrypt.hash(configuredAdminPassword, 12);
        user = await User.create({
          name: 'IIIT-B Class Representatives Admin',
          email: configuredAdminEmail,
          passwordHash,
          role: 'superadmin',
        });
      } else if (user.role !== 'superadmin') {
        user.role = 'superadmin';
        await user.save();
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Verify password against database hash or env secret for admin
    let valid = false;
    if (normalizedEmail === configuredAdminEmail && password === configuredAdminPassword) {
      valid = true;
    } else {
      valid = await verifyPassword(password, user.passwordHash);
    }

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const token = await createToken({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId ? user.branchId.toString() : null,
      year: user.year || null,
      section: user.section || null,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId ? user.branchId.toString() : null,
        year: user.year || null,
        section: user.section || null,
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
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
