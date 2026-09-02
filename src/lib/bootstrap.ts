import { Branch, Batch, User } from './models';
import bcrypt from 'bcryptjs';

const BRANCHES_DATA = [
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

export async function ensureDatabaseBootstrapped() {
  try {
    // 1. Ensure Branches exist
    const branchCount = await Branch.countDocuments();
    let branchMap: Record<string, any> = {};

    if (branchCount === 0) {
      console.log('🚀 Auto-bootstrapping official academic branches...');
      const createdBranches = await Branch.insertMany(BRANCHES_DATA);
      createdBranches.forEach((b: any) => {
        branchMap[b.code] = b._id;
      });
    } else {
      const existingBranches = await Branch.find().lean();
      existingBranches.forEach((b: any) => {
        branchMap[b.code] = b._id;
      });
    }

    // 2. Ensure Batches exist
    const batchCount = await Batch.countDocuments();
    if (batchCount === 0 && branchMap['CSE']) {
      console.log('📚 Auto-bootstrapping official academic batches...');
      const batchesData = [
        // CSE Batches (Section A)
        { branchId: branchMap['CSE'], year: 1, section: 'A', programme: 'B.Tech & iMTech', name: 'CSE Year 1 (Section A)', isActive: true },
        { branchId: branchMap['CSE'], year: 2, section: 'A', programme: 'B.Tech & iMTech', name: 'CSE Year 2 (Section A)', isActive: true },
        { branchId: branchMap['CSE'], year: 3, section: 'A', programme: 'B.Tech & iMTech', name: 'CSE Year 3 (Section A)', isActive: true },
        { branchId: branchMap['CSE'], year: 4, section: 'A', programme: 'iMTech Only', name: 'CSE Year 4 (Section A - iMTech)', isActive: true },
        { branchId: branchMap['CSE'], year: 5, section: 'A', programme: 'iMTech Only', name: 'CSE Year 5 (Section A - iMTech)', isActive: true },

        // ECE Batches (Section B)
        { branchId: branchMap['ECE'], year: 1, section: 'B', programme: 'B.Tech & iMTech', name: 'ECE Year 1 (Section B)', isActive: true },
        { branchId: branchMap['ECE'], year: 2, section: 'B', programme: 'B.Tech & iMTech', name: 'ECE Year 2 (Section B)', isActive: true },
        { branchId: branchMap['ECE'], year: 3, section: 'B', programme: 'B.Tech & iMTech', name: 'ECE Year 3 (Section B)', isActive: true },
        { branchId: branchMap['ECE'], year: 4, section: 'B', programme: 'iMTech Only', name: 'ECE Year 4 (Section B - iMTech)', isActive: true },
        { branchId: branchMap['ECE'], year: 5, section: 'B', programme: 'iMTech Only', name: 'ECE Year 5 (Section B - iMTech)', isActive: true },

        // AI&DS Batches (Section B, Years 1-3 only)
        { branchId: branchMap['AI&DS'], year: 1, section: 'B', programme: 'B.Tech Only', name: 'AI&DS Year 1 (Section B)', isActive: true },
        { branchId: branchMap['AI&DS'], year: 2, section: 'B', programme: 'B.Tech Only', name: 'AI&DS Year 2 (Section B)', isActive: true },
        { branchId: branchMap['AI&DS'], year: 3, section: 'B', programme: 'B.Tech Only', name: 'AI&DS Year 3 (Section B)', isActive: true },
      ];

      await Batch.insertMany(batchesData);
    }

    // 3. Ensure Super Admin user exists
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'classreps@iiitb.ac.in').toLowerCase().trim();
    const superAdminPassword =
      process.env.SUPER_ADMIN_PASSWORD ||
      process.env.SEED_ADMIN_PASSWORD ||
      'AdminSecure#2026!iiitbKey$99';

    const existingAdmin = await User.findOne({ email: superAdminEmail });
    if (!existingAdmin) {
      console.log(`👤 Auto-provisioning Super Admin: ${superAdminEmail}`);
      const passwordHash = await bcrypt.hash(superAdminPassword, 12);
      await User.create({
        name: 'IIIT-B Class Representatives Admin',
        email: superAdminEmail,
        passwordHash,
        role: 'superadmin',
      });
    }
  } catch (err) {
    console.error('Database bootstrap error:', err);
  }
}
