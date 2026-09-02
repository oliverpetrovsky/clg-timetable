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
  // 1. BRANCHES & PROGRAMMES
  // IIIT-B Academic Structure:
  // - CSE:  iMTech (5-year) and B.Tech (4-year) -> Section A (Years 1–3)
  // - ECE:  iMTech (5-year) and B.Tech (4-year) -> Section B (Years 1–3)
  // - AI&DS: B.Tech (4-year only)               -> Section B (Years 1–3, grouped with ECE)
  // - Years 4 & 5: iMTech only (CSE & ECE)
  // ============================================================

  console.log('🏛️ Seeding IIIT-B branches & departments...');

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
  // 2. USERS
  // ============================================================

  console.log('👥 Seeding users & student distribution...');

  const iiitbAdminHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || 'tbsm-naamsujal-vichaar-Vy0m',
    12
  );

  const studentHash = await bcrypt.hash(
    process.env.SEED_STUDENT_PASSWORD || 'student123',
    12
  );

  const branchAdminHash = await bcrypt.hash(
    process.env.SEED_BRANCH_PASSWORD || 'branch123',
    12
  );

  const usersData = [
    // Superadmin: Class Representatives Admin
    {
      name: 'IIIT-B Class Representatives Admin',
      email: 'classreps@iiitb.ac.in',
      passwordHash: iiitbAdminHash,
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

    // ------------------------------------------------------------
    // STUDENTS: Distribution per IIIT-B rules:
    // - Section A: CSE
    // - Section B: ECE and AI&DS (grouped together)
    // ------------------------------------------------------------

    // Year 1 Students
    {
      name: 'IIIT-B CSE Student (Sec A)',
      email: 'student.cse@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: branchMap['CSE'],
      year: 1,
      section: 'A',
      createdAt: new Date(),
    },
    {
      name: 'IIIT-B ECE Student (Sec B)',
      email: 'student.ece@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: branchMap['ECE'],
      year: 1,
      section: 'B',
      createdAt: new Date(),
    },
    {
      name: 'IIIT-B AI&DS Student (Sec B)',
      email: 'student.aids@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: branchMap['AI&DS'],
      year: 1,
      section: 'B',
      createdAt: new Date(),
    },

    // Senior iMTech Students (Years 4 & 5 - iMTech only, no B.Tech)
    {
      name: 'IIIT-B iMTech CSE Senior',
      email: 'imtech.cse@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: branchMap['CSE'],
      year: 4,
      section: 'A',
      createdAt: new Date(),
    },
    {
      name: 'IIIT-B iMTech ECE Senior',
      email: 'imtech.ece@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: branchMap['ECE'],
      year: 4,
      section: 'B',
      createdAt: new Date(),
    },
  ];

  const userDocs = await db.collection('users').insertMany(usersData);
  const classRepAdminId = userDocs.insertedIds[0];

  // ============================================================
  // 3. TIMETABLE
  // Distribution:
  // - CSE: Section A
  // - ECE & AI&DS: Section B (grouped together)
  // - Years 1, 2, 3: B.Tech & iMTech
  // - Years 4 & 5: iMTech only
  // ============================================================

  console.log('📅 Seeding timetables with Section A (CSE) and Section B (ECE & AI&DS)...');

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
  // SECTION A — CSE (YEAR 1)
  // ------------------------------------------------------------

  // Monday
  addEntry('CSE', 1, 'A', 0, '09:00', '10:00', 'Mathematics – 1 (Linear Algebra)', 'lecture', 'Dr. S. Raman', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 0, '10:00', '11:00', 'Programming 1A (C)', 'lecture', 'Dr. V. Sridhar', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 0, '11:15', '12:15', 'Digital Design', 'lecture', 'Dr. J. Biswas', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 0, '13:30', '14:30', 'Technical Communication', 'lecture', 'Prof. M. Sen', 'Hall 101');

  // Tuesday
  addEntry('CSE', 1, 'A', 1, '09:00', '10:00', 'Mathematics – 2 (Probability & Statistics)', 'lecture', 'Dr. K. Rao', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 1, '10:00', '11:00', 'Programming 1B (Python)', 'lecture', 'Dr. V. Sridhar', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 1, '11:15', '12:15', 'Economics – 1', 'lecture', 'Dr. A. Verma', 'Hall 101');
  addEntry('CSE', 1, 'A', 1, '14:00', '16:00', 'Programming Lab (C / Python)', 'lab', 'Lab Instructors', 'Computer Lab 1');

  // Wednesday
  addEntry('CSE', 1, 'A', 2, '09:00', '10:00', 'Digital Design', 'lecture', 'Dr. J. Biswas', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 2, '10:00', '11:00', 'Programming 1A (C)', 'lecture', 'Dr. V. Sridhar', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 2, '11:15', '12:15', 'Mathematics – 1 (Linear Algebra)', 'lecture', 'Dr. S. Raman', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 2, '14:00', '16:00', 'Digital Logic Design Lab', 'lab', 'Dr. J. Biswas', 'Hardware Lab');

  // Thursday
  addEntry('CSE', 1, 'A', 3, '09:00', '10:00', 'Programming 1B (Python)', 'lecture', 'Dr. V. Sridhar', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 3, '10:00', '11:00', 'Mathematics – 2 (Probability & Statistics)', 'lecture', 'Dr. K. Rao', 'Aryabhata Hall');
  addEntry('CSE', 1, 'A', 3, '11:15', '12:15', 'Digital Design', 'lecture', 'Dr. J. Biswas', 'Aryabhata Hall');

  // Friday
  addEntry('CSE', 1, 'A', 4, '09:00', '10:00', 'Economics – 1', 'lecture', 'Dr. A. Verma', 'Hall 101');
  addEntry('CSE', 1, 'A', 4, '10:00', '11:00', 'Technical Communication', 'lecture', 'Prof. M. Sen', 'Hall 101');
  addEntry('CSE', 1, 'A', 4, '11:15', '12:15', 'Problem Solving & Tutorial', 'tutorial', 'Teaching Assistants', 'Aryabhata Hall');

  // ------------------------------------------------------------
  // SECTION B — ECE & AI&DS (YEAR 1)
  // Shared foundational curriculum grouped in Section B
  // ------------------------------------------------------------

  // ECE Year 1 - Section B
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

  // AI&DS Year 1 - Section B (Shares timetable slots with Section B)
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

  // ------------------------------------------------------------
  // SECTION A & B — YEAR 2 (Curriculum progression)
  // ------------------------------------------------------------
  // CSE Year 2 - Section A
  addEntry('CSE', 2, 'A', 0, '09:00', '10:00', 'Data Structures & Algorithms', 'lecture', 'Dr. S. Bose', 'Hall 201');
  addEntry('CSE', 2, 'A', 0, '10:00', '11:00', 'Computer Organization & Architecture', 'lecture', 'Dr. P. Das', 'Hall 201');
  addEntry('CSE', 2, 'A', 1, '14:00', '16:00', 'DSA Advanced Lab', 'lab', 'Dr. S. Bose', 'CS Lab 2');

  // ECE Year 2 - Section B
  addEntry('ECE', 2, 'B', 0, '09:00', '10:00', 'Signals & Systems', 'lecture', 'Dr. T. Nair', 'Hall 202');
  addEntry('ECE', 2, 'B', 0, '10:00', '11:00', 'Analog Circuits', 'lecture', 'Dr. G. Gupta', 'Hall 202');
  addEntry('ECE', 2, 'B', 1, '14:00', '16:00', 'Analog Circuits Lab', 'lab', 'Dr. G. Gupta', 'ECE Lab 2');

  // AI&DS Year 2 - Section B
  addEntry('AI&DS', 2, 'B', 0, '09:00', '10:00', 'Mathematical Foundations of ML', 'lecture', 'Dr. K. Rao', 'Hall 202');
  addEntry('AI&DS', 2, 'B', 0, '10:00', '11:00', 'Data Structures for Analytics', 'lecture', 'Dr. S. Bose', 'Hall 202');
  addEntry('AI&DS', 2, 'B', 1, '14:00', '16:00', 'Applied Machine Learning Lab', 'lab', 'AI Faculty', 'AI Research Lab');

  // ------------------------------------------------------------
  // SECTION A & B — YEAR 3 (Curriculum progression)
  // ------------------------------------------------------------
  // CSE Year 3 - Section A
  addEntry('CSE', 3, 'A', 0, '10:00', '11:00', 'Operating Systems', 'lecture', 'Dr. V. Prasad', 'Hall 301');
  addEntry('CSE', 3, 'A', 0, '11:15', '12:15', 'Database Management Systems', 'lecture', 'Dr. R. Mishra', 'Hall 301');

  // ECE Year 3 - Section B
  addEntry('ECE', 3, 'B', 0, '10:00', '11:00', 'VLSI Design', 'lecture', 'Dr. H. Joshi', 'Hall 302');
  addEntry('ECE', 3, 'B', 0, '11:15', '12:15', 'Digital Signal Processing', 'lecture', 'Dr. T. Nair', 'Hall 302');

  // AI&DS Year 3 - Section B
  addEntry('AI&DS', 3, 'B', 0, '10:00', '11:00', 'Deep Learning & Neural Networks', 'lecture', 'Dr. K. Rao', 'Hall 302');
  addEntry('AI&DS', 3, 'B', 0, '11:15', '12:15', 'Big Data Engineering', 'lecture', 'Dr. R. Mishra', 'Hall 302');

  // ------------------------------------------------------------
  // YEARS 4 & 5 — iMTech ONLY (No B.Tech)
  // ------------------------------------------------------------
  // CSE Year 4 (iMTech) - Section A
  addEntry('CSE', 4, 'A', 0, '09:00', '10:30', 'Advanced Distributed Systems', 'lecture', 'Dr. V. Prasad', 'PG Seminar Hall');
  addEntry('CSE', 4, 'A', 1, '10:30', '12:00', 'Cloud Computing Architecture', 'lecture', 'Dr. S. Bose', 'PG Seminar Hall');

  // ECE Year 4 (iMTech) - Section B
  addEntry('ECE', 4, 'B', 0, '09:00', '10:30', 'Advanced Embedded Systems & IoT', 'lecture', 'Dr. H. Joshi', 'VLSI Centre');
  addEntry('ECE', 4, 'B', 1, '10:30', '12:00', 'Wireless Communication Systems', 'lecture', 'Dr. T. Nair', 'VLSI Centre');

  // CSE Year 5 (iMTech) - Section A
  addEntry('CSE', 5, 'A', 0, '14:00', '17:00', 'Master Thesis / Capstone Project', 'lab', 'Faculty Advisors', 'Research Wing');

  // ECE Year 5 (iMTech) - Section B
  addEntry('ECE', 5, 'B', 0, '14:00', '17:00', 'Master Thesis / VLSI Capstone', 'lab', 'Faculty Advisors', 'Research Wing');

  await db.collection('timetableentries').insertMany(timetable);

  // ============================================================
  // 4. ASSIGNMENTS
  // Mapped to Section A (CSE) and Section B (ECE & AI&DS)
  // ============================================================

  console.log('📝 Seeding assignments with section mappings...');

  const assignmentsData = [
    // ---------------- SECTION A (CSE) ----------------
    {
      branchId: branchMap['CSE'],
      year: 1,
      section: 'A',
      subject: 'Programming 1A (C)',
      title: 'C Programming Problem Set 1',
      description:
        'Implement programs involving arrays, functions, pointers and dynamic memory management in C.',
      dueDate: '2026-09-08',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },
    {
      branchId: branchMap['CSE'],
      year: 1,
      section: 'A',
      subject: 'Programming 1B (Python)',
      title: 'Python Algorithmic Problem Set',
      description:
        'Solve programming exercises using Python dictionaries, list comprehensions, recursion and file handling.',
      dueDate: '2026-09-12',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },
    {
      branchId: branchMap['CSE'],
      year: 1,
      section: 'A',
      subject: 'Mathematics – 1 (Linear Algebra)',
      title: 'Linear Algebra Worksheet 1',
      description:
        'Vector spaces, subspaces, Gaussian elimination, eigenvalues and matrix transformations.',
      dueDate: '2026-09-06',
      priority: 'urgent',
      status: 'active',
      createdBy: classRepAdminId,
    },
    {
      branchId: branchMap['CSE'],
      year: 1,
      section: 'A',
      subject: 'Digital Design',
      title: 'Combinational Logic Simplification',
      description:
        'K-Map minimization, Boolean algebra simplification and decoder/multiplexer logic design.',
      dueDate: '2026-09-15',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },

    // ---------------- SECTION B (ECE) ----------------
    {
      branchId: branchMap['ECE'],
      year: 1,
      section: 'B',
      subject: 'Mathematics – 1 (Calculus)',
      title: 'Differential Calculus Problem Set',
      description:
        'Limits, continuity, mean value theorems, Taylor series and multivariable derivatives.',
      dueDate: '2026-09-05',
      priority: 'urgent',
      status: 'active',
      createdBy: classRepAdminId,
    },
    {
      branchId: branchMap['ECE'],
      year: 1,
      section: 'B',
      subject: 'Programming IA (C)',
      title: 'C Embedded Control Programs',
      description:
        'Bitwise operators, pointer arithmetic, struct arrays and hardware simulation in C.',
      dueDate: '2026-09-08',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },
    {
      branchId: branchMap['ECE'],
      year: 1,
      section: 'B',
      subject: 'Digital Design',
      title: 'Sequential Logic & State Machines',
      description:
        'Flip-flops, synchronous counters and Mealy/Moore state machine design.',
      dueDate: '2026-09-14',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },
    {
      branchId: branchMap['ECE'],
      year: 1,
      section: 'B',
      subject: 'Mathematics – 2 (Linear Algebra)',
      title: 'Matrix Operations & Eigenvectors',
      description:
        'Linear systems, orthogonal projections, Gram-Schmidt process and spectral decomposition.',
      dueDate: '2026-09-11',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },

    // ---------------- SECTION B (AI&DS) ----------------
    {
      branchId: branchMap['AI&DS'],
      year: 1,
      section: 'B',
      subject: 'Python for AI & Data Science',
      title: 'NumPy & Pandas Data Pipeline',
      description:
        'Matrix computations with NumPy arrays and tabular data cleaning with Pandas.',
      dueDate: '2026-09-09',
      priority: 'high',
      status: 'active',
      createdBy: classRepAdminId,
    },
    {
      branchId: branchMap['AI&DS'],
      year: 1,
      section: 'B',
      subject: 'Probability & Statistics for AI',
      title: 'Bayesian Probability & Random Variables',
      description:
        'Conditional probability, Bayes rule, continuous probability distributions and MLE estimation.',
      dueDate: '2026-09-13',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },
    {
      branchId: branchMap['AI&DS'],
      year: 1,
      section: 'B',
      subject: 'Linear Algebra for Data Science',
      title: 'SVD & Dimensionality Reduction Basics',
      description:
        'Matrix factorization, PCA foundations, and geometric interpretations of linear transformations.',
      dueDate: '2026-09-10',
      priority: 'medium',
      status: 'active',
      createdBy: classRepAdminId,
    },

    // ---------------- iMTech (Years 4 & 5) ----------------
    {
      branchId: branchMap['CSE'],
      year: 4,
      section: 'A',
      subject: 'Advanced Distributed Systems',
      title: 'Consensus Protocols Implementation (Raft)',
      description:
        'Implement leader election and log replication using gRPC in Go or C++.',
      dueDate: '2026-09-20',
      priority: 'urgent',
      status: 'active',
      createdBy: classRepAdminId,
    },
    {
      branchId: branchMap['ECE'],
      year: 4,
      section: 'B',
      subject: 'Advanced Embedded Systems & IoT',
      title: 'RTOS Task Scheduling & Driver Development',
      description:
        'Configure FreeRTOS semaphores, mutexes and write a custom SPI sensor driver.',
      dueDate: '2026-09-21',
      priority: 'urgent',
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

  console.log('🔔 Seeding batch notifications...');

  const notificationsData = [
    {
      branchId: branchMap['CSE'],
      year: 1,
      title: 'Welcome to Section A (CSE)',
      message:
        'Your timetable for CSE (B.Tech & iMTech) in Section A is now active. Check your class schedule.',
      type: 'info',
      isRead: false,
      createdAt: now,
    },
    {
      branchId: branchMap['ECE'],
      year: 1,
      title: 'Welcome to Section B (ECE & AI&DS)',
      message:
        'Your schedule for ECE in Section B is now live. Core classes are grouped with AI&DS.',
      type: 'info',
      isRead: false,
      createdAt: now,
    },
    {
      branchId: branchMap['AI&DS'],
      year: 1,
      title: 'Welcome to Section B (AI&DS & ECE)',
      message:
        'Your academic timetable for B.Tech AI&DS in Section B is now published.',
      type: 'info',
      isRead: false,
      createdAt: now,
    },
  ];

  await db.collection('notifications').insertMany(notificationsData);

  // ============================================================
  // 6. SUMMARY
  // ============================================================

  console.log('\n✅ IIIT-B Database Seeding Completed Successfully!');
  console.log('==================================================');
  console.log('🏛️  ACADEMIC STRUCTURE & SECTION DISTRIBUTION:');
  console.log('   • Section A: CSE (B.Tech & iMTech, Years 1–5)');
  console.log('   • Section B: ECE (B.Tech & iMTech) + AI&DS (B.Tech)');
  console.log('   • Years 1–3: All branches (B.Tech & iMTech)');
  console.log('   • Years 4–5: iMTech ONLY (CSE & ECE only; no B.Tech)');
  console.log('--------------------------------------------------');
  console.log('🔑 DEMO ACCOUNTS:');
  console.log('   • Superadmin:   classreps@iiitb.ac.in (tbsm-naamsujal-vichaar-Vy0m)');
  console.log('   • CSE Student:  student.cse@iiitb.ac.in -> Section A, Year 1 (student123)');
  console.log('   • ECE Student:  student.ece@iiitb.ac.in -> Section B, Year 1 (student123)');
  console.log('   • AI&DS Student: student.aids@iiitb.ac.in -> Section B, Year 1 (student123)');
  console.log('   • iMTech CSE:   imtech.cse@iiitb.ac.in -> Section A, Year 4 (student123)');
  console.log('   • iMTech ECE:   imtech.ece@iiitb.ac.in -> Section B, Year 4 (student123)');
  console.log('==================================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});