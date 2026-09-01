'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { 
  Plus, 
  Trash2, 
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
  Layers,
  Sparkles
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  branchId: number | null;
  year: number | null;
  section: string | null;
}

interface Branch {
  id: number;
  name: string;
  code: string;
}

interface Stats {
  totalStudents: number;
  totalAssignments: number;
  activeAssignments: number;
  totalEntries: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<'timetable' | 'assignment' | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [userSearch, setUserSearch] = useState('');
  const router = useRouter();

  // Form states for timetable
  const [ttBranchId, setTtBranchId] = useState(0);
  const [ttYear, setTtYear] = useState(1);
  const [ttSection, setTtSection] = useState('A');
  const [ttDay, setTtDay] = useState(0);
  const [ttStartTime, setTtStartTime] = useState('09:00');
  const [ttEndTime, setTtEndTime] = useState('10:00');
  const [ttSubject, setTtSubject] = useState('');
  const [ttTeacher, setTtTeacher] = useState('');
  const [ttRoom, setTtRoom] = useState('');
  const [ttType, setTtType] = useState('lecture');

  // Form states for assignment
  const [asBranchId, setAsBranchId] = useState(0);
  const [asYear, setAsYear] = useState(1);
  const [asSubject, setAsSubject] = useState('');
  const [asTitle, setAsTitle] = useState('');
  const [asDescription, setAsDescription] = useState('');
  const [asDueDate, setAsDueDate] = useState('');
  const [asPriority, setAsPriority] = useState('medium');

  // Users list (superadmin only)
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/branches').then(r => r.json()),
    ]).then(([userData, branchData]) => {
      if (!userData.user || (userData.user.role !== 'admin' && userData.user.role !== 'superadmin')) {
        router.push('/');
        return;
      }
      setUser(userData.user);
      const bList = branchData.branches || [];
      setBranches(bList);

      // Set default branch for admins
      if (userData.user.role === 'admin' && userData.user.branchId) {
        setTtBranchId(userData.user.branchId);
        setAsBranchId(userData.user.branchId);
      } else if (bList.length > 0) {
        setTtBranchId(bList[0].id);
        setAsBranchId(bList[0].id);
      }

      // Fetch stats
      fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d.stats));

      // Fetch users if superadmin
      if (userData.user.role === 'superadmin') {
        fetch('/api/admin/users').then(r => r.json()).then(d => setUsersList(d.users || []));
      }

      setLoading(false);
    }).catch(() => router.push('/login'));
  }, [router]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  const handleAddTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: ttBranchId,
          year: ttYear,
          section: ttSection,
          dayOfWeek: ttDay,
          startTime: ttStartTime,
          endTime: ttEndTime,
          subject: ttSubject,
          teacher: ttTeacher || null,
          room: ttRoom || null,
          type: ttType,
        }),
      });

      if (res.ok) {
        showToast('Timetable class entry added successfully!', 'success');
        setShowModal(null);
        setTtSubject('');
        setTtTeacher('');
        setTtRoom('');
        // Refresh stats
        fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d.stats));
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to add entry.', 'error');
      }
    } catch {
      showToast('Network error occurred.', 'error');
    }
    setSaving(false);
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: asBranchId,
          year: asYear,
          subject: asSubject,
          title: asTitle,
          description: asDescription || null,
          dueDate: asDueDate,
          priority: asPriority,
        }),
      });

      if (res.ok) {
        showToast('New assignment created and students notified!', 'success');
        setShowModal(null);
        setAsSubject('');
        setAsTitle('');
        setAsDescription('');
        setAsDueDate('');
        // Refresh stats
        fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d.stats));
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to create assignment.', 'error');
      }
    } catch {
      showToast('Network error occurred.', 'error');
    }
    setSaving(false);
  };

  const updateUserRole = async (userId: number, role: string, branchId?: number) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, branchId }),
      });
      if (res.ok) {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
        showToast('User role updated successfully!', 'success');
      }
    } catch {
      showToast('Failed to update role.', 'error');
    }
  };

  const filteredUsers = usersList.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.branch_code && u.branch_code.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading admin panel...</p>
          </div>
        </div>
      </>
    );
  }

  const userBranch = branches.find(b => b.id === user?.branchId);

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold uppercase tracking-wider">
                {user?.role === 'superadmin' ? 'Super Admin Portal' : 'Branch Admin Portal'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {user?.role === 'superadmin' ? 'Full System Access' : `${userBranch?.name || 'Assigned Branch'}`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Admin Management Center
            </h1>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal('timetable')}
              className="btn-primary text-xs py-2.5 px-4 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Timetable Class</span>
            </button>

            <button
              onClick={() => setShowModal('assignment')}
              className="btn-secondary text-xs py-2.5 px-4 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          </div>
        </div>

        {/* Toast Feedback */}
        {message.text && (
          <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 animate-slide-up ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Metrics Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="card p-5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Students</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalStudents}</p>
              <p className="text-[10px] text-slate-400">Registered</p>
            </div>

            <div className="card p-5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Active Assignments</span>
                <BookOpen className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.activeAssignments}</p>
              <p className="text-[10px] text-emerald-600 font-medium">In progress</p>
            </div>

            <div className="card p-5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Timetable Entries</span>
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalEntries}</p>
              <p className="text-[10px] text-slate-400">Class periods</p>
            </div>

            <div className="card p-5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Assignments</span>
                <BarChart3 className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalAssignments}</p>
              <p className="text-[10px] text-slate-400">All-time</p>
            </div>

          </div>
        )}

        {/* Tab Toggle for Super Admin */}
        {user?.role === 'superadmin' && (
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-2xl max-w-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'overview' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600'
              }`}
            >
              Control Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                activeTab === 'users' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600'
              }`}
            >
              User Directory ({usersList.length})
            </button>
          </div>
        )}

        {/* Superadmin User Management Table */}
        {activeTab === 'users' && user?.role === 'superadmin' && (
          <div className="card p-6 space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">User Role Management</h2>
                <p className="text-xs text-slate-500">Promote students to branch admins or super administrators</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="input-field text-xs pl-8 py-2"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="text-left py-3 px-3">Name</th>
                    <th className="text-left py-3 px-3">Email</th>
                    <th className="text-left py-3 px-3">Branch</th>
                    <th className="text-left py-3 px-3">Year</th>
                    <th className="text-left py-3 px-3">Current Role</th>
                    <th className="text-left py-3 px-3">Change Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{u.name}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono">{u.email}</td>
                      <td className="py-3 px-3">
                        <span className="badge badge-low text-[10px]">{u.branch_code || '—'}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{u.year ? `Year ${u.year}` : '—'}</td>
                      <td className="py-3 px-3">
                        <span className={`badge text-[10px] ${
                          u.role === 'superadmin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                          u.role === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.role !== 'superadmin' && (
                          <select
                            value={u.role}
                            onChange={e => updateUserRole(u.id, e.target.value)}
                            className="select-field text-xs py-1 px-2.5 w-32"
                          >
                            <option value="student">Student</option>
                            <option value="admin">Branch Admin</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="card p-6 space-y-4 md:col-span-2">
              <h2 className="text-base font-bold text-slate-900">Branch Management Guidelines</h2>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-blue-950 block mb-0.5">Automated Student Alerts</strong>
                    Whenever you add or modify a class schedule or create a new assignment, students in that branch and year will receive an instant notification in their alert feed.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 block mb-0.5">Role Boundaries</strong>
                    Branch admins can publish and manage data specifically for their designated department. Super admins have full unrestricted access across all college departments.
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Quick Tools</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowModal('timetable')}
                  className="w-full btn-secondary text-xs py-2.5 px-3 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Add Timetable Class
                  </span>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => setShowModal('assignment')}
                  className="w-full btn-secondary text-xs py-2.5 px-3 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    Create Assignment
                  </span>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Modal: Add Timetable Entry */}
        {showModal === 'timetable' && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-slide-up">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Add Class Entry
                </h2>
                <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddTimetable} className="space-y-3.5">
                
                {user?.role === 'superadmin' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
                    <select
                      value={ttBranchId}
                      onChange={e => setTtBranchId(parseInt(e.target.value))}
                      className="select-field text-xs"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
                    <select value={ttYear} onChange={e => setTtYear(parseInt(e.target.value))} className="select-field text-xs">
                      {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Section</label>
                    <select value={ttSection} onChange={e => setTtSection(e.target.value)} className="select-field text-xs">
                      {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Day of Week</label>
                  <select value={ttDay} onChange={e => setTtDay(parseInt(e.target.value))} className="select-field text-xs">
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={ttStartTime}
                      onChange={e => setTtStartTime(e.target.value)}
                      className="input-field text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={ttEndTime}
                      onChange={e => setTtEndTime(e.target.value)}
                      className="input-field text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Subject Name *</label>
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
                    <label className="block text-xs font-medium text-slate-700 mb-1">Professor / Teacher</label>
                    <input
                      type="text"
                      value={ttTeacher}
                      onChange={e => setTtTeacher(e.target.value)}
                      placeholder="e.g. Dr. Sharma"
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Room / Lab</label>
                    <input
                      type="text"
                      value={ttRoom}
                      onChange={e => setTtRoom(e.target.value)}
                      placeholder="e.g. Room 301 / Lab 2"
                      className="input-field text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select value={ttType} onChange={e => setTtType(e.target.value)} className="select-field text-xs">
                    <option value="lecture">Lecture</option>
                    <option value="lab">Lab Session</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="break">Break</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(null)} className="btn-secondary text-xs py-2 px-4">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary text-xs py-2 px-5">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Entry'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Assignment */}
        {showModal === 'assignment' && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-slide-up">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Create Assignment
                </h2>
                <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddAssignment} className="space-y-3.5">
                
                {user?.role === 'superadmin' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
                    <select
                      value={asBranchId}
                      onChange={e => setAsBranchId(parseInt(e.target.value))}
                      className="select-field text-xs"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
                    <select value={asYear} onChange={e => setAsYear(parseInt(e.target.value))} className="select-field text-xs">
                      {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                    <select value={asPriority} onChange={e => setAsPriority(e.target.value)} className="select-field text-xs">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Subject Name *</label>
                  <input
                    type="text"
                    value={asSubject}
                    onChange={e => setAsSubject(e.target.value)}
                    placeholder="e.g. Data Structures"
                    className="input-field text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assignment Title *</label>
                  <input
                    type="text"
                    value={asTitle}
                    onChange={e => setAsTitle(e.target.value)}
                    placeholder="e.g. Implement Binary Search Tree"
                    className="input-field text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description / Instructions</label>
                  <textarea
                    value={asDescription}
                    onChange={e => setAsDescription(e.target.value)}
                    rows={3}
                    placeholder="Provide details or submission requirements..."
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    value={asDueDate}
                    onChange={e => setAsDueDate(e.target.value)}
                    className="input-field text-xs"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(null)} className="btn-secondary text-xs py-2 px-4">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary text-xs py-2 px-5">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Publish Assignment'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
