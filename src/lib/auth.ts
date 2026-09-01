import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { connectToDatabase } from './mongodb';
import { User } from './models';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-me-in-production-random-key'
);

// Defaults to IIIT-B domain restriction
const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'iiitb.ac.in';

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin' | 'superadmin';
  branchId: string | null;
  year: number | null;
  section: string | null;
}

export function isAllowedEmail(email: string): boolean {
  if (!email) return false;
  if (ALLOWED_DOMAIN === '*' || !ALLOWED_DOMAIN) return true;
  const domain = ALLOWED_DOMAIN.toLowerCase().trim();
  const lowerEmail = email.toLowerCase().trim();
  return lowerEmail.endsWith(`@${domain}`) || lowerEmail.endsWith(`.${domain}`) || lowerEmail.includes(domain);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: UserPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getUserById(id: string): Promise<UserPayload | null> {
  await connectToDatabase();
  const user = await User.findById(id).lean();
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    branchId: user.branchId ? user.branchId.toString() : null,
    year: user.year || null,
    section: user.section || null,
  };
}
