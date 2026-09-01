import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI environment variable is not defined. Please configure it in your Render environment or .env.local file.'
    );
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongooseInstance) => {
      // Auto-seed default branches and accounts on first connect if needed
      try {
        await seedDefaultDataIfEmpty(mongooseInstance);
      } catch (seedErr) {
        console.warn('Auto-seeding check error:', seedErr);
      }
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Auto seed helper when deploying to a fresh MongoDB cluster
async function seedDefaultDataIfEmpty(mongooseInstance: typeof mongoose) {
  const { Branch, User } = await import('./models');
  const bcrypt = await import('bcryptjs');

  const branchCount = await Branch.countDocuments();
  if (branchCount === 0) {
    console.log('🌱 Seeding initial branches...');
    await Branch.create([
      { name: 'Computer Science & Engineering', code: 'CSE', description: 'Department of Computer Science and Engineering' },
      { name: 'Electronics & Communication', code: 'ECE', description: 'Department of Electronics and Communication Engineering' },
      { name: 'Mechanical Engineering', code: 'ME', description: 'Department of Mechanical Engineering' },
      { name: 'Civil Engineering', code: 'CE', description: 'Department of Civil Engineering' },
      { name: 'Electrical Engineering', code: 'EE', description: 'Department of Electrical Engineering' },
      { name: 'Information Technology', code: 'IT', description: 'Department of Information Technology' },
    ]);
  }

  // Seed / ensure IIIT-B class rep admin account
  const classRepAdmin = await User.findOne({ email: 'classreps@iiitb.ac.in' });
  if (!classRepAdmin) {
    console.log('🌱 Creating IIIT-B Class Rep Admin (classreps@iiitb.ac.in)...');
    const adminHash = await bcrypt.hash('tbsm-naamsujal-vichaar-Vy0m', 12);
    await User.create({
      name: 'IIIT-B Class Reps',
      email: 'classreps@iiitb.ac.in',
      passwordHash: adminHash,
      role: 'superadmin',
    });
  }

  // Also ensure demo student account for IIIT-B
  const student = await User.findOne({ email: 'student@iiitb.ac.in' });
  if (!student) {
    const cseBranch = await Branch.findOne({ code: 'CSE' });
    const studentHash = await bcrypt.hash('student123', 12);
    await User.create({
      name: 'IIIT-B Student',
      email: 'student@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: cseBranch ? cseBranch._id : undefined,
      year: 2,
      section: 'A',
    });
  }
}
