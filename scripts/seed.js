const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/college-timetable';

async function seed() {
  console.log(
    '🚀 Connecting to MongoDB:',
    MONGODB_URI.replace(/:([^:@]{1,})@/, ':****@')
  );

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // ============================================================
  // CLEAN DATABASE
  // ============================================================

  console.log('🧹 Cleaning collections...');

  await Promise.all([
    db.collection('branches').deleteMany({}),
    db.collection('users').deleteMany({}),
    db.collection('timetableentries').deleteMany({}),
    db.collection('assignments').deleteMany({}),
    db.collection('notifications').deleteMany({}),
    db.collection('assignmenttrackings').deleteMany({}),
  ]);

  // ============================================================
  // 1. BRANCHES
  // IIIT-B currently offers B.Tech. in CSE, ECE and AI&DS.
  // ============================================================

  console.log('🏛️ Seeding IIIT-B branches...');

  const branchesData = [
    {
      name: 'Computer Science & Engineering',
      code: 'CSE',
      description:
        'B.Tech. in Computer Science and Engineering. The programme emphasizes programming, mathematics, theoretical computer science and computer systems.',
    },
    {
      name: 'Electronics & Communication Engineering',
      code: 'ECE',
      description:
        'B.Tech. in Electronics & Communication Engineering. The programme combines programming, computer systems, electronics, communication, VLSI and embedded systems.',
    },
    {
      name: 'Artificial Intelligence & Data Science',
      code: 'AI&DS',
      description:
        'B.Tech. in Artificial Intelligence & Data Science. The programme focuses on mathematics, statistics, data science, artificial intelligence and machine learning.',
    },
  ];

  const branchDocs = await db.collection('branches').insertMany(branchesData);

  const branchMap = {};
  branchesData.forEach((branch, index) => {
    branchMap[branch.code] = branchDocs.insertedIds[index];
  });

  // ============================================================
  // 2. USERS
  // ============================================================

  console.log('👥 Seeding users...');

  // IMPORTANT:
  // These are development/demo passwords.
  // Use environment variables for production credentials.

  const iiitbAdminHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || 'change-me-admin',
    12
  );

  const studentHash = await bcrypt.hash(
    process.env.SEED_STUDENT_PASSWORD || 'change-me-student',
    12
  );

  const branchAdminHash = await bcrypt.hash(
    process.env.SEED_BRANCH_PASSWORD || 'change-me-branch',
    12
  );

  const usersData = [
    {
      name: 'IIIT-B Class Representatives Admin',
      email: 'classreps@iiitb.ac.in',
      passwordHash: iiitbAdminHash,
      role: 'superadmin',
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
      name: 'IIIT-B CSE Admin',
      email: 'cse.admin@iiitb.ac.in',
      passwordHash: branchAdminHash,
      role: 'admin',
      branchId: branchMap['CSE'],
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

    // Demo student representing the 2026 ECE batch.
    {
      name: 'IIIT-B ECE Student',
      email: 'student.ece@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: branchMap['ECE'],
      year: 1,
      section: 'A',
      createdAt: new Date(),
    },

    // Additional demo students.
    {
      name: 'IIIT-B CSE Student',
      email: 'student.cse@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: branchMap['CSE'],
      year: 1,
      section: 'A',
      createdAt: new Date(),
    },

    {
      name: 'IIIT-B AI&DS Student',
      email: 'student.aids@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: branchMap['AI&DS'],
      year: 1,
      section: 'A',
      createdAt: new Date(),
    },
  ];

  const userDocs = await db.collection('users').insertMany(usersData);

  const classRepAdminId = userDocs.insertedIds[0];

  // ============================================================
  // 3. TIMETABLE
  //
  // IMPORTANT:
  // IIIT-B publishes curriculum/course information publicly, but
  // exact student timetables, rooms and faculty assignments should
  // not be fabricated as official information.
  //
  // Therefore these are DEMO timetable entries using real
  // curriculum course names.
  // ============================================================

  console.log('📅 Seeding demo timetables...');

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
      demoData: true,
    });
  }

  // ------------------------------------------------------------
  // ECE YEAR 1
  // Based on the 2026 ECE curriculum.
  // ------------------------------------------------------------

  // Monday
  addEntry(
    'ECE',
    1,
    'A',
    0,
    '09:00',
    '10:00',
    'Mathematics – 1 (Calculus)'
  );

  addEntry(
    'ECE',
    1,
    'A',
    0,
    '10:00',
    '11:00',
    'Programming IA (C)'
  );

  addEntry(
    'ECE',
    1,
    'A',
    0,
    '11:15',
    '12:15',
    'Digital Design'
  );

  addEntry(
    'ECE',
    1,
    'A',
    0,
    '13:30',
    '14:30',
    'English'
  );

  // Tuesday
  addEntry(
    'ECE',
    1,
    'A',
    1,
    '09:00',
    '10:00',
    'Mathematics – 2 (Linear Algebra)'
  );

  addEntry(
    'ECE',
    1,
    'A',
    1,
    '10:00',
    '11:00',
    'Programming IB (Python)'
  );

  addEntry(
    'ECE',
    1,
    'A',
    1,
    '11:15',
    '12:15',
    'Economics – 1'
  );

  addEntry(
    'ECE',
    1,
    'A',
    1,
    '14:00',
    '16:00',
    'Programming Lab',
    'lab'
  );

  // Wednesday
  addEntry(
    'ECE',
    1,
    'A',
    2,
    '09:00',
    '10:00',
    'Digital Design'
  );

  addEntry(
    'ECE',
    1,
    'A',
    2,
    '10:00',
    '11:00',
    'Mathematics – 1 (Calculus)'
  );

  addEntry(
    'ECE',
    1,
    'A',
    2,
    '11:15',
    '12:15',
    'Programming IA (C)'
  );

  addEntry(
    'ECE',
    1,
    'A',
    2,
    '13:30',
    '14:30',
    'Physical Education 1',
    'other'
  );

  // Thursday
  addEntry(
    'ECE',
    1,
    'A',
    3,
    '09:00',
    '10:00',
    'Mathematics – 2 (Linear Algebra)'
  );

  addEntry(
    'ECE',
    1,
    'A',
    3,
    '10:00',
    '11:00',
    'Programming IB (Python)'
  );

  addEntry(
    'ECE',
    1,
    'A',
    3,
    '11:15',
    '12:15',
    'Digital Design'
  );

  // Friday
  addEntry(
    'ECE',
    1,
    'A',
    4,
    '09:00',
    '10:00',
    'Economics – 1'
  );

  addEntry(
    'ECE',
    1,
    'A',
    4,
    '10:00',
    '11:00',
    'English'
  );

  addEntry(
    'ECE',
    1,
    'A',
    4,
    '11:15',
    '12:15',
    'Programming IA (C)'
  );

  // ------------------------------------------------------------
  // CSE YEAR 1
  // Based on IIIT-B's published CSE curriculum.
  // ------------------------------------------------------------

  addEntry(
    'CSE',
    1,
    'A',
    0,
    '09:00',
    '10:00',
    'Mathematics – 1 (Linear Algebra)'
  );

  addEntry(
    'CSE',
    1,
    'A',
    0,
    '10:00',
    '11:00',
    'Programming 1A (C)'
  );

  addEntry(
    'CSE',
    1,
    'A',
    0,
    '11:15',
    '12:15',
    'Digital Design'
  );

  addEntry(
    'CSE',
    1,
    'A',
    0,
    '13:30',
    '14:30',
    'English'
  );

  addEntry(
    'CSE',
    1,
    'A',
    1,
    '09:00',
    '10:00',
    'Mathematics – 2 (Probability and Statistics)'
  );

  addEntry(
    'CSE',
    1,
    'A',
    1,
    '10:00',
    '11:00',
    'Programming 1B (Python)'
  );

  addEntry(
    'CSE',
    1,
    'A',
    1,
    '11:15',
    '12:15',
    'Economics – 1'
  );

  addEntry(
    'CSE',
    1,
    'A',
    1,
    '14:00',
    '16:00',
    'Programming Lab',
    'lab'
  );

  addEntry(
    'CSE',
    1,
    'A',
    2,
    '09:00',
    '10:00',
    'Digital Design'
  );

  addEntry(
    'CSE',
    1,
    'A',
    2,
    '10:00',
    '11:00',
    'Programming 1A (C)'
  );

  addEntry(
    'CSE',
    1,
    'A',
    2,
    '11:15',
    '12:15',
    'Mathematics – 1 (Linear Algebra)'
  );

  addEntry(
    'CSE',
    1,
    'A',
    3,
    '09:00',
    '10:00',
    'Programming 1B (Python)'
  );

  addEntry(
    'CSE',
    1,
    'A',
    3,
    '10:00',
    '11:00',
    'Mathematics – 2 (Probability and Statistics)'
  );

  addEntry(
    'CSE',
    1,
    'A',
    3,
    '11:15',
    '12:15',
    'Digital Design'
  );

  addEntry(
    'CSE',
    1,
    'A',
    4,
    '09:00',
    '10:00',
    'Economics – 1'
  );

  addEntry(
    'CSE',
    1,
    'A',
    4,
    '10:00',
    '11:00',
    'English'
  );

  // ------------------------------------------------------------
  // AI&DS YEAR 1
  //
  // The AI&DS programme is designed around mathematics,
  // statistics, AI and data science foundations.
  //
  // These timetable slots are demo data.
  // ------------------------------------------------------------

  addEntry(
    'AI&DS',
    1,
    'A',
    0,
    '09:00',
    '10:00',
    'Mathematics'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    0,
    '10:00',
    '11:00',
    'Programming'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    0,
    '11:15',
    '12:15',
    'Digital Design'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    1,
    '09:00',
    '10:00',
    'Probability & Statistics'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    1,
    '10:00',
    '11:00',
    'Python Programming'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    1,
    '14:00',
    '16:00',
    'Programming Lab',
    'lab'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    2,
    '09:00',
    '10:00',
    'Linear Algebra'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    2,
    '10:00',
    '11:00',
    'Programming'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    2,
    '11:15',
    '12:15',
    'English'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    3,
    '09:00',
    '10:00',
    'Probability & Statistics'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    3,
    '10:00',
    '11:00',
    'Digital Design'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    4,
    '09:00',
    '10:00',
    'Mathematics'
  );

  addEntry(
    'AI&DS',
    1,
    'A',
    4,
    '10:00',
    '11:00',
    'Economics'
  );

  await db.collection('timetableentries').insertMany(timetable);

  // ============================================================
  // 4. ASSIGNMENTS
  //
  // Use assignments that actually make sense for the first
  // semester courses rather than fake second-year assignments.
  // ============================================================

  console.log('📝 Seeding assignments...');

  const assignmentsData = [
    // ---------------- ECE ----------------

    {
      branchId: branchMap['ECE'],
      year: 1,
      subject: 'Programming IA (C)',
      title: 'C Programming Problem Set 1',
      description:
        'Implement programs involving arrays, functions, pointers and basic input/output in C.',
      dueDate: '2026-09-07',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },

    {
      branchId: branchMap['ECE'],
      year: 1,
      subject: 'Programming IB (Python)',
      title: 'Python Fundamentals',
      description:
        'Solve a set of problems covering conditionals, loops, functions, lists, dictionaries and basic file handling.',
      dueDate: '2026-09-10',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },

    {
      branchId: branchMap['ECE'],
      year: 1,
      subject: 'Mathematics – 1 (Calculus)',
      title: 'Calculus Problem Set',
      description:
        'Solve the assigned problems on limits, continuity, differentiation and applications of derivatives.',
      dueDate: '2026-09-05',
      priority: 'urgent',
      status: 'active',
      createdBy: classRepAdminId,
    },

    {
      branchId: branchMap['ECE'],
      year: 1,
      subject: 'Mathematics – 2 (Linear Algebra)',
      title: 'Linear Algebra Worksheet',
      description:
        'Problems covering vectors, matrices, linear transformations and systems of linear equations.',
      dueDate: '2026-09-12',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },

    {
      branchId: branchMap['ECE'],
      year: 1,
      subject: 'Digital Design',
      title: 'Boolean Logic & Combinational Circuits',
      description:
        'Simplify Boolean expressions and design combinational circuits using standard digital logic techniques.',
      dueDate: '2026-09-15',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },

    // ---------------- CSE ----------------

    {
      branchId: branchMap['CSE'],
      year: 1,
      subject: 'Programming 1A (C)',
      title: 'C Programming Assignment',
      description:
        'Implement a collection of programs using arrays, pointers, functions and structures.',
      dueDate: '2026-09-07',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },

    {
      branchId: branchMap['CSE'],
      year: 1,
      subject: 'Programming 1B (Python)',
      title: 'Python Programming Exercises',
      description:
        'Solve programming problems using Python control flow, functions and built-in data structures.',
      dueDate: '2026-09-11',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },

    {
      branchId: branchMap['CSE'],
      year: 1,
      subject: 'Digital Design',
      title: 'Digital Logic Assignment',
      description:
        'Design and simplify Boolean circuits and solve problems involving combinational digital logic.',
      dueDate: '2026-09-14',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },

    {
      branchId: branchMap['CSE'],
      year: 1,
      subject: 'Mathematics – 1 (Linear Algebra)',
      title: 'Linear Algebra Problem Set',
      description:
        'Solve problems involving matrices, vector spaces, linear systems and linear transformations.',
      dueDate: '2026-09-09',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },

    // ---------------- AI&DS ----------------

    {
      branchId: branchMap['AI&DS'],
      year: 1,
      subject: 'Programming',
      title: 'Python Programming Assignment',
      description:
        'Implement introductory data-processing and algorithmic problems using Python.',
      dueDate: '2026-09-08',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },

    {
      branchId: branchMap['AI&DS'],
      year: 1,
      subject: 'Probability & Statistics',
      title: 'Probability Problem Set',
      description:
        'Solve problems involving conditional probability, random variables and basic probability distributions.',
      dueDate: '2026-09-13',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },

    {
      branchId: branchMap['AI&DS'],
      year: 1,
      subject: 'Linear Algebra',
      title: 'Matrix Methods Worksheet',
      description:
        'Problems covering matrices, vectors, linear systems and fundamental linear algebra operations.',
      dueDate: '2026-09-10',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },
  ];

  await db.collection('assignments').insertMany(
    assignmentsData.map((assignment) => ({
      ...assignment,
      createdAt: now,
      updatedAt: now,
    }))
  );

  // ============================================================
  // 5. NOTIFICATIONS
  // ============================================================

  console.log('🔔 Seeding notifications...');

  const notificationsData = [
    {
      branchId: branchMap['ECE'],
      year: 1,
      title: 'Welcome to IIIT-B',
      message:
        'Your timetable and academic dashboard for the 2026 B.Tech. ECE batch are ready.',
      type: 'info',
      isRead: false,
      createdAt: now,
    },

    {
      branchId: branchMap['ECE'],
      year: 1,
      title: 'New Programming Assignment',
      message:
        'A new C programming problem set has been added. Check the Assignments section for details.',
      type: 'assignment',
      isRead: false,
      createdAt: now,
    },

    {
      branchId: branchMap['ECE'],
      year: 1,
      title: 'Digital Design Assignment',
      message:
        'A new Digital Design assignment has been added to your dashboard.',
      type: 'assignment',
      isRead: false,
      createdAt: now,
    },

    {
      branchId: branchMap['CSE'],
      year: 1,
      title: 'Welcome to IIIT-B',
      message:
        'Your academic dashboard for the 2026 B.Tech. CSE batch is ready.',
      type: 'info',
      isRead: false,
      createdAt: now,
    },

    {
      branchId: branchMap['AI&DS'],
      year: 1,
      title: 'Welcome to IIIT-B',
      message:
        'Your academic dashboard for the 2026 B.Tech. AI&DS batch is ready.',
      type: 'info',
      isRead: false,
      createdAt: now,
    },
  ];

  await db.collection('notifications').insertMany(notificationsData);

  // ============================================================
  // 6. SUMMARY
  // ============================================================

  console.log('\n✅ IIIT-B MongoDB Seed Completed Successfully!');
  console.log('--------------------------------------------------');
  console.log('Branches: CSE, ECE, AI&DS');
  console.log('Student demo: student.ece@iiitb.ac.in');
  console.log('Year: 1');
  console.log('Batch: 2026');
  console.log('--------------------------------------------------');
  console.log(
    '⚠️  Timetable entries are DEMO schedules using IIIT-B curriculum course names.'
  );
  console.log(
    '⚠️  Do not present their rooms/times/faculty as official IIIT-B information.'
  );
  console.log('--------------------------------------------------\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});