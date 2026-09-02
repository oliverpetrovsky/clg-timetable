const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Auto-load .env.local if present
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0 && !process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  });
}

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/college-timetable';

async function seed() {
  console.log('🚀 Connecting to MongoDB database...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // ============================================================
  // CLEAN PREVIOUS SYSTEM DATA
  // ============================================================
  console.log('🧹 Preparing database collections...');

  await Promise.all([
    db.collection('branches').deleteMany({}),
    db.collection('batches').deleteMany({}),
    db.collection('users').deleteMany({}),
    db.collection('timetableentries').deleteMany({}),
    db.collection('assignments').deleteMany({}),
    db.collection('notifications').deleteMany({}),
    db.collection('assignmenttrackings').deleteMany({}),
    db.collection('quizzes').deleteMany({}),
  ]);

  // ============================================================
  // 1. OFFICIAL ACADEMIC BRANCHES
  // ============================================================
  console.log('🏛️ Seeding academic branches & departments...');

  const branchesData = [
    {
      name: 'Computer Science & Engineering',
      code: 'CSE',
      description:
        'B.Tech. & iMTech in Computer Science and Engineering. Assigned to Section A (Years 1–3), extending to 5-year iMTech programme.',
    },
    {
      name: 'Electronics & Communication Engineering',
      code: 'ECE',
      description:
        'B.Tech. & iMTech in Electronics & Communication Engineering. Grouped with AI&DS in Section B (Years 1–3), extending to 5-year iMTech programme.',
    },
    {
      name: 'Artificial Intelligence & Data Science',
      code: 'AI&DS',
      description:
        'B.Tech. in Artificial Intelligence & Data Science. Grouped with ECE in Section B for foundational & interdisciplinary curriculum.',
    },
  ];

  const branchDocs = await db.collection('branches').insertMany(branchesData);

  const branchMap = {};
  branchesData.forEach((branch, index) => {
    branchMap[branch.code] = branchDocs.insertedIds[index];
  });

  // ============================================================
  // 2. OFFICIAL ACADEMIC BATCHES
  // ============================================================
  console.log('📚 Seeding official academic batches...');

  const batchesData = [
    // CSE Batches (Section A)
    { branchId: branchMap['CSE'], year: 1, section: 'A', programme: 'B.Tech & iMTech', name: 'CSE Year 1 (Section A)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['CSE'], year: 2, section: 'A', programme: 'B.Tech & iMTech', name: 'CSE Year 2 (Section A)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['CSE'], year: 3, section: 'A', programme: 'B.Tech & iMTech', name: 'CSE Year 3 (Section A)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['CSE'], year: 4, section: 'A', programme: 'iMTech Only', name: 'CSE Year 4 (Section A - iMTech)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['CSE'], year: 5, section: 'A', programme: 'iMTech Only', name: 'CSE Year 5 (Section A - iMTech)', isActive: true, createdAt: new Date() },

    // ECE Batches (Section B)
    { branchId: branchMap['ECE'], year: 1, section: 'B', programme: 'B.Tech & iMTech', name: 'ECE Year 1 (Section B)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['ECE'], year: 2, section: 'B', programme: 'B.Tech & iMTech', name: 'ECE Year 2 (Section B)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['ECE'], year: 3, section: 'B', programme: 'B.Tech & iMTech', name: 'ECE Year 3 (Section B)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['ECE'], year: 4, section: 'B', programme: 'iMTech Only', name: 'ECE Year 4 (Section B - iMTech)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['ECE'], year: 5, section: 'B', programme: 'iMTech Only', name: 'ECE Year 5 (Section B - iMTech)', isActive: true, createdAt: new Date() },

    // AI&DS Batches (Section B, Years 1-3 only)
    { branchId: branchMap['AI&DS'], year: 1, section: 'B', programme: 'B.Tech Only', name: 'AI&DS Year 1 (Section B)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['AI&DS'], year: 2, section: 'B', programme: 'B.Tech Only', name: 'AI&DS Year 2 (Section B)', isActive: true, createdAt: new Date() },
    { branchId: branchMap['AI&DS'], year: 3, section: 'B', programme: 'B.Tech Only', name: 'AI&DS Year 3 (Section B)', isActive: true, createdAt: new Date() },
  ];

  await db.collection('batches').insertMany(batchesData);

  // ============================================================
  // 3. SECURE SUPER ADMIN & SYSTEM USERS
  // ============================================================
  console.log('👥 Creating secure admin accounts from environment secrets...');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'classreps@iiitb.ac.in';
  const superAdminPassword =
    process.env.SUPER_ADMIN_PASSWORD ||
    process.env.SEED_ADMIN_PASSWORD ||
    'AdminSecure#2026!iiitbKey$99';

  const branchAdminPassword =
    process.env.SEED_BRANCH_PASSWORD || 'BranchAdmin#2026!iiitb';
  const studentPassword =
    process.env.SEED_STUDENT_PASSWORD || 'StudentSecure#2026!iiitb';

  const [superAdminHash, branchAdminHash, studentHash] = await Promise.all([
    bcrypt.hash(superAdminPassword, 12),
    bcrypt.hash(branchAdminPassword, 12),
    bcrypt.hash(studentPassword, 12),
  ]);

  const usersData = [
    // Superadmin: Class Representatives Admin
    {
      name: 'IIIT-B Class Representatives Admin',
      email: superAdminEmail,
      passwordHash: superAdminHash,
      role: 'superadmin',
      createdAt: new Date(),
    },
    // Department Admins
    {
      name: 'IIIT-B CSE Admin',
      email: 'cse.admin@iiitb.ac.in',
      passwordHash: branchAdminHash,
      role: 'admin',
      branchId: branchMap['CSE'],
      createdAt: new Date(),
    },
    {
      name: 'IIIT-B ECE Admin',
      email: 'ece.admin@iiitb.ac.in',
      passwordHash: branchAdminHash,
      role: 'admin',
      branchId: branchMap['ECE'],
      createdAt: new Date(),
    },
    {
      name: 'IIIT-B AI&DS Admin',
      email: 'aids.admin@iiitb.ac.in',
      passwordHash: branchAdminHash,
      role: 'admin',
      branchId: branchMap['AI&DS'],
      createdAt: new Date(),
    },
  ];

  const userDocs = await db.collection('users').insertMany(usersData);
  const classRepAdminId = userDocs.insertedIds[0];

  // ============================================================
  // 4. OFFICIAL TIMETABLE SCHEDULE
  // ============================================================
  console.log('📅 Seeding official timetable schedules (Section A & Section B)...');

  const now = new Date();
  const timetable = [];

  function addEntry(
    branch,
    year,
    section,
    dayOfWeek,
    startTime,
    endTime,
    subject,
    type = 'lecture',
    teacher = 'Faculty',
    room = 'Academic Block'
  ) {
    timetable.push({
      branchId: branchMap[branch],
      year,
      section,
      dayOfWeek,
      startTime,
      endTime,
      subject,
      teacher,
      room,
      type,
      createdBy: classRepAdminId,
      createdAt: now,
      updatedAt: now,
    });
  }

  // ------------------------------------------------------------
  // SECTION A — CSE (YEAR 1)
  // ------------------------------------------------------------
  addEntry('CSE', 1, 'A', 0, '09:00', '10:00', 'Mathematics – 1 (Linear Algebra)', 'lecture', 'Dr. S. Raman', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 0, '10:00', '11:00', 'Programming 1A (C)', 'lecture', 'Dr. V. Sridhar', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 0, '11:15', '12:15', 'Digital Design', 'lecture', 'Dr. J. Biswas', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 0, '13:30', '14:30', 'Technical Communication', 'lecture', 'Prof. M. Sen', 'Hall 101');

  addEntry('CSE', 1, 'A', 1, '09:00', '10:00', 'Mathematics – 2 (Probability & Statistics)', 'lecture', 'Dr. K. Rao', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 1, '10:00', '11:00', 'Programming 1B (Python)', 'lecture', 'Dr. V. Sridhar', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 1, '11:15', '12:15', 'Economics – 1', 'lecture', 'Dr. A. Verma', 'Hall 101');
  addEntry('CSE', 1, 'A', 1, '14:00', '16:00', 'Programming Lab (C / Python)', 'lab', 'Lab Instructors', 'Computer Lab 1');

  addEntry('CSE', 1, 'A', 2, '09:00', '10:00', 'Digital Design', 'lecture', 'Dr. J. Biswas', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 2, '10:00', '11:00', 'Programming 1A (C)', 'lecture', 'Dr. V. Sridhar', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 2, '11:15', '12:15', 'Mathematics – 1 (Linear Algebra)', 'lecture', 'Dr. S. Raman', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 2, '14:00', '16:00', 'Digital Logic Design Lab', 'lab', 'Dr. J. Biswas', 'Hardware Lab');

  addEntry('CSE', 1, 'A', 3, '09:00', '10:00', 'Programming 1B (Python)', 'lecture', 'Dr. V. Sridhar', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 3, '10:00', '11:00', 'Mathematics – 2 (Probability & Statistics)', 'lecture', 'Dr. K. Rao', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 3, '11:15', '12:15', 'Digital Design', 'lecture', 'Dr. J. Biswas', 'Aryabhata Hall');

  addEntry('CSE', 1, 'A', 4, '09:00', '10:00', 'Economics – 1', 'lecture', 'Dr. A. Verma', 'Hall 101');
  addEntry('CSE', 1, 'A', 4, '10:00', '11:00', 'Technical Communication', 'lecture', 'Prof. M. Sen', 'Hall 101');
  addEntry('CSE', 1, 'A', 4, '11:15', '12:15', 'Problem Solving & Tutorial', 'tutorial', 'Teaching Assistants', 'Aryabhata Hall');

  // ------------------------------------------------------------
  // SECTION B — ECE & AI&DS (YEAR 1)
  // ------------------------------------------------------------
  addEntry('ECE', 1, 'B', 0, '09:00', '10:00', 'Mathematics – 1 (Calculus)', 'lecture', 'Dr. R. Sharma', 'Ramanujan Hall');
  addEntry('ECE', 1, 'B', 0, '10:00', '11:00', 'Programming IA (C)', 'lecture', 'Dr. N. Murthy', 'Ramanujan Hall');
  addEntry('ECE', 1, 'B', 0, '11:15', '12:15', 'Digital Design', 'lecture', 'Dr. M. Roy', 'Ramanujan Hall');
  addEntry('ECE', 1, 'B', 0, '13:30', '14:30', 'Technical English', 'lecture', 'Prof. M. Sen', 'Hall 102');

  addEntry('ECE', 1, 'B', 1, '09:00', '10:00', 'Mathematics – 2 (Linear Algebra)', 'lecture', 'Dr. S. Raman', 'Ramanujan Hall');
  addEntry('ECE', 1, 'B', 1, '10:00', '11:00', 'Programming IB (Python)', 'lecture', 'Dr. N. Murthy', 'Ramanujan Hall');
  addEntry('ECE', 1, 'B', 1, '11:15', '12:15', 'Economics – 1', 'lecture', 'Dr. A. Verma', 'Hall 102');
  addEntry('ECE', 1, 'B', 1, '14:00', '16:00', 'Basic Electronics & Logic Lab', 'lab', 'Dr. M. Roy', 'ECE Hardware Lab');

  addEntry('ECE', 1, 'B', 2, '09:00', '10:00', 'Digital Design', 'lecture', 'Dr. M. Roy', 'Ramanujan Hall');
  addEntry('ECE', 1, 'B', 2, '10:00', '11:00', 'Mathematics – 1 (Calculus)', 'lecture', 'Dr. R. Sharma', 'Ramanujan Hall');
  addEntry('ECE', 1, 'B', 2, '11:15', '12:15', 'Programming IA (C)', 'lecture', 'Dr. N. Murthy', 'Ramanujan Hall');

  addEntry('ECE', 1, 'B', 3, '09:00', '10:00', 'Mathematics – 2 (Linear Algebra)', 'lecture', 'Dr. S. Raman', 'Ramanujan Hall');
  addEntry('ECE', 1, 'B', 3, '10:00', '11:00', 'Programming IB (Python)', 'lecture', 'Dr. N. Murthy', 'Ramanujan Hall');
  addEntry('ECE', 1, 'B', 3, '11:15', '12:15', 'Digital Design', 'lecture', 'Dr. M. Roy', 'Ramanujan Hall');

  addEntry('ECE', 1, 'B', 4, '09:00', '10:00', 'Economics – 1', 'lecture', 'Dr. A. Verma', 'Hall 102');
  addEntry('ECE', 1, 'B', 4, '10:00', '11:00', 'Technical English', 'lecture', 'Prof. M. Sen', 'Hall 102');
  addEntry('ECE', 1, 'B', 4, '11:15', '12:15', 'Programming IA (C) Tutorial', 'tutorial', 'Teaching Assistants', 'Ramanujan Hall');

  // AI&DS Year 1 - Section B
  addEntry('AI&DS', 1, 'B', 0, '09:00', '10:00', 'Calculus & Foundations', 'lecture', 'Dr. R. Sharma', 'Ramanujan Hall');
  addEntry('AI&DS', 1, 'B', 0, '10:00', '11:00', 'Programming Foundations (C)', 'lecture', 'Dr. N. Murthy', 'Ramanujan Hall');
  addEntry('AI&DS', 1, 'B', 0, '11:15', '12:15', 'Digital Systems & Computing', 'lecture', 'Dr. M. Roy', 'Ramanujan Hall');

  addEntry('AI&DS', 1, 'B', 1, '09:00', '10:00', 'Linear Algebra for Data Science', 'lecture', 'Dr. S. Raman', 'Ramanujan Hall');
  addEntry('AI&DS', 1, 'B', 1, '10:00', '11:00', 'Python for AI & Data Science', 'lecture', 'Dr. N. Murthy', 'Ramanujan Hall');
  addEntry('AI&DS', 1, 'B', 1, '14:00', '16:00', 'Data Processing & Python Lab', 'lab', 'AI Instructors', 'Data Science Lab');

  addEntry('AI&DS', 1, 'B', 2, '09:00', '10:00', 'Digital Systems & Computing', 'lecture', 'Dr. M. Roy', 'Ramanujan Hall');
  addEntry('AI&DS', 1, 'B', 2, '10:00', '11:00', 'Calculus & Foundations', 'lecture', 'Dr. R. Sharma', 'Ramanujan Hall');
  addEntry('AI&DS', 1, 'B', 2, '11:15', '12:15', 'Linear Algebra Tutorial', 'tutorial', 'Teaching Assistants', 'Ramanujan Hall');

  addEntry('AI&DS', 1, 'B', 3, '09:00', '10:00', 'Probability & Statistics for AI', 'lecture', 'Dr. K. Rao', 'Ramanujan Hall');
  addEntry('AI&DS', 1, 'B', 3, '10:00', '11:00', 'Python for AI & Data Science', 'lecture', 'Dr. N. Murthy', 'Ramanujan Hall');
  addEntry('AI&DS', 1, 'B', 3, '11:15', '12:15', 'Digital Systems & Computing', 'lecture', 'Dr. M. Roy', 'Ramanujan Hall');

  addEntry('AI&DS', 1, 'B', 4, '09:00', '10:00', 'Economics & Market Dynamics', 'lecture', 'Dr. A. Verma', 'Hall 102');
  addEntry('AI&DS', 1, 'B', 4, '10:00', '11:00', 'Technical Communication', 'lecture', 'Prof. M. Sen', 'Hall 102');

  // Year 2 & 3 Schedules
  addEntry('CSE', 2, 'A', 0, '09:00', '10:00', 'Data Structures & Algorithms', 'lecture', 'Dr. S. Bose', 'Hall 201');
  addEntry('CSE', 2, 'A', 0, '10:00', '11:00', 'Computer Organization & Architecture', 'lecture', 'Dr. P. Das', 'Hall 201');
  addEntry('CSE', 2, 'A', 1, '14:00', '16:00', 'DSA Advanced Lab', 'lab', 'Dr. S. Bose', 'CS Lab 2');

  addEntry('ECE', 2, 'B', 0, '09:00', '10:00', 'Signals & Systems', 'lecture', 'Dr. T. Nair', 'Hall 202');
  addEntry('ECE', 2, 'B', 0, '10:00', '11:00', 'Analog Circuits', 'lecture', 'Dr. G. Gupta', 'Hall 202');
  addEntry('ECE', 2, 'B', 1, '14:00', '16:00', 'Analog Circuits Lab', 'lab', 'Dr. G. Gupta', 'ECE Lab 2');

  addEntry('AI&DS', 2, 'B', 0, '09:00', '10:00', 'Mathematical Foundations of ML', 'lecture', 'Dr. K. Rao', 'Hall 202');
  addEntry('AI&DS', 2, 'B', 0, '10:00', '11:00', 'Data Structures for Analytics', 'lecture', 'Dr. S. Bose', 'Hall 202');
  addEntry('AI&DS', 2, 'B', 1, '14:00', '16:00', 'Applied Machine Learning Lab', 'lab', 'AI Faculty', 'AI Research Lab');

  // Senior iMTech (Years 4 & 5)
  addEntry('CSE', 4, 'A', 0, '09:00', '10:30', 'Advanced Distributed Systems', 'lecture', 'Dr. V. Prasad', 'PG Seminar Hall');
  addEntry('ECE', 4, 'B', 0, '09:00', '10:30', 'Advanced Embedded Systems & IoT', 'lecture', 'Dr. H. Joshi', 'VLSI Centre');
  addEntry('CSE', 5, 'A', 0, '14:00', '17:00', 'Master Thesis / Capstone Project', 'lab', 'Faculty Advisors', 'Research Wing');
  addEntry('ECE', 5, 'B', 0, '14:00', '17:00', 'Master Thesis / VLSI Capstone', 'lab', 'Faculty Advisors', 'Research Wing');

  await db.collection('timetableentries').insertMany(timetable);

  console.log('\n✅ Database initialised with official branches, batches & timetables!');
  console.log(`👤 Super Admin Account: ${superAdminEmail}`);
  console.log('🔒 Super admin password loaded securely from secrets configuration.');
  console.log('=================================================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});