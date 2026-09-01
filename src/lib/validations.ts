import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  branchId: z.union([z.string().min(1, 'Please select a branch'), z.number().positive()]),
  year: z.coerce.number().int().min(1).max(5),
  section: z.string().min(1).max(5).default('A'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const timetableEntrySchema = z.object({
  branchId: z.union([z.string().min(1), z.number()]),
  year: z.coerce.number().int().min(1).max(5),
  section: z.string().default('A'),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  subject: z.string().min(1, 'Subject is required'),
  teacher: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  type: z.enum(['lecture', 'lab', 'tutorial', 'break']).default('lecture'),
});

export const assignmentSchema = z.object({
  branchId: z.union([z.string().min(1), z.number()]),
  year: z.coerce.number().int().min(1).max(5),
  section: z.string().optional().nullable(),
  subject: z.string().min(1, 'Subject is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TimetableEntryInput = z.infer<typeof timetableEntrySchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
