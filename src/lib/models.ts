import mongoose, { Schema, Document, Model } from 'mongoose';

// ================= BRANCH =================
export interface IBranch extends Document {
  name: string;
  code: string;
  description?: string;
  createdAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// ================= USER =================
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'admin' | 'superadmin';
  branchId?: mongoose.Types.ObjectId;
  year?: number;
  section?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin', 'superadmin'], default: 'student' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    year: { type: Number },
    section: { type: String, default: 'A' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// ================= TIMETABLE ENTRY =================
export interface ITimetableEntry extends Document {
  branchId: mongoose.Types.ObjectId;
  year: number;
  section: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string;
  room?: string;
  type: 'lecture' | 'lab' | 'tutorial' | 'break';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableEntrySchema = new Schema<ITimetableEntry>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    year: { type: Number, required: true },
    section: { type: String, default: 'A' },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subject: { type: String, required: true },
    teacher: { type: String },
    room: { type: String },
    type: { type: String, enum: ['lecture', 'lab', 'tutorial', 'break'], default: 'lecture' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// ================= ASSIGNMENT =================
export interface IAssignment extends Document {
  branchId: mongoose.Types.ObjectId;
  year: number;
  section?: string;
  subject: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'completed' | 'cancelled';
  attachmentUrl?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    year: { type: Number, required: true },
    section: { type: String },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    attachmentUrl: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// ================= ASSIGNMENT TRACKING =================
export interface IAssignmentTracking extends Document {
  assignmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  completedAt?: Date;
}

const AssignmentTrackingSchema = new Schema<IAssignmentTracking>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    notes: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: false }
);

AssignmentTrackingSchema.index({ assignmentId: 1, userId: 1 }, { unique: true });

// ================= NOTIFICATION =================
export interface INotification extends Document {
  userId?: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  year?: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'assignment' | 'timetable_change';
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    year: { type: Number },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'warning', 'assignment', 'timetable_change'], default: 'info' },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// ================= BATCH =================
export interface IBatch extends Document {
  branchId: mongoose.Types.ObjectId;
  year: number;
  section: string;
  programme: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    year: { type: Number, required: true },
    section: { type: String, required: true, uppercase: true },
    programme: { type: String, required: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

BatchSchema.index({ branchId: 1, year: 1, section: 1 }, { unique: true });

// ================= QUIZ =================
export interface IQuiz extends Document {
  branchId?: mongoose.Types.ObjectId;
  targetBranches?: mongoose.Types.ObjectId[];
  targetBranchCodes?: string[];
  targetType?: 'all_first_years' | 'all_branch_year' | 'specific_branches' | 'specific_section' | 'all' | string;
  targetLabel?: string;
  year: number;
  targetYears?: number[];
  section?: string;
  subject: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  room?: string;
  totalMarks?: number;
  weightage?: string;
  topics?: string[];
  status: 'upcoming' | 'completed' | 'cancelled';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuizSchema = new Schema<IQuiz>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    targetBranches: [{ type: Schema.Types.ObjectId, ref: 'Branch' }],
    targetBranchCodes: [{ type: String }],
    targetType: { type: String, default: 'specific_branches' },
    targetLabel: { type: String },
    year: { type: Number, required: true },
    targetYears: [{ type: Number }],
    section: { type: String },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    date: { type: String, required: true },
    time: { type: String },
    room: { type: String },
    totalMarks: { type: Number },
    weightage: { type: String },
    topics: [{ type: String }],
    status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Prevent re-compilation in development HMR
export const Branch: Model<IBranch> = mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
export const Batch: Model<IBatch> = mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const TimetableEntry: Model<ITimetableEntry> = mongoose.models.TimetableEntry || mongoose.model<ITimetableEntry>('TimetableEntry', TimetableEntrySchema);
export const Assignment: Model<IAssignment> = mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
export const AssignmentTracking: Model<IAssignmentTracking> = mongoose.models.AssignmentTracking || mongoose.model<IAssignmentTracking>('AssignmentTracking', AssignmentTrackingSchema);
export const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const Quiz: Model<IQuiz> = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);

