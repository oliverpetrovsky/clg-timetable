'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  BookOpen,
  Award,
  Sparkles,
  X,
  Layers,
  ArrowUpDown,
  Tag,
  Users,
  Target,
  Check,
  BookmarkCheck,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { getUserPreference, saveUserPreference } from '@/lib/userPreferences';

export interface QuizItem {
  id: string;
  branch_id?: string;
  year?: number;
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
  targetType?: 'all_first_years' | 'all_branch_year' | 'specific_branches' | 'specific_section' | 'all' | string;
  targetBranchCodes?: string[];
  targetLabel?: string;
  branch_name?: string;
  branch_code?: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface QuizListProps {
  initialBranchId?: string | number;
  initialYear?: number;
  initialSection?: string;
  showFilters?: boolean;
  onQuizCountChange?: (count: number) => void;
}

const TARGET_PRESETS = [
  {
    id: 'all_first_years',
    label: 'All 1st Years (CSE, ECE, AI&DS)',
    shortLabel: '🌟 All 1st Years',
    type: 'all_first_years',
    branches: ['ALL', 'CSE', 'ECE', 'AI&DS'],
    year: 1,
    section: 'ALL',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'all_year2',
    label: 'All Year 2 Batches (CSE & ECE)',
    shortLabel: '⚡ All Year 2',
    type: 'all_branch_year',
    branches: ['CSE', 'ECE'],
    year: 2,
    section: 'ALL',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    id: 'all_year3',
    label: 'All Year 3 Batches (CSE, ECE, AI&DS)',
    shortLabel: '🚀 All Year 3',
    type: 'all_branch_year',
    branches: ['CSE', 'ECE', 'AI&DS'],
    year: 3,
    section: 'ALL',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  {
    id: 'all_batches',
    label: 'All Batches & Branches (College-wide)',
    shortLabel: '🏛️ All Batches',
    type: 'all',
    branches: ['ALL', 'CSE', 'ECE', 'AI&DS'],
    year: 1,
    section: 'ALL',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  {
    id: 'aids_only',
    label: 'AI&DS Year 1 (Section B)',
    shortLabel: '🤖 AI&DS Year 1',
    type: 'specific_branches',
    branches: ['AI&DS'],
    year: 1,
    section: 'B',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'cse_sec_a',
    label: 'CSE Year 1 (Section A)',
    shortLabel: '💻 CSE Sec A',
    type: 'specific_branches',
    branches: ['CSE'],
    year: 1,
    section: 'A',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'ece_only',
    label: 'ECE Year 1 (Section B)',
    shortLabel: '⚡ ECE Year 1',
    type: 'specific_branches',
    branches: ['ECE'],
    year: 1,
    section: 'B',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'sec_b_ece_aids',
    label: 'Section B (ECE & AI&DS)',
    shortLabel: 'Sec B (ECE + AI&DS)',
    type: 'specific_section',
    branches: ['ECE', 'AI&DS'],
    year: 1,
    section: 'B',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'custom',
    label: 'Custom Batch Target',
    shortLabel: '🎯 Custom Target',
    type: 'custom',
    branches: [],
    year: 1,
    section: 'ALL',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  },
];


export default function QuizList({
  initialBranchId,
  initialYear,
  initialSection,
  showFilters = true,
  onQuizCountChange,
}: QuizListProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [branchId, setBranchId] = useState<string>(initialBranchId ? String(initialBranchId) : '');
  const [year, setYear] = useState<number>(initialYear || 1);
  const [section, setSection] = useState<string>(initialSection || 'ALL');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedTargetFilter, setSelectedTargetFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'weightage'>('date');
  const [hasSavedPref, setHasSavedPref] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const canManageQuizzes = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  // Preparation status tracking (persisted in localStorage)
  const [prepMap, setPrepMap] = useState<Record<string, 'not_started' | 'preparing' | 'ready'>>({});

  // Add Quiz Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('all_first_years');
  const [customBranches, setCustomBranches] = useState<string[]>(['CSE']);
  const [customYear, setCustomYear] = useState(1);
  const [customSection, setCustomSection] = useState('ALL');
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newMarks, setNewMarks] = useState('');
  const [newWeightage, setNewWeightage] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Editing state
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTargetLabel, setEditTargetLabel] = useState('');

  // Sync props
  useEffect(() => {
    if (initialBranchId) setBranchId(String(initialBranchId));
    if (initialYear) setYear(initialYear);
    if (initialSection !== undefined) setSection(initialSection);
  }, [initialBranchId, initialYear, initialSection]);

  // Load branches & cookies on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/batches').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()).catch(() => ({ user: null })),
    ])
      .then(([branchData, batchData, authData]) => {
        if (authData?.user) {
          setCurrentUser(authData.user);
          if (authData.user.branch_code) {
            setCustomBranches([authData.user.branch_code]);
          }
        }
        const list = (branchData.branches || []).filter((b: any) => ['CSE', 'ECE', 'AI&DS'].includes(b.code));
        setBranches(list);
        setBatches((batchData.batches || []).filter((b: any) => ['CSE', 'ECE', 'AI&DS'].includes(b.branchCode)));

        if (!initialBranchId && list.length > 0) {
          const saved = getUserPreference();
          if (saved && saved.branchId && list.some((b: any) => String(b.id) === String(saved.branchId) || String(b._id) === String(saved.branchId))) {
            setBranchId(String(saved.branchId));
            if (saved.year) setYear(Number(saved.year));
            if (saved.section) setSection(saved.section);
            setHasSavedPref(true);
            return;
          }
          if (authData?.user?.branchId) {
            setBranchId(String(authData.user.branchId));
            if (authData.user.year) setYear(Number(authData.user.year));
            if (authData.user.section) setSection(String(authData.user.section));
            return;
          }
          setBranchId(String(list[0].id || list[0]._id));
        }
      })
      .catch(() => {});

    // Listen to sync events from other tabs / dropdowns
    const handlePrefChange = (e: any) => {
      if (initialBranchId) return;
      const detail = e.detail;
      if (detail && detail.branchId) {
        setBranchId(String(detail.branchId));
        if (detail.year) setYear(Number(detail.year));
        if (detail.section) setSection(String(detail.section));
        setHasSavedPref(true);
      }
    };
    window.addEventListener('clg_pref_changed', handlePrefChange);
    return () => window.removeEventListener('clg_pref_changed', handlePrefChange);
  }, [initialBranchId]);

  // Load preparation status from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('college_timetable_quiz_prep');
      if (saved) {
        setPrepMap(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const savePrepStatus = (quizId: string, status: 'not_started' | 'preparing' | 'ready') => {
    setPrepMap(prev => {
      const updated = { ...prev, [quizId]: status };
      try {
        localStorage.setItem('college_timetable_quiz_prep', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const getBranchCode = (bId: any) => {
    const b = branches.find(item => String(item.id || (item as any)._id) === String(bId));
    return b ? b.code : '';
  };

  const getAllowedYears = (bId: any) => {
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
        { value: 1, label: 'Year 1' },
        { value: 2, label: 'Year 2' },
        { value: 3, label: 'Year 3' },
      ];
    }
    return [
      { value: 1, label: 'Year 1' },
      { value: 2, label: 'Year 2' },
      { value: 3, label: 'Year 3' },
      { value: 4, label: 'Year 4 (iMTech)' },
      { value: 5, label: 'Year 5 (iMTech)' },
    ];
  };

  const handleBranchChange = (newBranchId: string) => {
    setBranchId(newBranchId);
    const allowed = getAllowedYears(newBranchId);
    let newYear = year;
    if (!allowed.some(y => y.value === newYear)) {
      newYear = allowed[0]?.value || 1;
      setYear(newYear);
    }
    const branch = branches.find(b => String(b.id || (b as any)._id) === String(newBranchId));
    saveUserPreference({ branchId: newBranchId, branchCode: branch?.code, year: newYear, section });
    setHasSavedPref(true);
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const branch = branches.find(b => String(b.id || (b as any)._id) === String(branchId));
    saveUserPreference({ branchId, branchCode: branch?.code, year: newYear, section });
    setHasSavedPref(true);
  };

  const handleSectionChange = (newSection: string) => {
    setSection(newSection);
    const branch = branches.find(b => String(b.id || (b as any)._id) === String(branchId));
    saveUserPreference({ branchId, branchCode: branch?.code, year, section: newSection });
    setHasSavedPref(true);
  };

  // Fetch quizzes
  useEffect(() => {
    setLoading(true);
    const bParam = branchId ? `branchId=${branchId}` : '';
    const yParam = year ? `year=${year}` : '';
    const sParam = section && section !== 'ALL' ? `section=${encodeURIComponent(section)}` : '';
    const queryParts = [bParam, yParam, sParam].filter(Boolean).join('&');

    fetch(`/api/quizzes${queryParts ? `?${queryParts}` : ''}`)
      .then(res => res.json())
      .then(data => {
        const list = data.quizzes || [];
        setQuizzes(list);
        if (onQuizCountChange) onQuizCountChange(list.filter((q: any) => q.status === 'upcoming').length);
      })
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [branchId, year, section]);

  // Extract unique subjects
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach(q => {
      if (q.subject && q.subject.trim()) set.add(q.subject.trim());
    });
    return Array.from(set).sort();
  }, [quizzes]);

  // Target audience badge helper
  const getTargetBadge = (quiz: QuizItem) => {
    const label = quiz.targetLabel || (quiz.targetType === 'all_first_years' ? 'All 1st Years (CSE, ECE, AI&DS)' : `${quiz.targetBranchCodes?.join(', ') || 'Batch'} Year ${quiz.year}`);
    
    if (quiz.targetType === 'all_first_years' || label.toLowerCase().includes('all 1st') || label.toLowerCase().includes('all first')) {
      return { label, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (label.toLowerCase().includes('ai&ds') || quiz.targetBranchCodes?.includes('AI&DS')) {
      return { label, color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (label.toLowerCase().includes('cse') || quiz.targetBranchCodes?.includes('CSE')) {
      return { label, color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (label.toLowerCase().includes('ece') || quiz.targetBranchCodes?.includes('ECE')) {
      return { label, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    return { label, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  // Date countdown helper
  const getCountdownBadge = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      if (isPast(date) && !isToday(date)) {
        return {
          label: 'Completed / Past',
          color: 'bg-slate-100 text-slate-600 border-slate-200',
          badge: 'Past',
        };
      }
      if (isToday(date)) {
        return {
          label: 'Today!',
          color: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
          badge: 'TODAY',
        };
      }
      if (isTomorrow(date)) {
        return {
          label: 'Tomorrow',
          color: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
          badge: 'Tomorrow',
        };
      }
      const days = differenceInDays(date, now);
      if (days <= 5) {
        return {
          label: `In ${days} days`,
          color: 'bg-blue-50 text-blue-800 border-blue-200 font-semibold',
          badge: `${days}d left`,
        };
      }
      return {
        label: `In ${days} days`,
        color: 'bg-purple-50 text-purple-700 border-purple-200 font-medium',
        badge: `${days}d left`,
      };
    } catch {
      return {
        label: dateStr,
        color: 'bg-slate-100 text-slate-600 border-slate-200',
        badge: dateStr,
      };
    }
  };

  // Add Quiz Handler with Batch Targeting
  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageQuizzes) return;
    if (!newTitle.trim() || !newSubject.trim() || !newDate) return;

    let targetType = 'specific_branches';
    let targetBranchCodes: string[] = [];
    let targetYear = year || 1;
    let targetSection = section || 'ALL';
    let targetLabel = '';

    const preset = TARGET_PRESETS.find(p => p.id === selectedPresetId);
    if (preset && preset.id !== 'custom') {
      targetType = preset.type;
      targetBranchCodes = preset.branches;
      targetYear = preset.year;
      targetSection = preset.section;
      targetLabel = preset.label;
    } else {
      targetType = 'specific_branches';
      targetBranchCodes = customBranches.length > 0 ? customBranches : ['ALL'];
      targetYear = customYear;
      targetSection = customSection;
      targetLabel = `${targetBranchCodes.join(' & ')} Year ${targetYear}${targetSection !== 'ALL' ? ` (Sec ${targetSection})` : ''}`;
    }

    const resolvedBranchId = branchId || currentUser?.branchId || currentUser?.branch_id || '1';
    const payload = {
      branchId: resolvedBranchId,
      year: targetYear,
      section: targetSection,
      targetType,
      targetBranchCodes,
      targetLabel,
      targetPresetId: selectedPresetId,
      title: newTitle.trim(),
      subject: newSubject.trim(),
      date: newDate,
      time: newTime.trim() || '10:00 AM – 11:00 AM',
      room: newRoom.trim() || 'Academic Block',
      totalMarks: newMarks ? parseInt(newMarks) : 25,
      weightage: newWeightage.trim() || '10%',
      description: newDesc.trim() || undefined,
      status: 'upcoming',
    };

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to schedule quiz');
        return;
      }
      if (data.quiz) {
        const created: QuizItem = {
          id: data.quiz._id || `quiz-${Date.now()}`,
          ...payload,
          status: 'upcoming',
        };
        setQuizzes(prev => [created, ...prev]);
      }
    } catch {
      alert('Failed to schedule quiz');
      return;
    }

    setShowAddModal(false);
    setNewTitle('');
    setNewSubject('');
    setNewDate('');
    setNewTime('');
    setNewRoom('');
    setNewMarks('');
    setNewWeightage('');
    setNewDesc('');
  };

  // Delete Quiz
  const handleDeleteQuiz = async (id: string) => {
    if (!canManageQuizzes) return;
    try {
      const res = await fetch(`/api/quizzes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setQuizzes(prev => prev.filter(q => q.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete quiz');
      }
    } catch {
      alert('Failed to delete quiz');
    }
  };

  // Edit Quiz
  const startEditing = (quiz: QuizItem) => {
    if (!canManageQuizzes) return;
    setEditingQuizId(quiz.id);
    setEditTitle(quiz.title);
    setEditSubject(quiz.subject);
    setEditDate(quiz.date);
    setEditTime(quiz.time || '');
    setEditRoom(quiz.room || '');
    setEditDesc(quiz.description || '');
    setEditTargetLabel(quiz.targetLabel || '');
  };

  const saveEditing = async (id: string) => {
    if (!canManageQuizzes) return;
    if (!editTitle.trim()) return;

    try {
      const res = await fetch('/api/quizzes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: editTitle.trim(),
          subject: editSubject.trim(),
          date: editDate,
          time: editTime.trim(),
          room: editRoom.trim(),
          description: editDesc.trim(),
          targetLabel: editTargetLabel.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update quiz');
        return;
      }

      setQuizzes(prev =>
        prev.map(q =>
          q.id === id
            ? {
                ...q,
                title: editTitle.trim(),
                subject: editSubject.trim(),
                date: editDate,
                time: editTime.trim(),
                room: editRoom.trim(),
                description: editDesc.trim(),
                targetLabel: editTargetLabel.trim() || q.targetLabel,
              }
            : q
        )
      );
    } catch {
      alert('Failed to update quiz');
      return;
    }

    setEditingQuizId(null);
  };

  // Filter and sort quizzes
  const filteredAndSortedQuizzes = useMemo(() => {
    const list = quizzes.filter(q => {
      if (selectedSubject !== 'all' && q.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }
      if (selectedTargetFilter !== 'all') {
        const label = (q.targetLabel || '').toLowerCase();
        const codes = (q.targetBranchCodes || []).map(c => c.toUpperCase());
        const isAll1stYears =
          q.targetType === 'all_first_years' ||
          label.includes('all 1st') ||
          label.includes('all first') ||
          (q.year === 1 && (codes.includes('ALL') || (codes.includes('CSE') && codes.includes('ECE'))));

        if (selectedTargetFilter === 'all_first_years' && !isAll1stYears) {
          return false;
        }
        if (selectedTargetFilter === 'aids') {
          const matches = isAll1stYears || codes.includes('AI&DS') || codes.includes('AIDS') || label.includes('ai&ds') || label.includes('aids') || codes.includes('ALL');
          if (!matches) return false;
        }
        if (selectedTargetFilter === 'cse') {
          const matches = isAll1stYears || codes.includes('CSE') || label.includes('cse') || codes.includes('ALL');
          if (!matches) return false;
        }
        if (selectedTargetFilter === 'ece') {
          // ECE 1st year are part of all 1st years!
          const matches = isAll1stYears || codes.includes('ECE') || label.includes('ece') || codes.includes('ALL');
          if (!matches) return false;
        }
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = q.title.toLowerCase().includes(query);
        const matchesSubject = q.subject.toLowerCase().includes(query);
        const matchesTarget = (q.targetLabel || '').toLowerCase().includes(query);
        const matchesDesc = q.description ? q.description.toLowerCase().includes(query) : false;
        const matchesRoom = q.room ? q.room.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesSubject && !matchesTarget && !matchesDesc && !matchesRoom) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'subject') {
        return a.subject.localeCompare(b.subject);
      }
      if (sortBy === 'weightage') {
        const wA = parseInt(a.weightage || '0');
        const wB = parseInt(b.weightage || '0');
        return wB - wA;
      }
      return 0;
    });
  }, [quizzes, selectedSubject, selectedTargetFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-5">
      {/* Top Filter and Controls Bar */}
      <div className="card p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-600" />
              <span>Upcoming Quizzes & Exams</span>
              <span className="badge bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-semibold">
                {quizzes.length} scheduled
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Targeted batch quizzes, tests, and study readiness tracking
            </p>
          </div>

          {canManageQuizzes ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 self-start sm:self-auto shadow-2xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Batch Quiz</span>
            </button>
          ) : (
            <span className="badge bg-slate-100 text-slate-700 border-slate-200 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto py-1.5 px-3 rounded-xl shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin Scheduled Assessments</span>
            </span>
          )}
        </div>


        {/* Top Dropdowns: Separate Course/Branch and Year filters (when showFilters is true) */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2.5 pb-2 border-b border-slate-100">
            {/* Separate Course / Branch Dropdown */}
            <div className="relative min-w-[170px]">
              <select
                value={branchId}
                onChange={e => handleBranchChange(e.target.value)}
                className="select-field text-xs pl-3.5 pr-9 py-2 w-full font-medium text-slate-700"
              >
                <option value="">All Courses / Branches</option>
                {branches.map(b => (
                  <option key={b.id || (b as any)._id} value={b.id || (b as any)._id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Separate Year Dropdown */}
            <div className="relative min-w-[140px]">
              <select
                value={year}
                onChange={e => handleYearChange(parseInt(e.target.value))}
                className="select-field text-xs pl-3.5 pr-9 py-2 w-full font-medium text-slate-700"
              >
                {getAllowedYears(branchId).map(y => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>

            {/* Saved preference indicator */}
            {hasSavedPref && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                <BookmarkCheck className="w-3 h-3 text-purple-600" />
                Saved default
              </span>
            )}
          </div>
        )}

        {/* Toolbar: Search, Subject Filter, Target Audience Filter & Sort */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-3 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search quiz topic or batch..."
              className="input-field text-xs pl-9 py-2"
            />
          </div>

          {/* Target Audience Batch Filter */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Users className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedTargetFilter}
                onChange={e => setSelectedTargetFilter(e.target.value)}
                className="select-field text-xs pl-9 py-2 w-full font-medium text-slate-700"
              >
                <option value="all">All Target Batches</option>
                <option value="all_first_years">🌟 All 1st Years</option>
                <option value="aids">🤖 AI&DS Targets</option>
                <option value="cse">💻 CSE Targets</option>
                <option value="ece">⚡ ECE Targets</option>
              </select>
            </div>

            {selectedTargetFilter !== 'all' && (
              <button
                onClick={() => setSelectedTargetFilter('all')}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                title="Clear audience filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subject Filter */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="select-field text-xs pl-9 py-2 w-full font-medium text-slate-700"
              >
                <option value="all">All Subjects ({quizzes.length})</option>
                {availableSubjects.map(sub => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {selectedSubject !== 'all' && (
              <button
                onClick={() => setSelectedSubject('all')}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-3 flex items-center justify-end">
            <div className="relative w-full">
              <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="select-field text-xs pl-9 py-2 w-full font-medium text-slate-700 bg-white"
              >
                <option value="date">Date (Earliest first)</option>
                <option value="subject">Subject (A to Z)</option>
                <option value="weightage">Weightage (Highest)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Add Quiz Modal Form with Batch Targeting */}
      {canManageQuizzes && showAddModal && (
        <form
          onSubmit={handleAddQuiz}
          className="card p-5 sm:p-6 bg-gradient-to-br from-purple-50/50 via-white to-slate-50 border-purple-200 space-y-4 animate-slide-up shadow-sm"
        >
          <div className="flex items-center justify-between pb-2 border-b border-purple-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>Schedule Quiz with Target Batch</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Target Batch Selection Presets */}
          <div className="space-y-2 p-3.5 rounded-xl bg-purple-50/40 border border-purple-100">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-purple-600" />
              <span>Select Target Batch / Audience:</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TARGET_PRESETS.map(preset => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-2 rounded-xl text-left border text-xs transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-semibold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <span className="leading-tight">{preset.shortLabel}</span>
                    <span className={`text-[10px] mt-1 ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                      {preset.id === 'all_first_years' ? 'All 1st Years' : preset.id === 'custom' ? 'Pick custom' : `${preset.branches.join(', ')} Y${preset.year}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Batch Config if 'custom' preset is picked */}
            {selectedPresetId === 'custom' && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-fade-in border-t border-purple-100 mt-2">
                {/* Branch selection */}
                <div>
                  <span className="block text-[10px] font-semibold text-slate-600 mb-1">Target Branches:</span>
                  <div className="flex items-center gap-1">
                    {['CSE', 'ECE', 'AI&DS'].map(bCode => {
                      const isChecked = customBranches.includes(bCode);
                      return (
                        <button
                          key={bCode}
                          type="button"
                          onClick={() => {
                            setCustomBranches(prev =>
                              isChecked
                                ? prev.filter(c => c !== bCode)
                                : [...prev, bCode]
                            );
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                            isChecked
                              ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {bCode}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Year */}
                <div>
                  <span className="block text-[10px] font-semibold text-slate-600 mb-1">Target Year:</span>
                  <select
                    value={customYear}
                    onChange={e => setCustomYear(parseInt(e.target.value))}
                    className="select-field text-xs py-1.5"
                  >
                    {[1, 2, 3, 4, 5].map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>

                {/* Target Section */}
                <div>
                  <span className="block text-[10px] font-semibold text-slate-600 mb-1">Target Section:</span>
                  <select
                    value={customSection}
                    onChange={e => setCustomSection(e.target.value)}
                    className="select-field text-xs py-1.5"
                  >
                    <option value="ALL">All Sections (A & B)</option>
                    <option value="A">Section A Only</option>
                    <option value="B">Section B Only</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Quiz Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Quiz 1: Probability & Random Variables"
                className="input-field text-xs"
                required
                autoFocus
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="e.g. Probability, Linear Algebra, DSA"
                className="input-field text-xs"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="input-field text-xs"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time Slot</label>
              <input
                type="text"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                placeholder="10:00 AM – 11:00 AM"
                className="input-field text-xs"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Venue / Room</label>
              <input
                type="text"
                value={newRoom}
                onChange={e => setNewRoom(e.target.value)}
                placeholder="Audi-1 / Room 203"
                className="input-field text-xs"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Total Marks</label>
              <input
                type="number"
                value={newMarks}
                onChange={e => setNewMarks(e.target.value)}
                placeholder="e.g. 25"
                className="input-field text-xs"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Weightage (%)</label>
              <input
                type="text"
                value={newWeightage}
                onChange={e => setNewWeightage(e.target.value)}
                placeholder="e.g. 15%"
                className="input-field text-xs"
              />
            </div>

            <div className="sm:col-span-12">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Syllabus Topics & Key Notes
              </label>
              <textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="List topics to prepare, chapters, or reference material..."
                className="input-field text-xs h-18 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn-secondary text-xs py-2 px-3.5"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary text-xs py-2 px-4">
              Schedule Quiz
            </button>
          </div>
        </form>
      )}

      {/* Quiz Cards Grid */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6 animate-pulse bg-slate-100/70 h-32 rounded-2xl" />
          ))}
        </div>
      ) : filteredAndSortedQuizzes.length === 0 ? (
        <div className="card py-16 px-6 text-center border-dashed border-slate-300">
          <div className="w-14 h-14 rounded-3xl bg-purple-50 text-purple-500 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6 opacity-75" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No quizzes found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedSubject !== 'all' || selectedTargetFilter !== 'all'
              ? 'No quizzes match your filter criteria.'
              : 'You have no upcoming quizzes scheduled for this batch!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredAndSortedQuizzes.map(quiz => {
            const isEditing = editingQuizId === quiz.id;
            const countdown = getCountdownBadge(quiz.date);
            const targetBadge = getTargetBadge(quiz);
            const currentPrep = prepMap[quiz.id] || 'not_started';

            if (isEditing) {
              return (
                <div
                  key={quiz.id}
                  className="card p-5 bg-purple-50/40 border-purple-300 space-y-3 shadow-xs animate-scale-in"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-purple-600" /> Edit Quiz
                    </span>
                    <button onClick={() => setEditingQuizId(null)} className="text-slate-400 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Quiz Title"
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        placeholder="Subject"
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={editTargetLabel}
                        onChange={e => setEditTargetLabel(e.target.value)}
                        placeholder="Target Batch (e.g. AI&DS Year 1 Only)"
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={editTime}
                        onChange={e => setEditTime(e.target.value)}
                        placeholder="Time slot"
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={editRoom}
                        onChange={e => setEditRoom(e.target.value)}
                        placeholder="Venue"
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="sm:col-span-12">
                      <textarea
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        placeholder="Syllabus topics..."
                        className="input-field text-xs h-16 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingQuizId(null)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEditing(quiz.id)}
                      className="btn-primary text-xs py-1.5 px-3.5"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={quiz.id}
                className="card p-5 sm:p-6 card-hover relative overflow-hidden transition-all duration-200 border-l-4 border-l-purple-500"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Info, Subject, Target Batch, Title, Topics */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Target Audience Badge */}
                      <span className={`badge border text-[11px] font-bold ${targetBadge.color} flex items-center gap-1`}>
                        <Target className="w-3 h-3 inline-block" />
                        <span>{targetBadge.label}</span>
                      </span>

                      {/* Countdown badge */}
                      <span className={`badge border text-xs ${countdown.color}`}>
                        <Clock className="w-3 h-3 mr-0.5 inline-block" />
                        {countdown.label} • {format(new Date(quiz.date), 'MMM d, yyyy')}
                      </span>

                      {/* Subject */}
                      <span className="badge bg-slate-100 text-slate-700 border-slate-200">
                        {quiz.subject}
                      </span>

                      {/* Weightage & Marks */}
                      {quiz.weightage && (
                        <span className="badge bg-amber-50 text-amber-800 border-amber-200 font-semibold text-[10px]">
                          <Award className="w-2.5 h-2.5 mr-0.5" />
                          Weight: {quiz.weightage}
                        </span>
                      )}

                      {quiz.totalMarks && (
                        <span className="badge bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                          {quiz.totalMarks} Marks
                        </span>
                      )}

                      <span className="badge bg-slate-50 text-slate-500 border-slate-200 text-[10px] font-medium flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5 text-purple-600" />
                        Admin Scheduled
                      </span>
                    </div>


                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {quiz.title}
                    </h3>

                    {/* Description / Topics */}
                    {quiz.description && (
                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {quiz.description}
                      </p>
                    )}

                    {/* Venue & Time slot */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      {quiz.time && (
                        <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          {quiz.time}
                        </span>
                      )}

                      {quiz.room && (
                        <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-purple-600" />
                          {quiz.room}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Study Preparation Tracker & Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    {/* Preparation Status Button Toggle */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          savePrepStatus(
                            quiz.id,
                            currentPrep === 'ready'
                              ? 'not_started'
                              : currentPrep === 'preparing'
                              ? 'ready'
                              : 'preparing'
                          )
                        }
                        className={`text-xs px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition-all ${
                          currentPrep === 'ready'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : currentPrep === 'preparing'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                        title="Click to toggle study prep status"
                      >
                        {currentPrep === 'ready' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready / Mastered
                          </>
                        ) : currentPrep === 'preparing' ? (
                          <>
                            <BookOpen className="w-3.5 h-3.5" /> In Prep
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5" /> Start Prep
                          </>
                        )}
                      </button>
                    </div>

                    {canManageQuizzes && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditing(quiz)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Edit quiz"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete quiz"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
