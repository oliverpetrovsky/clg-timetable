const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college-timetable';

async function seed() {
  console.log('🚀 Connecting to MongoDB:', MONGODB_URI.replace(/:([^:@]{1,})@/, ':****@'));
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;

  // Clear existing collections
  console.log('🧹 Cleaning collections...');
  await Promise.all([
    db.collection('branches').deleteMany({}),
    db.collection('users').deleteMany({}),
    db.collection('timetableentries').deleteMany({}),
    db.collection('assignments').deleteMany({}),
    db.collection('notifications').deleteMany({}),
    db.collection('assignmenttrackings').deleteMany({}),
  ]);

  // 1. Seed Branches
  console.log('🏛️ Seeding branches...');
  const branchesData = [
    { name: 'Computer Science & Engineering', code: 'CSE', description: 'Department of Computer Science and Engineering' },
    { name: 'Electronics & Communication', code: 'ECE', description: 'Department of Electronics and Communication Engineering' },
    { name: 'Mechanical Engineering', code: 'ME', description: 'Department of Mechanical Engineering' },
    { name: 'Civil Engineering', code: 'CE', description: 'Department of Civil Engineering' },
    { name: 'Electrical Engineering', code: 'EE', description: 'Department of Electrical Engineering' },
    { name: 'Information Technology', code: 'IT', description: 'Department of Information Technology' },
  ];

  const branchDocs = await db.collection('branches').insertMany(branchesData);
  const branchMap = {};
  branchesData.forEach((b, i) => {
    branchMap[b.code] = branchDocs.insertedIds[i];
  });

  // 2. Seed Users
  console.log('👥 Seeding IIIT-B class rep admin & student...');
  const iiitbAdminHash = await bcrypt.hash('tbsm-naamsujal-vichaar-Vy0m', 12);
  const studentHash = await bcrypt.hash('student123', 12);
  const branchAdminHash = await bcrypt.hash('branch123', 12);

  const usersData = [
    {
      name: 'IIIT-B Class Reps Admin',
      email: 'classreps@iiitb.ac.in',
      passwordHash: iiitbAdminHash,
      role: 'superadmin',
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
      name: 'IIIT-B Student',
      email: 'student@iiitb.ac.in',
      passwordHash: studentHash,
      role: 'student',
      branchId: branchMap['CSE'],
      year: 2,
      section: 'A',
      createdAt: new Date(),
    },
  ];

  const userDocs = await db.collection('users').insertMany(usersData);
  const classRepAdminId = userDocs.insertedIds[0];
  const cseAdminId = userDocs.insertedIds[1];

  // 3. Seed Timetable (IIIT-B CSE & ECE Year 2)
  console.log('📅 Seeding timetable schedules...');
  const ttEntries = [
    // CSE Mon-Fri
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 0, startTime: '09:00', endTime: '10:00', subject: 'Data Structures & Algorithms', teacher: 'Dr. Sharma', room: 'Room 301', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 0, startTime: '10:00', endTime: '11:00', subject: 'Discrete Mathematics', teacher: 'Prof. Gupta', room: 'Room 302', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 0, startTime: '11:00', endTime: '11:15', subject: 'Break', teacher: null, room: null, type: 'break', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 0, startTime: '11:15', endTime: '12:15', subject: 'Object Oriented Programming', teacher: 'Dr. Reddy', room: 'Room 303', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 0, startTime: '13:00', endTime: '15:00', subject: 'DSA Practical Lab', teacher: 'Dr. Sharma', room: 'Lab 201', type: 'lab', createdBy: classRepAdminId },

    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', subject: 'Computer Organization', teacher: 'Prof. Verma', room: 'Room 305', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 1, startTime: '10:00', endTime: '11:00', subject: 'Data Structures & Algorithms', teacher: 'Dr. Sharma', room: 'Room 301', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 1, startTime: '11:15', endTime: '12:15', subject: 'Probability & Statistics', teacher: 'Prof. Iyer', room: 'Room 204', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 1, startTime: '13:00', endTime: '14:00', subject: 'OOP Tutorial', teacher: 'Dr. Reddy', room: 'Room 303', type: 'tutorial', createdBy: classRepAdminId },

    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 2, startTime: '09:00', endTime: '10:00', subject: 'Discrete Mathematics', teacher: 'Prof. Gupta', room: 'Room 302', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 2, startTime: '10:00', endTime: '11:00', subject: 'Object Oriented Programming', teacher: 'Dr. Reddy', room: 'Room 303', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 2, startTime: '11:15', endTime: '12:15', subject: 'Computer Organization', teacher: 'Prof. Verma', room: 'Room 305', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, section: 'A', dayOfWeek: 2, startTime: '13:00', endTime: '15:00', subject: 'OOP Practical Lab', teacher: 'Dr. Reddy', room: 'Lab 202', type: 'lab', createdBy: classRepAdminId },

    // ECE entries
    { branchId: branchMap['ECE'], year: 2, section: 'A', dayOfWeek: 0, startTime: '09:00', endTime: '10:00', subject: 'Signals & Systems', teacher: 'Dr. Rao', room: 'Room 401', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['ECE'], year: 2, section: 'A', dayOfWeek: 0, startTime: '10:00', endTime: '11:00', subject: 'Electronic Circuits', teacher: 'Prof. Nair', room: 'Room 402', type: 'lecture', createdBy: classRepAdminId },
    { branchId: branchMap['ECE'], year: 2, section: 'A', dayOfWeek: 0, startTime: '13:00', endTime: '15:00', subject: 'Electronics Lab', teacher: 'Prof. Nair', room: 'Lab 301', type: 'lab', createdBy: classRepAdminId },
  ];

  await db.collection('timetableentries').insertMany(ttEntries.map(e => ({ ...e, createdAt: new Date(), updatedAt: new Date() })));

  // 4. Seed Assignments
  console.log('📝 Seeding assignments...');
  const assignmentsData = [
    { branchId: branchMap['CSE'], year: 2, subject: 'Data Structures & Algorithms', title: 'Implement Binary Search Tree', description: 'Implement BST with insert, delete, search, and traversal operations in C/C++. Include time complexity analysis.', dueDate: '2026-09-08', priority: 'high', status: 'active', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, subject: 'Object Oriented Programming', title: 'Design a Library Management System', description: 'Create a class diagram and implement core classes using Java/C++. Must include inheritance and polymorphism.', dueDate: '2026-09-12', priority: 'medium', status: 'active', createdBy: classRepAdminId },
    { branchId: branchMap['CSE'], year: 2, subject: 'Discrete Mathematics', title: 'Graph Theory Problem Set', description: 'Solve problems 1-15 from Chapter 8. Show all steps for proof-based questions.', dueDate: '2026-09-05', priority: 'urgent', status: 'active', createdBy: classRepAdminId },
    { branchId: branchMap['ECE'], year: 2, subject: 'Signals & Systems', title: 'Fourier Transform Assignment', description: 'Compute Fourier transforms for 10 given signals. Plot magnitude and phase spectra.', dueDate: '2026-09-10', priority: 'high', status: 'active', createdBy: classRepAdminId },
  ];

  await db.collection('assignments').insertMany(assignmentsData.map(a => ({ ...a, createdAt: new Date(), updatedAt: new Date() })));

  // 5. Seed Notifications
  console.log('🔔 Seeding notifications...');
  const notifsData = [
    { branchId: branchMap['CSE'], year: 2, title: 'Welcome IIIT-B Students!', message: 'Check your updated timetable and assignment schedule for the new semester.', type: 'info', isRead: false, createdAt: new Date() },
    { branchId: branchMap['CSE'], year: 2, title: 'New Assignment', message: '"Implement Binary Search Tree" for DSA — Due: Sep 8', type: 'assignment', isRead: false, createdAt: new Date() },
  ];

  await db.collection('notifications').insertMany(notifsData);

  console.log('\n✅ IIIT-B MongoDB Seed Completed Successfully!');
  console.log('--------------------------------------------------');
  console.log('👑 Admin:   classreps@iiitb.ac.in / tbsm-naamsujal-vichaar-Vy0m');
  console.log('👨‍🎓 Student: student@iiitb.ac.in / student123');
  console.log('--------------------------------------------------\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
