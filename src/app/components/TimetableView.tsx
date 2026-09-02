'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  Filter, 
  CalendarDays, 
  Sparkles,
  Layers,
  ChevronRight,
  Search,
  BookmarkCheck
} from 'lucide-react';

interface TimetableEntry {
  id: string;
  branch_id: string;
  year: number;
  section: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string | null;
  room: string | null;
  type: 'lecture' | 'lab' | 'tutorial' | 'break' | string;
  branch_name: string;
  branch_code: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TYPE_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; accent: string }> = {
  lecture: {
    bg: 'bg-blue-50/60',
    text: 'text-blue-700',
    border: 'border-blue-200/80',
    accent: 'bg-blue-600',
    label: 'Lecture',
  },
  lab: {
    bg: 'bg-emerald-50/60',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    accent: 'bg-emerald-600',
    label: 'Lab Session',
  },
  tutorial: {
    bg: 'bg-purple-50/60',
    text: 'text-purple-700',
    border: 'border-purple-200/80',
    accent: 'bg-purple-600',
    label: 'Tutorial',
  },
  break: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200/80',
    accent: 'bg-slate-400',
    label: 'Break',
  },
};

interface TimetableViewProps {
  initialBranchId?: string | number;
  initialYear?: number;
  initialSection?: string;
  showFilters?: boolean;
}

export default function TimetableView({
  initialBranchId,
  initialYear,
  initialSection,
  showFilters = true,
}: TimetableViewProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [branchId, setBranchId] = useState<string>(initialBranchId ? String(initialBranchId) : '');
  const [year, setYear] = useState<number>(initialYear || 1);
  const [section, setSection] = useState<string>(initialSection || 'A');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSavedPref, setHasSavedPref] = useState(false);

  // Default to current day of week (Monday=0, ..., Sunday=6)
  const currentDayIndex = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }, []);

  const [activeDay, setActiveDay] = useState(currentDayIndex > 5 ? 0 : currentDayIndex);

  // Load saved preference from cookie / localStorage on mount
  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        const list = data.branches || [];
        setBranches(list);

        if (!initialBranchId && list.length > 0) {
          try {
            // Read cookie
            const match = document.cookie.match(/clg_timetable_pref=([^;]+)/);
            const savedStr = match ? decodeURIComponent(match[1]) : localStorage.getItem('clg_timetable_pref');
            if (savedStr) {
              const saved = JSON.parse(savedStr);
              if (saved.branchId && list.some((b: any) => String(b.id) === String(saved.branchId) || String(b._id) === String(saved.branchId))) {
                setBranchId(String(saved.branchId));
                if (saved.year) setYear(Number(saved.year));
                if (saved.section) setSection(String(saved.section));
                setHasSavedPref(true);
                return;
              }
            }
          } catch {}
          setBranchId(String(list[0].id || list[0]._id));
        }
      })
      .catch(() => {});
  }, [initialBranchId]);

  // Persist preference to cookies when filters change
  const savePreferenceCookie = (bId: string, y: number, s: string) => {
    if (!bId) return;
    try {
      const pref = JSON.stringify({ branchId: bId, year: y, section: s });
      document.cookie = `clg_timetable_pref=${encodeURIComponent(pref)}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('clg_timetable_pref', pref);
      setHasSavedPref(true);
    } catch {}
  };

  const handleBranchChange = (newBranchId: string) => {
    setBranchId(newBranchId);
    const selectedBranch = branches.find(b => String(b.id || (b as any)._id) === String(newBranchId));
    let newSection = section;
    if (selectedBranch) {
      if (selectedBranch.code === 'CSE') {
        newSection = 'A';
      } else if (selectedBranch.code === 'ECE' || selectedBranch.code === 'AI&DS') {
        newSection = 'B';
      }
      setSection(newSection);
    }
    savePreferenceCookie(newBranchId, year, newSection);
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    savePreferenceCookie(branchId, newYear, section);
  };

  const handleSectionChange = (newSection: string) => {
    setSection(newSection);
    savePreferenceCookie(branchId, year, newSection);
  };

  // Fetch timetable entries
  useEffect(() => {
    if (!branchId) return;

    setLoading(true);
    fetch(`/api/timetable?branchId=${branchId}&year=${year}&section=${section}`)
      .then(res => res.json())
      .then(data => {
        setEntries(data.entries || []);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [branchId, year, section]);

  // Filter entries for currently selected day & search query
  const dayEntries = useMemo(() => {
    return entries.filter(e => {
      const matchDay = (e.day_of_week ?? e.day_of_week) === activeDay;
      if (!matchDay) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.subject.toLowerCase().includes(q) ||
        (e.teacher && e.teacher.toLowerCase().includes(q)) ||
        (e.room && e.room.toLowerCase().includes(q))
      );
    });
  }, [entries, activeDay, searchQuery]);

  // Compute duration in human format
  const getDuration = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins >= 60) {
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hr${hrs > 1 ? 's' : ''}`;
      }
      return `${diffMins} min`;
    } catch {
      return '';
    }
  };

  // Check if a class is happening right now (on current active day)
  const isClassNow = (dayIndex: number, start: string, end: string) => {
    if (dayIndex !== currentDayIndex) return false;
    const now = new Date();
    const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return curTime >= start && curTime <= end;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Filter Bar */}
      {showFilters && (
        <div className="card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              Filter By:
            </div>

            {/* Branch Select */}
            <select
              value={branchId}
              onChange={e => handleBranchChange(e.target.value)}
              className="select-field text-xs py-2 min-w-[200px]"
            >
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b.id || (b as any)._id} value={b.id || (b as any)._id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={year}
              onChange={e => handleYearChange(parseInt(e.target.value))}
              className="select-field text-xs py-2 w-32"
            >
              <option value={1}>Year 1</option>
              <option value={2}>Year 2</option>
              <option value={3}>Year 3</option>
              <option value={4}>Year 4 (iMTech)</option>
              <option value={5}>Year 5 (iMTech)</option>
            </select>

            {/* Section Select */}
            <select
              value={section}
              onChange={e => handleSectionChange(e.target.value)}
              className="select-field text-xs py-2 min-w-[140px]"
            >
              <option value="A">Section A (CSE)</option>
              <option value="B">Section B (ECE & AI&DS)</option>
            </select>

            {hasSavedPref && (
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                <BookmarkCheck className="w-3 h-3 text-blue-600" />
                Saved default
              </span>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search subject or prof..."
              className="input-field text-xs pl-8 py-2"
            />
          </div>
        </div>
      )}

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DAYS.slice(0, 6).map((dayName, idx) => {
          const isToday = idx === currentDayIndex;
          const isSelected = activeDay === idx;
          const count = entries.filter(e => e.day_of_week === idx).length;

          return (
            <button
              key={dayName}
              onClick={() => setActiveDay(idx)}
              className={`flex-1 min-w-[105px] py-3 px-3.5 rounded-2xl text-left border transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  isSelected ? 'text-slate-200' : 'text-slate-500'
                }`}>
                  {SHORT_DAYS[idx]}
                </span>
                {isToday && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    Today
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold truncate">{dayName}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count} {count === 1 ? 'class' : 'classes'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Timetable Content Cards */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-5 animate-pulse bg-slate-100/70 h-24 rounded-2xl" />
          ))}
        </div>
      ) : dayEntries.length === 0 ? (
        <div className="card py-16 px-6 text-center border-dashed border-slate-300">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No classes scheduled</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are no classes found for {DAYS[activeDay]}
            {searchQuery ? ` matching "${searchQuery}"` : ' in this branch and section'}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEntries.map((entry) => {
            const isLive = isClassNow(entry.day_of_week, entry.start_time, entry.end_time);
            const duration = getDuration(entry.start_time, entry.end_time);
            const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.lecture;

            return (
              <div
                key={entry.id}
                className={`card p-5 relative overflow-hidden transition-all duration-200 ${
                  isLive ? 'ring-2 ring-emerald-500/50 shadow-md bg-emerald-50/20' : 'card-hover'
                }`}
              >
                {/* Left accent color strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.accent}`} />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Subject and Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${
                        entry.type === 'lecture' ? 'badge-lecture' :
                        entry.type === 'lab' ? 'badge-lab' :
                        entry.type === 'tutorial' ? 'badge-tutorial' : 'badge-break'
                      }`}>
                        {config.label}
                      </span>

                      {isLive && (
                        <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping mr-0.5" />
                          Live Now
                        </span>
                      )}

                      {duration && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          • {duration}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                      {entry.subject}
                    </h3>

                    {/* Teacher & Room tags */}
                    {(entry.teacher || entry.room) && (
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-0.5">
                        {entry.teacher && (
                          <span className="flex items-center gap-1.5 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {entry.teacher}
                          </span>
                        )}
                        {entry.room && (
                          <span className="flex items-center gap-1.5 font-medium text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {entry.room}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Time Badge */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-100/90 text-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{entry.start_time} — {entry.end_time}</span>
                    </div>
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
