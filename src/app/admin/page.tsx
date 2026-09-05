'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Users, 
  BookOpen, 
  Calendar, 
  BarChart3, 
  Loader2, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Clock,
  MapPin,
  User as UserIcon,
  Layers,
  Sparkles,
  RefreshCw,
  GraduationCap,
  Target
} from 'lucide-react';
import QuizList from '../components/QuizList';


interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  year: number | null;
  section: string | null;
}

interface Branch {
  id: string;
  _id?: string;
  name: string;
  code: string;
}

interface TimetableEntry {
  id: string;
  _id?: string;
  branchId: string;
  year: number;
  section: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string | null;
  room?: string | null;
  type: string;
  branch_code?: string;
}

interface Assignment {
  id: string;
  _id?: string;
  branchId: string;
  year: number;
  section?: string | null;
  subject: string;
  title: string;
  description?: string | null;
  dueDate: string;
  priority: string;
  status: string;
}

interface BatchItem {
  id: string;
  _id?: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  year: number;
  section: string;
  programme: string;
  name: string;
  isActive: boolean;
}

interface Stats {
  totalStudents: number;
  totalAssignments: number;
  activeAssignments: number;
  totalEntries: number;
  totalQuizzes?: number;
  upcomingQuizzes?: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timetable' | 'assignments' | 'quizzes' | 'users'>('overview');

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Selected filters for timetable & assignment management
  const [mgmtBranchId, setMgmtBranchId] = useState<string>('');
  const [mgmtYear, setMgmtYear] = useState<number>(1);
  const [mgmtSection, setMgmtSection] = useState<string>('A');

  // Loaded items
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<Assignment[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);

  // Modals state
  const [showModal, setShowModal] = useState<'create_tt' | 'edit_tt' | 'create_as' | 'edit_as' | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Timetable Form
  const [ttBranchId, setTtBranchId] = useState<string>('');
  const [ttYear, setTtYear] = useState<number>(2);
  const [ttSection, setTtSection] = useState<string>('A');
  const [ttDay, setTtDay] = useState<number>(0);
  const [ttStartTime, setTtStartTime] = useState('09:00');
  const [ttEndTime, setTtEndTime] = useState('10:00');
  const [ttSubject, setTtSubject] = useState('');
  const [ttTeacher, setTtTeacher] = useState('');
  const [ttRoom, setTtRoom] = useState('');
  const [ttType, setTtType] = useState('lecture');

  // Assignment Form
  const [asBranchId, setAsBranchId] = useState<string>('');
  const [asYear, setAsYear] = useState<number>(2);
  const [asSection, setAsSection] = useState<string>('A');
  const [asSubject, setAsSubject] = useState('');
  const [asTitle, setAsTitle] = useState('');
  const [asDescription, setAsDescription] = useState('');
  const [asDueDate, setAsDueDate] = useState('');
  const [asPriority, setAsPriority] = useState('medium');
  const [asStatus, setAsStatus] = useState('active');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch {}
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) setUsersList(data.users);
    } catch {}
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/batches');
      const data = await res.json();
      if (data.batches) setBatches(data.batches);
    } catch {}
  }, []);

  const fetchTimetable = useCallback(async (bId: string, y: number, s: string) => {
    if (!bId) return;
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/timetable?branchId=${bId}&year=${y}&section=${s}`);
      const data = await res.json();
      setTimetableEntries(data.entries || []);
    } catch {}
    setLoadingItems(false);
  }, []);

  const fetchAssignments = useCallback(async (bId: string, y: number) => {
    if (!bId) return;
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/assignments?branchId=${bId}&year=${y}&status=all`);
      const data = await res.json();
      setAssignmentsList(data.assignments || []);
    } catch {}
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/batches').then(r => r.json()),
    ]).then(([userData, branchData, batchData]) => {
      if (!userData.user || (userData.user.role !== 'admin' && userData.user.role !== 'superadmin')) {
        router.push('/login');
        return;
      }
      setUser(userData.user);
      const bList = (branchData.branches || []).filter((b: any) => ['CSE', 'ECE', 'AI&DS'].includes(b.code));
      setBranches(bList);
      const batchList = (batchData.batches || []).filter((b: any) => ['CSE', 'ECE', 'AI&DS'].includes(b.branchCode));
      setBatches(batchList);

      const defaultBranch = userData.user.role === 'admin' && userData.user.branchId
        ? String(userData.user.branchId)
        : (bList[0]?.id || bList[0]?._id || '');

      setMgmtBranchId(defaultBranch);
      setTtBranchId(defaultBranch);
      setAsBranchId(defaultBranch);

      fetchStats();
      if (defaultBranch) {
        fetchTimetable(defaultBranch, 1, 'A');
        fetchAssignments(defaultBranch, 1);
      }
      if (userData.user.role === 'superadmin') {
        fetchUsers();
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [router, fetchStats, fetchUsers, fetchTimetable, fetchAssignments]);

  const getBranchCode = (bId: string) => {
    const b = branches.find(item => String(item.id || item._id) === String(bId));
    return b ? b.code : '';
  };

  // Dynamically query database batches for allowed years
  const getAllowedYears = (bId: string) => {
    if (bId === 'all') {
      return [
        { value: 1, label: 'Year 1 (All 1st Years - CSE, ECE, AI&DS)' },
        { value: 2, label: 'Year 2 (All Branches)' },
        { value: 3, label: 'Year 3 (All Branches)' },
        { value: 4, label: 'Year 4 (CSE & ECE iMTech)' },
        { value: 5, label: 'Year 5 (CSE & ECE iMTech)' },
      ];
    }

    const branchBatches = batches.filter(
      b => String(b.branchId) === String(bId) && b.isActive !== false
    );
    if (branchBatches.length > 0) {
      const yearMap = new Map<number, string>();
      branchBatches.forEach(b => {
        if (!yearMap.has(b.year)) {
          yearMap.set(b.year, `Year ${b.year} (${b.programme})`);
        }
      });
      return Array.from(yearMap.entries())
        .sort(([y1], [y2]) => y1 - y2)
        .map(([value, label]) => ({ value, label }));
    }

    const code = getBranchCode(bId);
    if (code === 'AI&DS') {
      return [
        { value: 1, label: 'Year 1 (B.Tech)' },
        { value: 2, label: 'Year 2 (B.Tech)' },
        { value: 3, label: 'Year 3 (B.Tech)' },
      ];
    }
    return [
      { value: 1, label: 'Year 1 (B.Tech & iMTech)' },
      { value: 2, label: 'Year 2 (B.Tech & iMTech)' },
      { value: 3, label: 'Year 3 (B.Tech & iMTech)' },
      { value: 4, label: 'Year 4 (iMTech Only)' },
      { value: 5, label: 'Year 5 (iMTech Only)' },
    ];
  };

  // Dynamically query database batches for allowed sections
  const getAllowedSections = (bId: string, targetYear?: number) => {
    if (bId === 'all') {
      return [
        { value: 'ALL', label: 'All Sections (Section A & Section B)' },
        { value: 'A', label: 'Section A Only' },
        { value: 'B', label: 'Section B Only' },
      ];
    }

    const branchBatches = batches.filter(
      b =>
        String(b.branchId) === String(bId) &&
        b.isActive !== false &&
        (targetYear ? b.year === targetYear : true)
    );
    if (branchBatches.length > 0) {
      const secMap = new Map<string, string>();
      branchBatches.forEach(b => {
        if (!secMap.has(b.section)) {
          secMap.set(b.section, `Section ${b.section} (${b.branchCode || getBranchCode(bId)})`);
        }
      });
      return Array.from(secMap.entries()).map(([value, label]) => ({ value, label }));
    }

    const code = getBranchCode(bId);
    if (code === 'CSE') {
      return [{ value: 'A', label: 'Section A (CSE)' }];
    }
    return [{ value: 'B', label: 'Section B (ECE & AI&DS)' }];
  };

  const handleBranchChange = (bId: string) => {
    setMgmtBranchId(bId);
    setTtBranchId(bId);
    setAsBranchId(bId);
    
    const allowedY = getAllowedYears(bId);
    let newYear = mgmtYear;
    if (!allowedY.some(y => y.value === newYear)) {
      newYear = allowedY[0]?.value || 1;
      setMgmtYear(newYear);
      setTtYear(newYear);
      setAsYear(newYear);
    }

    const allowedS = getAllowedSections(bId, newYear);
    let newSec = allowedS[0]?.value || (getBranchCode(bId) === 'CSE' ? 'A' : 'B');
    setMgmtSection(newSec);
    setTtSection(newSec);
    setAsSection(newSec);

    fetchTimetable(bId, newYear, newSec);
    fetchAssignments(bId, newYear);
  };

  const handleYearChange = (y: number) => {
    setMgmtYear(y);
    setTtYear(y);
    setAsYear(y);
    fetchTimetable(mgmtBranchId, y, mgmtSection);
    fetchAssignments(mgmtBranchId, y);
  };

  const handleSectionChange = (s: string) => {
    setMgmtSection(s);
    setTtSection(s);
    fetchTimetable(mgmtBranchId, mgmtYear, s);
  };

  // Open Edit Timetable Modal
  const openEditTimetable = (entry: TimetableEntry) => {
    setEditingEntryId(entry.id || entry._id || '');
    setTtBranchId(entry.branchId || mgmtBranchId);
    setTtYear(entry.year || mgmtYear);
    setTtSection(entry.section || 'A');
    setTtDay(entry.dayOfWeek ?? 0);
    setTtStartTime(entry.startTime || '09:00');
    setTtEndTime(entry.endTime || '10:00');
    setTtSubject(entry.subject || '');
    setTtTeacher(entry.teacher || '');
    setTtRoom(entry.room || '');
    setTtType(entry.type || 'lecture');
    setShowModal('edit_tt');
  };

  // Open Edit Assignment Modal
  const openEditAssignment = (as: Assignment) => {
    setEditingEntryId(as.id || as._id || '');
    setAsBranchId(as.branchId || mgmtBranchId);
    setAsYear(as.year || mgmtYear);
    setAsSection(as.section || 'A');
    setAsSubject(as.subject || '');
    setAsTitle(as.title || '');
    setAsDescription(as.description || '');
    setAsDueDate(as.dueDate || '');
    setAsPriority(as.priority || 'medium');
    setAsStatus(as.status || 'active');
    setShowModal('edit_as');
  };

  // Save Timetable (Create or Update)
  const handleSaveTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    const payload = {
      branchId: ttBranchId,
      year: ttYear,
      section: ttSection.trim() || 'A',
      dayOfWeek: Number(ttDay),
      startTime: ttStartTime,
      endTime: ttEndTime,
      subject: ttSubject.trim(),
      teacher: ttTeacher.trim() || null,
      room: ttRoom.trim() || null,
      type: ttType,
    };

    try {
      const isEdit = showModal === 'edit_tt' && editingEntryId;
      const res = await fetch('/api/timetable', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingEntryId, ...payload } : payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Failed to save timetable class', type: 'error' });
      } else {
        setMessage({ text: isEdit ? 'Class updated successfully!' : 'New class added to timetable!', type: 'success' });
        setShowModal(null);
        fetchTimetable(mgmtBranchId, mgmtYear, mgmtSection);
        fetchStats();
      }
    } catch {
      setMessage({ text: 'Network error occurred', type: 'error' });
    }
    setSaving(false);
  };

  // Delete Timetable Entry
  const handleDeleteTimetable = async (id: string) => {
    if (!confirm('Are you sure you want to delete this timetable class?')) return;
    try {
      const res = await fetch(`/api/timetable?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ text: 'Class deleted successfully', type: 'success' });
        fetchTimetable(mgmtBranchId, mgmtYear, mgmtSection);
        fetchStats();
      }
    } catch {}
  };

  // Save Assignment (Create or Update)
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    const isAllBranches = asBranchId === 'all';
    const payload: any = {
      branchId: isAllBranches ? 'all' : asBranchId,
      year: asYear,
      section: isAllBranches && (!asSection || asSection === 'ALL') ? 'ALL' : (asSection.trim() || null),
      subject: asSubject.trim(),
      title: asTitle.trim(),
      description: asDescription.trim() || null,
      dueDate: asDueDate,
      priority: asPriority,
      status: asStatus,
    };

    if (isAllBranches) {
      payload.targetType = asYear === 1 ? 'all_first_years' : 'all_branch_year';
      payload.targetBranchCodes = ['ALL', 'CSE', 'ECE', 'AI&DS'];
      payload.targetLabel = asYear === 1 ? 'All 1st Years (CSE, ECE, AI&DS)' : `All Year ${asYear} Students`;
    }

    try {
      const isEdit = showModal === 'edit_as' && editingEntryId;
      const res = await fetch('/api/assignments', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editingEntryId, ...payload } : payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Failed to save assignment', type: 'error' });
      } else {
        setMessage({ text: isEdit ? 'Assignment updated successfully!' : 'Assignment published and students alerted!', type: 'success' });
        setShowModal(null);
        fetchAssignments(mgmtBranchId, mgmtYear);
        fetchStats();
      }
    } catch {
      setMessage({ text: 'Network error occurred', type: 'error' });
    }
    setSaving(false);
  };

  // Delete Assignment
  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      const res = await fetch(`/api/assignments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ text: 'Assignment deleted', type: 'success' });
        fetchAssignments(mgmtBranchId, mgmtYear);
        fetchStats();
      }
    } catch {}
  };

  // Superadmin Role Update
  const handleRoleChange = async (userId: string, newRole: string, newBranchId?: string | null) => {
    try {
      const payload: any = { userId, role: newRole };
      if (newBranchId !== undefined) {
        payload.branchId = newBranchId;
      }
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage({ text: 'User role updated successfully', type: 'success' });
        fetchUsers();
        fetchStats();
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <>
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`badge ${isSuperAdmin ? 'badge-urgent' : 'badge-lecture'}`}>
                {isSuperAdmin ? '👑 Super Admin Control' : '🏢 Branch Admin Panel'}
              </span>
              <span className="text-xs text-slate-400 font-mono">{user?.email}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              IIIT-B Academic & Class Management
            </h1>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingEntryId(null);
                setTtSubject('');
                setTtTeacher('');
                setTtRoom('');
                setShowModal('create_tt');
              }}
              className="btn-primary text-xs py-2.5 px-3.5 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>

            <button
              onClick={() => {
                setEditingEntryId(null);
                setAsSubject('');
                setAsTitle('');
                setAsDescription('');
                setAsDueDate('');
                setShowModal('create_as');
              }}
              className="btn-secondary text-xs py-2.5 px-3.5 shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publish Assignment</span>
            </button>

            <button
              onClick={() => setActiveTab('quizzes')}
              className="btn-primary text-xs py-2.5 px-3.5 bg-purple-700 hover:bg-purple-800 text-white shadow-sm flex items-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Schedule Batch Quiz</span>
            </button>
          </div>
        </div>

        {/* Global Message Banner */}
        {message.text && (
          <div className={`p-4 rounded-2xl text-xs flex items-center justify-between animate-fade-in ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ text: '', type: '' })} className="p-1 hover:bg-black/5 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs Bar with Clear Spacing */}
        <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap items-center gap-2 border border-slate-200/90 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'timetable'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Manage Timetables & Batches</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'assignments'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Manage Assignments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quizzes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'quizzes'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-1 ring-black/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Manage Quizzes & Batches</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-1 ring-black/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Users className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Users & Permissions</span>
            </button>
          )}
        </div>

        {/* ===================== TAB: OVERVIEW ===================== */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="card p-5 space-y-1">
                <p className="text-xs text-slate-500 font-medium">Enrolled Students</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalStudents}</p>
              </div>

              <div className="card p-5 space-y-1">
                <p className="text-xs text-slate-500 font-medium">Scheduled Classes</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalEntries}</p>
              </div>

              <div className="card p-5 space-y-1">
                <p className="text-xs text-slate-500 font-medium">Total Assignments</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalAssignments}</p>
              </div>

              <div className="card p-5 space-y-1 border-blue-200/80 bg-blue-50/20">
                <p className="text-xs text-blue-700 font-medium">Active Deadlines</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-900">{stats.activeAssignments}</p>
              </div>

              <div className="card p-5 space-y-1 border-purple-200/80 bg-purple-50/20 col-span-2 sm:col-span-1">
                <p className="text-xs text-purple-700 font-medium">Upcoming Quizzes</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-purple-900">{stats.upcomingQuizzes ?? stats.totalQuizzes ?? 0}</p>
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="card p-6 bg-slate-900 text-white space-y-4">
              <h3 className="text-base font-semibold">Quick Administration Controls</h3>
              <p className="text-xs text-slate-300">
                Choose a branch and batch below to edit lecture timings, swap classrooms, schedule quizzes across batches, or modify due dates.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => setActiveTab('timetable')}
                  className="btn-accent text-xs py-2 px-4 shadow-sm"
                >
                  Edit Class Timetables →
                </button>
                <button
                  onClick={() => setActiveTab('assignments')}
                  className="btn-secondary text-xs py-2 px-4 bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                >
                  Edit Assignments →
                </button>
                <button
                  onClick={() => setActiveTab('quizzes')}
                  className="btn-secondary text-xs py-2 px-4 bg-purple-900/80 text-white border-purple-700 hover:bg-purple-800"
                >
                  Schedule Batch Quizzes →
                </button>
              </div>
            </div>


            {/* Database Batches Grid */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    🏛️ Active Academic Batches (Database)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Officially configured batches queried live from MongoDB
                  </p>
                </div>
                <span className="badge badge-lecture text-xs">
                  {batches.length} Active Batches
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {batches.map(b => (
                  <div
                    key={b.id || b._id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{b.branchCode} • Year {b.year}</span>
                      <span className="badge badge-lab text-[10px]">Sec {b.section}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">{b.name}</p>
                    <span className="inline-block text-[10px] text-slate-400 font-mono">
                      {b.programme}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: MANAGE TIMETABLES ===================== */}
        {activeTab === 'timetable' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Filter Header */}
            <div className="card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Target Batch:
                </span>

                <select
                  value={mgmtBranchId}
                  onChange={e => handleBranchChange(e.target.value)}
                  className="select-field text-xs py-2 min-w-[200px]"
                >
                  {branches.map(b => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={mgmtYear}
                  onChange={e => handleYearChange(parseInt(e.target.value))}
                  className="select-field text-xs py-2 min-w-[160px]"
                >
                  {getAllowedYears(mgmtBranchId).map(y => (
                    <option key={y.value} value={y.value}>{y.label}</option>
                  ))}
                </select>

                {/* Section Selector */}
                <select
                  value={mgmtSection}
                  onChange={e => handleSectionChange(e.target.value)}
                  className="select-field text-xs py-2 min-w-[150px]"
                >
                  {getAllowedSections(mgmtBranchId).map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingEntryId(null);
                  setTtBranchId(mgmtBranchId);
                  setTtYear(mgmtYear);
                  setTtSection(mgmtSection);
                  setTtSubject('');
                  setTtTeacher('');
                  setTtRoom('');
                  setShowModal('create_tt');
                }}
                className="btn-primary text-xs py-2 px-3.5 shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Class to This Batch</span>
              </button>
            </div>

            {/* Timetable Entries List */}
            {loadingItems ? (
              <div className="grid gap-3">
                {[1, 2, 3].map(i => <div key={i} className="card p-5 animate-pulse bg-slate-100/70 h-20 rounded-2xl" />)}
              </div>
            ) : timetableEntries.length === 0 ? (
              <div className="card py-16 px-6 text-center border-dashed border-slate-300">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <h3 className="text-base font-semibold text-slate-800">No classes in this batch yet</h3>
                <p className="text-xs text-slate-500 mt-1">Click "+ Add Class" above to create timetable entries for this year and section.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {DAYS.map((dayName, dayIdx) => {
                  const dayClasses = timetableEntries.filter(e => e.dayOfWeek === dayIdx);
                  if (dayClasses.length === 0) return null;

                  return (
                    <div key={dayName} className="space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <h3 className="font-bold text-sm text-slate-900">{dayName}</h3>
                        <span className="text-xs text-slate-400 font-mono">({dayClasses.length} sessions)</span>
                      </div>

                      <div className="grid gap-2.5">
                        {dayClasses.map(entry => (
                          <div
                            key={entry.id || entry._id}
                            className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 card-hover border-slate-200"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`badge ${
                                  entry.type === 'lab' ? 'badge-lab' :
                                  entry.type === 'tutorial' ? 'badge-tutorial' :
                                  entry.type === 'break' ? 'badge-break' : 'badge-lecture'
                                }`}>
                                  {entry.type}
                                </span>
                                <span className="font-semibold text-sm text-slate-900">{entry.subject}</span>
                                <span className="text-xs text-slate-400 font-mono">Sec {entry.section}</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                                <span className="flex items-center gap-1 font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {entry.startTime} — {entry.endTime}
                                </span>
                                {entry.teacher && (
                                  <span className="flex items-center gap-1">
                                    <UserIcon className="w-3 h-3 text-slate-400" />
                                    {entry.teacher}
                                  </span>
                                )}
                                {entry.room && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {entry.room}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                              <button
                                onClick={() => openEditTimetable(entry)}
                                className="text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTimetable(entry.id || entry._id || '')}
                                className="text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB: MANAGE ASSIGNMENTS ===================== */}
        {activeTab === 'assignments' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Filter Header */}
            <div className="card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Target Batch:
                </span>

                <select
                  value={mgmtBranchId}
                  onChange={e => handleBranchChange(e.target.value)}
                  className="select-field text-xs py-2 min-w-[200px]"
                >
                  {branches.map(b => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={mgmtYear}
                  onChange={e => handleYearChange(parseInt(e.target.value))}
                  className="select-field text-xs py-2 min-w-[160px]"
                >
                  {getAllowedYears(mgmtBranchId).map(y => (
                    <option key={y.value} value={y.value}>{y.label}</option>
                  ))}
                </select>

                <select
                  value={mgmtSection}
                  onChange={e => handleSectionChange(e.target.value)}
                  className="select-field text-xs py-2 min-w-[150px]"
                >
                  {getAllowedSections(mgmtBranchId).map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingEntryId(null);
                  setAsBranchId(mgmtBranchId);
                  setAsYear(mgmtYear);
                  setAsSection(mgmtSection);
                  setAsSubject('');
                  setAsTitle('');
                  setAsDescription('');
                  setAsDueDate('');
                  setShowModal('create_as');
                }}
                className="btn-primary text-xs py-2 px-3.5 shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish New Assignment</span>
              </button>
            </div>

            {/* Assignments List */}
            {loadingItems ? (
              <div className="grid gap-3">
                {[1, 2, 3].map(i => <div key={i} className="card p-5 animate-pulse bg-slate-100/70 h-20 rounded-2xl" />)}
              </div>
            ) : assignmentsList.length === 0 ? (
              <div className="card py-16 px-6 text-center border-dashed border-slate-300">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <h3 className="text-base font-semibold text-slate-800">No assignments posted for this batch</h3>
                <p className="text-xs text-slate-500 mt-1">Publish an assignment above to automatically notify students and sync to their dashboards.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignmentsList.map(as => (
                  <div
                    key={as.id || as._id}
                    className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-hover border-slate-200"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${
                          as.priority === 'urgent' ? 'badge-urgent' :
                          as.priority === 'high' ? 'badge-high' : 'badge-medium'
                        }`}>
                          {as.priority}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 uppercase">{as.subject}</span>
                        {as.section && <span className="badge bg-slate-100 text-slate-600 text-[10px]">Sec {as.section}</span>}
                      </div>

                      <h4 className="font-bold text-base text-slate-900">{as.title}</h4>
                      {as.description && <p className="text-xs text-slate-600 line-clamp-2">{as.description}</p>}

                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 font-mono">
                        <span className="font-semibold text-slate-700">Due: {as.dueDate}</span>
                        <span>• Status: {as.status}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => openEditAssignment(as)}
                        className="text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(as.id || as._id || '')}
                        className="text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB: MANAGE QUIZZES & BATCHES ===================== */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6 animate-fade-in">
            <QuizList
              initialBranchId={mgmtBranchId}
              initialYear={mgmtYear}
              initialSection={mgmtSection}
              showFilters={true}
            />
          </div>
        )}

        {/* ===================== TAB: USERS & ROLES (SUPERADMIN) ===================== */}
        {activeTab === 'users' && isSuperAdmin && (

          <div className="space-y-6 animate-fade-in">
            <div className="card p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search students by name or email..."
                  className="input-field text-xs pl-10 py-2"
                />
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Batch / Section</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList
                      .filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
                      .map(u => (
                        <tr key={u.id || u._id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-semibold text-slate-900">{u.name}</td>
                          <td className="p-4 text-slate-500 font-mono">{u.email}</td>
                          <td className="p-4">
                            <span className={`badge ${
                              u.role === 'superadmin' ? 'badge-urgent' :
                              u.role === 'admin' ? 'badge-high' : 'badge-low'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">
                            {u.branch_code || 'All'} • Year {u.year || '-'} Sec {u.section || '-'}
                          </td>
                          <td className="p-4 text-right">
                            {u.role === 'student' ? (
                              <button
                                onClick={() => handleRoleChange(u.id || u._id, 'admin', u.branchId)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg"
                              >
                                Promote to Branch Admin
                              </button>
                            ) : u.role === 'admin' ? (
                              <button
                                onClick={() => handleRoleChange(u.id || u._id, 'student', u.branchId)}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg"
                              >
                                Demote to Student
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Super Admin</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ===================== MODAL: CREATE / EDIT TIMETABLE ===================== */}
      {(showModal === 'create_tt' || showModal === 'edit_tt') && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-lg w-full p-6 space-y-5 shadow-2xl bg-white animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {showModal === 'edit_tt' ? '✏️ Edit Timetable Class' : '➕ Add Class to Schedule'}
              </h3>
              <button onClick={() => setShowModal(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTimetable} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Branch</label>
                  <select
                    value={ttBranchId}
                    onChange={e => {
                      const bId = e.target.value;
                      setTtBranchId(bId);
                      const code = getBranchCode(bId);
                      if (code === 'AI&DS' && ttYear > 3) setTtYear(1);
                      setTtSection(code === 'CSE' ? 'A' : 'B');
                    }}
                    className="select-field text-xs"
                    required
                  >
                    {branches.map(b => (
                      <option key={b.id || b._id} value={b.id || b._id}>{b.code} — {b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Year</label>
                    <select
                      value={ttYear}
                      onChange={e => setTtYear(parseInt(e.target.value))}
                      className="select-field text-xs"
                    >
                      {getAllowedYears(ttBranchId).map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Section</label>
                    <select
                      value={ttSection}
                      onChange={e => setTtSection(e.target.value)}
                      className="select-field text-xs"
                      required
                    >
                      {getAllowedSections(ttBranchId).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Day of Week</label>
                  <select
                    value={ttDay}
                    onChange={e => setTtDay(parseInt(e.target.value))}
                    className="select-field text-xs"
                  >
                    {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Class Type</label>
                  <select
                    value={ttType}
                    onChange={e => setTtType(e.target.value)}
                    className="select-field text-xs"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="lab">Lab Session</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="break">Break / Recess</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Time (HH:MM)</label>
                  <input
                    type="time"
                    value={ttStartTime}
                    onChange={e => setTtStartTime(e.target.value)}
                    className="input-field text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Time (HH:MM)</label>
                  <input
                    type="time"
                    value={ttEndTime}
                    onChange={e => setTtEndTime(e.target.value)}
                    className="input-field text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Subject / Course Name</label>
                <input
                  type="text"
                  value={ttSubject}
                  onChange={e => setTtSubject(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms"
                  className="input-field text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Instructor / Professor</label>
                  <input
                    type="text"
                    value={ttTeacher}
                    onChange={e => setTtTeacher(e.target.value)}
                    placeholder="e.g. Dr. Sharma"
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Room / Lab Number</label>
                  <input
                    type="text"
                    value={ttRoom}
                    onChange={e => setTtRoom(e.target.value)}
                    placeholder="e.g. Room 301 / Lab 2"
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="btn-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{showModal === 'edit_tt' ? 'Save Changes' : 'Add to Timetable'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: CREATE / EDIT ASSIGNMENT ===================== */}
      {(showModal === 'create_as' || showModal === 'edit_as') && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card max-w-lg w-full p-6 space-y-5 shadow-2xl bg-white animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {showModal === 'edit_as' ? '✏️ Edit Assignment' : '📝 Publish Assignment'}
              </h3>
              <button onClick={() => setShowModal(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Branch</label>
                  <select
                    value={asBranchId}
                    onChange={e => {
                      const bId = e.target.value;
                      setAsBranchId(bId);
                      if (bId === 'all') {
                        setAsSection('ALL');
                        return;
                      }
                      const code = getBranchCode(bId);
                      if (code === 'AI&DS' && asYear > 3) setAsYear(1);
                      setAsSection(code === 'CSE' ? 'A' : 'B');
                    }}
                    className="select-field text-xs"
                    required
                  >
                    <option value="all">🌟 All Branches (All 1st Years / All Batches)</option>
                    {branches.map(b => (
                      <option key={b.id || b._id} value={b.id || b._id}>{b.code} — {b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Year</label>
                    <select
                      value={asYear}
                      onChange={e => setAsYear(parseInt(e.target.value))}
                      className="select-field text-xs"
                    >
                      {getAllowedYears(asBranchId).map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Section</label>
                    <select
                      value={asSection}
                      onChange={e => setAsSection(e.target.value)}
                      className="select-field text-xs"
                    >
                      {getAllowedSections(asBranchId).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={asSubject}
                    onChange={e => setAsSubject(e.target.value)}
                    placeholder="e.g. Operating Systems"
                    className="input-field text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={asPriority}
                    onChange={e => setAsPriority(e.target.value)}
                    className="select-field text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Assignment Title</label>
                <input
                  type="text"
                  value={asTitle}
                  onChange={e => setAsTitle(e.target.value)}
                  placeholder="e.g. Implement Multi-threaded Web Server"
                  className="input-field text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description & Instructions</label>
                <textarea
                  value={asDescription}
                  onChange={e => setAsDescription(e.target.value)}
                  placeholder="Details, submission guidelines, format requirements..."
                  rows={3}
                  className="textarea-field text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={asDueDate}
                    onChange={e => setAsDueDate(e.target.value)}
                    className="input-field text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={asStatus}
                    onChange={e => setAsStatus(e.target.value)}
                    className="select-field text-xs"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="btn-secondary text-xs py-2 px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{showModal === 'edit_as' ? 'Save Changes' : 'Publish Assignment'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </>
  );
}
