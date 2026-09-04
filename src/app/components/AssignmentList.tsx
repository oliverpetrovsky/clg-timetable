'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Filter, 
  Search, 
  Check, 
  RefreshCw,
  Sparkles,
  Layers,
  Calendar,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import NotionSyncModal from './NotionSyncModal';
import { getUserPreference, saveUserPreference } from '@/lib/userPreferences';

interface Assignment {
  id: number;
  branch_id: number;
  year: number;
  subject: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  status: 'active' | 'completed' | 'cancelled' | string;
  branch_name: string;
  branch_code: string;
  created_by_name: string;
  targetType?: string;
  targetBranchCodes?: string[];
  targetLabel?: string;
  // User tracking status (merged if available)
  user_status?: 'pending' | 'in_progress' | 'completed';
}

interface Branch {
  id: number;
  name: string;
  code: string;
}

const PRIORITY_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  low: { badge: 'badge-low', dot: 'bg-slate-400', label: 'Low' },
  medium: { badge: 'badge-medium', dot: 'bg-blue-500', label: 'Medium' },
  high: { badge: 'badge-high', dot: 'bg-amber-500', label: 'High' },
  urgent: { badge: 'badge-urgent', dot: 'bg-rose-500', label: 'Urgent' },
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

interface AssignmentListProps {
  initialBranchId?: string | number;
  initialYear?: number;
  initialSection?: string;
  showFilters?: boolean;
  showTrackButton?: boolean;
  onTrackChange?: () => void;
}

export default function AssignmentList({
  initialBranchId,
  initialYear,
  initialSection,
  showFilters = true,
  showTrackButton = false,
  onTrackChange,
}: AssignmentListProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [branchId, setBranchId] = useState<string | number>(initialBranchId || '');
  const [year, setYear] = useState<number>(initialYear || 1);
  const [section, setSection] = useState<string>(initialSection || '');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'subject' | 'title'>('dueDate');
  const [trackedMap, setTrackedMap] = useState<Record<number, string>>({});
  const [showNotionModal, setShowNotionModal] = useState(false);

  // Sync with incoming props when user or parent updates
  useEffect(() => {
    if (initialBranchId) {
      setBranchId(initialBranchId);
    }
    if (initialYear) {
      setYear(initialYear);
    }
    if (initialSection !== undefined) {
      setSection(initialSection);
    }
  }, [initialBranchId, initialYear, initialSection]);

  // Fetch branches and batches, load preference from cookies if no initial props
  useEffect(() => {
    Promise.all([
      fetch('/api/branches').then(res => res.json()),
      fetch('/api/batches').then(res => res.json()),
    ]).then(([branchData, batchData]) => {
      const list = (branchData.branches || []).filter((b: any) => ['CSE', 'ECE', 'AI&DS'].includes(b.code));
      setBranches(list);
      setBatches((batchData.batches || []).filter((b: any) => ['CSE', 'ECE', 'AI&DS'].includes(b.branchCode)));

      if (!initialBranchId && list.length > 0) {
        const saved = getUserPreference();
        if (saved && saved.branchId && list.some((b: any) => String(b.id) === String(saved.branchId) || String(b._id) === String(saved.branchId))) {
          setBranchId(saved.branchId);
          if (saved.year) setYear(Number(saved.year));
          if (saved.section) setSection(saved.section);
          return;
        }

        fetch('/api/auth/me')
          .then(r => r.json())
          .then(data => {
            if (data.user?.branchId) {
              setBranchId(data.user.branchId);
              if (data.user.year) setYear(Number(data.user.year));
              if (data.user.section) setSection(data.user.section);
            } else {
              setBranchId(list[0].id || list[0]._id);
            }
          })
          .catch(() => {
            setBranchId(list[0].id || list[0]._id);
          });
      }
    });

    // Listen to sync events from other tabs / dropdowns
    const handlePrefChange = (e: any) => {
      if (initialBranchId) return;
      const detail = e.detail;
      if (detail && detail.branchId) {
        setBranchId(detail.branchId);
        if (detail.year) setYear(Number(detail.year));
        if (detail.section) setSection(detail.section);
      }
    };
    window.addEventListener('clg_pref_changed', handlePrefChange);
    return () => window.removeEventListener('clg_pref_changed', handlePrefChange);
  }, [initialBranchId]);

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

  const handleBranchChange = (newBranchId: any) => {
    setBranchId(newBranchId);
    const allowed = getAllowedYears(newBranchId);
    let newYear = year;
    if (!allowed.some(y => y.value === newYear)) {
      newYear = allowed[0]?.value || 1;
      setYear(newYear);
    }
    const branch = branches.find(b => String(b.id || (b as any)._id) === String(newBranchId));
    saveUserPreference({ branchId: String(newBranchId), branchCode: branch?.code, year: newYear, section });
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    const branch = branches.find(b => String(b.id || (b as any)._id) === String(branchId));
    saveUserPreference({ branchId: String(branchId), branchCode: branch?.code, year: newYear, section });
  };

  // Fetch tracking data if track button is enabled
  const fetchTracking = () => {
    if (!showTrackButton) return;
    fetch('/api/assignments/track')
      .then(res => res.json())
      .then(data => {
        const map: Record<number, string> = {};
        (data.tracking || []).forEach((t: any) => {
          map[t.assignment_id] = t.status;
        });
        setTrackedMap(map);
      })
      .catch(() => {});
  };

  // Fetch assignments for the selected/provided branch, year, and section
  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    const secParam = section ? `&section=${encodeURIComponent(section)}` : '';
    fetch(`/api/assignments?branchId=${branchId}&year=${year}${secParam}`)
      .then(res => res.json())
      .then(data => {
        setAssignments(data.assignments || []);
        setLoading(false);
        fetchTracking();
      })
      .catch(() => setLoading(false));
  }, [branchId, year, section]);

  // Track status update
  const trackAssignment = async (assignmentId: number, newStatus: string) => {
    // Optimistic UI update
    setTrackedMap(prev => ({ ...prev, [assignmentId]: newStatus }));

    try {
      await fetch('/api/assignments/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, status: newStatus }),
      });
      if (onTrackChange) onTrackChange();
    } catch {
      // Revert if error
      fetchTracking();
    }
  };

  // Due date formatter & urgency helper
  const getDueDateInfo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      if (isPast(date) && !isToday(date)) {
        return { label: 'Overdue', className: 'text-rose-600 font-semibold bg-rose-50 border-rose-200' };
      }
      if (isToday(date)) {
        return { label: 'Due Today', className: 'text-amber-700 font-semibold bg-amber-50 border-amber-200 animate-pulse' };
      }
      if (isTomorrow(date)) {
        return { label: 'Due Tomorrow', className: 'text-amber-600 font-medium bg-amber-50/70 border-amber-200' };
      }
      const days = differenceInDays(date, now);
      if (days <= 3) {
        return { label: `${days} days left`, className: 'text-amber-600 font-medium bg-amber-50/50 border-amber-100' };
      }
      return { label: `${days} days left`, className: 'text-slate-600 font-normal bg-slate-100 border-slate-200' };
    } catch {
      return { label: dateStr, className: 'text-slate-600 bg-slate-100 border-slate-200' };
    }
  };

  // Filtered and sorted assignments
  const filteredAssignments = useMemo(() => {
    const list = assignments.filter(item => {
      // Priority filter
      if (selectedPriority !== 'all' && item.priority !== selectedPriority) return false;
      // Search query
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });

    return list.sort((a, b) => {
      // Completed status (tracked)
      const statusA = trackedMap[a.id] || 'pending';
      const statusB = trackedMap[b.id] || 'pending';
      if (statusA === 'completed' && statusB !== 'completed') return 1;
      if (statusA !== 'completed' && statusB === 'completed') return -1;

      if (sortBy === 'priority') {
        const pA = PRIORITY_ORDER[a.priority] || 2;
        const pB = PRIORITY_ORDER[b.priority] || 2;
        if (pA !== pB) return pB - pA;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }

      if (sortBy === 'dueDate') {
        const diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (diff !== 0) return diff;
        const pA = PRIORITY_ORDER[a.priority] || 2;
        const pB = PRIORITY_ORDER[b.priority] || 2;
        return pB - pA;
      }

      if (sortBy === 'subject') {
        return a.subject.localeCompare(b.subject);
      }

      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }

      return 0;
    });
  }, [assignments, selectedPriority, searchQuery, sortBy, trackedMap]);

  // Prepare tasks for Notion sync
  const tasksForNotion = useMemo(() => {
    return filteredAssignments.map(a => ({
      id: a.id,
      title: a.title,
      subject: a.subject,
      dueDate: a.due_date,
      priority: a.priority,
      status: trackedMap[a.id] || 'pending',
      description: a.description,
    }));
  }, [filteredAssignments, trackedMap]);

  return (
    <div className="space-y-6">
      
      {/* Top Filter and Actions Bar */}
      <div className="card p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
          {/* Left: Branch, Year and Priority Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {showFilters ? (
              <>
                {/* Branch Select */}
                <div className="relative min-w-[170px]">
                  <select
                    value={branchId}
                    onChange={e => handleBranchChange(e.target.value)}
                    className="select-field text-xs pl-3.5 pr-9 py-2 w-full font-medium text-slate-700"
                  >
                    <option value={0}>Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Select */}
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
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="badge badge-lecture text-xs font-bold py-1 px-2.5">
                  {branches.find(b => String(b.id || (b as any)._id) === String(branchId))?.code || 'Branch'} • Year {year}
                </span>
                {section && (
                  <span className="badge badge-lab text-xs font-semibold py-1 px-2">
                    Sec {section}
                  </span>
                )}
              </div>
            )}

            {/* Priority Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['all', 'urgent', 'high', 'medium', 'low'].map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg capitalize transition-all ${
                    selectedPriority === p
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Sort By, Search & Notion Sync */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Sort Selector */}
            <div className="relative min-w-[165px] flex-1 sm:flex-none">
              <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="select-field text-xs pl-9 pr-9 py-2 w-full font-medium text-slate-700 bg-white"
              >
                <option value="dueDate">Due Date (Closest)</option>
                <option value="priority">Priority (Urgent)</option>
                <option value="subject">Subject (A to Z)</option>
                <option value="title">Title (A to Z)</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search assignments..."
                className="input-field text-xs pl-9 py-2"
              />
            </div>

            {/* Notion Sync Button */}
            {filteredAssignments.length > 0 && (
              <button
                onClick={() => setShowNotionModal(true)}
                className="btn-secondary text-xs py-2 px-3 shrink-0 flex items-center gap-1.5"
                title="Sync assignments to Notion"
              >
                <span className="w-3.5 h-3.5 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[9px]">
                  N
                </span>
                <span>Sync Notion</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Cards Grid */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6 animate-pulse bg-slate-100/70 h-32 rounded-2xl" />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="card py-16 px-6 text-center border-dashed border-slate-300">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No assignments found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedPriority !== 'all'
              ? 'Try adjusting your search or priority filter.'
              : 'All caught up! There are no assignments posted for this section right now.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredAssignments.map(assignment => {
            const dueInfo = getDueDateInfo(assignment.due_date);
            const priorityConf = PRIORITY_CONFIG[assignment.priority] || PRIORITY_CONFIG.medium;
            const currentTrackStatus = trackedMap[assignment.id] || 'pending';
            const isCompleted = currentTrackStatus === 'completed';
            const isInProgress = currentTrackStatus === 'in_progress';

            return (
              <div
                key={assignment.id}
                className={`card p-5 sm:p-6 transition-all duration-200 ${
                  isCompleted ? 'bg-slate-50/60 border-slate-200 opacity-80' : 'card-hover'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  
                  {/* Left Column: Title, Subject, Description */}
                  <div className="flex-1 space-y-2">
                    
                    {/* Badges Ribbon */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${priorityConf.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
                        {priorityConf.label} Priority
                      </span>

                      <span className="badge bg-slate-100 text-slate-700 border-slate-200/80">
                        {assignment.subject}
                      </span>

                      {assignment.targetLabel && (
                        <span className="badge bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-semibold">
                          🎯 {assignment.targetLabel}
                        </span>
                      )}

                      {/* Due date pill */}
                      <span className={`badge border text-xs ${dueInfo.className}`}>
                        <Clock className="w-3 h-3 mr-0.5" />
                        {dueInfo.label} • {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-base font-semibold text-slate-900 tracking-tight ${
                      isCompleted ? 'line-through text-slate-500' : ''
                    }`}>
                      {assignment.title}
                    </h3>

                    {/* Description */}
                    {assignment.description && (
                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {assignment.description}
                      </p>
                    )}

                    {/* Attribution */}
                    {assignment.created_by_name && (
                      <p className="text-[11px] text-slate-400 pt-1">
                        Posted by {assignment.created_by_name}
                      </p>
                    )}

                  </div>

                  {/* Right Column: Tracking & Actions */}
                  {showTrackButton && (
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <div className="flex items-center gap-1.5">
                        
                        {/* In Progress Button */}
                        <button
                          onClick={() => trackAssignment(assignment.id, isInProgress ? 'pending' : 'in_progress')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                            isInProgress
                              ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                          }`}
                          title="Mark In Progress"
                        >
                          {isInProgress ? 'In Progress' : 'Start'}
                        </button>

                        {/* Complete Button */}
                        <button
                          onClick={() => trackAssignment(assignment.id, isCompleted ? 'pending' : 'completed')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            isCompleted
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                          }`}
                          title="Mark Completed"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {isCompleted ? 'Done' : 'Done'}
                        </button>

                      </div>

                      <span className="text-[10px] text-slate-400 capitalize">
                        Status: <strong className="text-slate-700">{currentTrackStatus.replace('_', ' ')}</strong>
                      </span>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notion Sync Modal */}
      <NotionSyncModal
        isOpen={showNotionModal}
        onClose={() => setShowNotionModal(false)}
        tasksToSync={tasksForNotion}
      />

    </div>
  );
}
