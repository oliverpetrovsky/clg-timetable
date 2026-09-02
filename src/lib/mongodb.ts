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
  const { Branch, Batch, User } = await import('./models');
  const bcrypt = await import('bcryptjs');

  const branchCount = await Branch.countDocuments();
  if (branchCount === 0) {
    console.log('🌱 Seeding initial IIIT-B branches...');
    await Branch.create([
      {
        name: 'Computer Science & Engineering',
        code: 'CSE',
        description: 'B.Tech. in Computer Science and Engineering. The programme emphasizes programming, mathematics, theoretical computer science and computer systems.',
      },
      {
        name: 'Electronics & Communication Engineering',
        code: 'ECE',
        description: 'B.Tech. in Electronics & Communication Engineering. The programme combines programming, computer systems, electronics, communication, VLSI and embedded systems.',
      },
      {
        name: 'Artificial Intelligence & Data Science',
        code: 'AI&DS',
        description: 'B.Tech. in Artificial Intelligence & Data Science. The programme focuses on mathematics, statistics, data science, artificial intelligence and machine learning.',
      },
    ]);
  }

  // Ensure department admins & branch objects
  const cseBranch = await Branch.findOne({ code: 'CSE' });
  const eceBranch = await Branch.findOne({ code: 'ECE' });
  const aidsBranch = await Branch.findOne({ code: 'AI&DS' });

  // Seed academic batches collection if empty
  const batchCount = await Batch.countDocuments();
  if (batchCount === 0 && cseBranch && eceBranch && aidsBranch) {
    console.log('🌱 Seeding IIIT-B academic batches collection...');
    await Batch.create([
      // CSE Batches (Section A)
      { branchId: cseBranch._id, year: 1, section: 'A', programme: 'B.Tech & iMTech', name: 'CSE Year 1 (Section A)' },
      { branchId: cseBranch._id, year: 2, section: 'A', programme: 'B.Tech & iMTech', name: 'CSE Year 2 (Section A)' },
      { branchId: cseBranch._id, year: 3, section: 'A', programme: 'B.Tech & iMTech', name: 'CSE Year 3 (Section A)' },
      { branchId: cseBranch._id, year: 4, section: 'A', programme: 'iMTech Only', name: 'CSE Year 4 (Section A - iMTech)' },
      { branchId: cseBranch._id, year: 5, section: 'A', programme: 'iMTech Only', name: 'CSE Year 5 (Section A - iMTech)' },

      // ECE Batches (Section B)
      { branchId: eceBranch._id, year: 1, section: 'B', programme: 'B.Tech & iMTech', name: 'ECE Year 1 (Section B)' },
      { branchId: eceBranch._id, year: 2, section: 'B', programme: 'B.Tech & iMTech', name: 'ECE Year 2 (Section B)' },
      { branchId: eceBranch._id, year: 3, section: 'B', programme: 'B.Tech & iMTech', name: 'ECE Year 3 (Section B)' },
      { branchId: eceBranch._id, year: 4, section: 'B', programme: 'iMTech Only', name: 'ECE Year 4 (Section B - iMTech)' },
      { branchId: eceBranch._id, year: 5, section: 'B', programme: 'iMTech Only', name: 'ECE Year 5 (Section B - iMTech)' },

      // AI&DS Batches (Section B, Years 1-3 only)
      { branchId: aidsBranch._id, year: 1, section: 'B', programme: 'B.Tech Only', name: 'AI&DS Year 1 (Section B)' },
      { branchId: aidsBranch._id, year: 2, section: 'B', programme: 'B.Tech Only', name: 'AI&DS Year 2 (Section B)' },
      { branchId: aidsBranch._id, year: 3, section: 'B', programme: 'B.Tech Only', name: 'AI&DS Year 3 (Section B)' },
    ]);
  }

  // Seed / ensure IIIT-B class rep superadmin account
  const classRepAdmin = await User.findOne({ email: 'classreps@iiitb.ac.in' });
  if (!classRepAdmin) {
    console.log('🌱 Creating IIIT-B Class Rep Admin (classreps@iiitb.ac.in)...');
    const adminHash = await bcrypt.hash('tbsm-naamsujal-vichaar-Vy0m', 12);
    await User.create({
      name: 'IIIT-B Class Representatives Admin',
      email: 'classreps@iiitb.ac.in',
      passwordHash: adminHash,
      role: 'superadmin',
    });
  }

  const branchAdminHash = await bcrypt.hash('branch123', 12);

  if (cseBranch && !(await User.findOne({ email: 'cse.admin@iiitb.ac.in' }))) {
    await User.create({
      name: 'IIIT-B CSE Admin',
      email: 'cse.admin@iiitb.ac.in',
      passwordHash: branchAdminHash,
      role: 'admin',
      branchId: cseBranch._id,
    });
  }

  if (eceBranch && !(await User.findOne({ email: 'ece.admin@iiitb.ac.in' }))) {
    await User.create({
      name: 'IIIT-B ECE Admin',
      email: 'ece.admin@iiitb.ac.in',
      passwordHash: branchAdminHash,
      role: 'admin',
      branchId: eceBranch._id,
    });
  }

  if (aidsBranch && !(await User.findOne({ email: 'aids.admin@iiitb.ac.in' }))) {
    await User.create({
      name: 'IIIT-B AI&DS Admin',
      email: 'aids.admin@iiitb.ac.in',
      passwordHash: branchAdminHash,
      role: 'admin',
      branchId: aidsBranch._id,
    });
  }

  // Ensure demo student accounts with accurate section distribution:
  // - Section A: CSE
  // - Section B: ECE and AI&DS (grouped together)
  const studentHash = await bcrypt.hash('student123', 12);

  if (cseBranch && !(await User.findOne({ email: 'student.cse@iiitb.ac.in' }))) {
    await User.create({
      name: 'IIIT-B CSE Student (Sec A)',
      email: 'student.cse@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: cseBranch._id,
      year: 1,
      section: 'A',
    });
  }

  if (eceBranch && !(await User.findOne({ email: 'student.ece@iiitb.ac.in' }))) {
    await User.create({
      name: 'IIIT-B ECE Student (Sec B)',
      email: 'student.ece@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: eceBranch._id,
      year: 1,
      section: 'B',
    });
  }

  if (aidsBranch && !(await User.findOne({ email: 'student.aids@iiitb.ac.in' }))) {
    await User.create({
      name: 'IIIT-B AI&DS Student (Sec B)',
      email: 'student.aids@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: aidsBranch._id,
      year: 1,
      section: 'B',
    });
  }

  // Senior iMTech Students (Years 4 & 5 - iMTech only, no B.Tech)
  if (cseBranch && !(await User.findOne({ email: 'imtech.cse@iiitb.ac.in' }))) {
    await User.create({
      name: 'IIIT-B iMTech CSE Senior',
      email: 'imtech.cse@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: cseBranch._id,
      year: 4,
      section: 'A',
    });
  }

  if (eceBranch && !(await User.findOne({ email: 'imtech.ece@iiitb.ac.in' }))) {
    await User.create({
      name: 'IIIT-B iMTech ECE Senior',
      email: 'imtech.ece@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: eceBranch._id,
      year: 4,
      section: 'B',
    });
  }
}
