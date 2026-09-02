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
  ChevronLeft,
  Search,
  BookmarkCheck,
  Calendar,
  Grid3X3,
  List,
  GraduationCap,
  Award,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';

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

interface AcademicEvent {
  id: string;
  type: 'assignment' | 'quiz' | 'class';
  title: string;
  subject: string;
  date: string;
  time?: string;
  room?: string;
  priority?: string;
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

  // View modes: Daily, Weekly, Monthly
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Month navigation for Monthly view
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());

  // Additional events (assignments & quizzes) for Monthly calendar integration
  const [monthAssignments, setMonthAssignments] = useState<any[]>([]);
  const [monthQuizzes, setMonthQuizzes] = useState<any[]>([]);

  // Default to current day of week (Monday=0, ..., Sunday=6)
  const currentDayIndex = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }, []);

  const [activeDay, setActiveDay] = useState(currentDayIndex > 5 ? 0 : currentDayIndex);
  const [batches, setBatches] = useState<any[]>([]);

  // Load saved preference from cookie / localStorage on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/batches').then(r => r.json()),
    ])
      .then(([branchData, batchData]) => {
        const list = (branchData.branches || []).filter((b: any) => ['CSE', 'ECE', 'AI&DS'].includes(b.code));
        setBranches(list);
        setBatches((batchData.batches || []).filter((b: any) => ['CSE', 'ECE', 'AI&DS'].includes(b.branchCode)));

        if (!initialBranchId && list.length > 0) {
          try {
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

  // Persist preference to cookies
  const savePreferenceCookie = (bId: string, y: number, s: string) => {
    if (!bId) return;
    try {
      const pref = JSON.stringify({ branchId: bId, year: y, section: s });
      document.cookie = `clg_timetable_pref=${encodeURIComponent(pref)}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('clg_timetable_pref', pref);
      setHasSavedPref(true);
    } catch {}
  };

  const getBranchCode = (bId: string) => {
    const b = branches.find(item => String(item.id || (item as any)._id) === String(bId));
    return b ? b.code : '';
  };

  const getAllowedYears = (bId: string) => {
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

  const getAllowedSections = (bId: string, targetYear?: number) => {
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

  const handleBranchChange = (newBranchId: string) => {
    setBranchId(newBranchId);
    const selectedBranch = branches.find(b => String(b.id || (b as any)._id) === String(newBranchId));
    let newSection = section;
    let newYear = year;
    if (selectedBranch) {
      if (selectedBranch.code === 'CSE') {
        newSection = 'A';
      } else if (selectedBranch.code === 'ECE' || selectedBranch.code === 'AI&DS') {
        newSection = 'B';
      }
      if (selectedBranch.code === 'AI&DS' && newYear > 3) {
        newYear = 1;
        setYear(1);
      }
      setSection(newSection);
    }
    savePreferenceCookie(newBranchId, newYear, newSection);
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

    // Fetch assignments and quizzes for monthly calendar events
    const secParam = section ? `&section=${encodeURIComponent(section)}` : '';
    fetch(`/api/assignments?branchId=${branchId}&year=${year}${secParam}`)
      .then(res => res.json())
      .then(data => setMonthAssignments(data.assignments || []))
      .catch(() => {});

    fetch(`/api/quizzes?branchId=${branchId}&year=${year}${secParam}`)
      .then(res => res.json())
      .then(data => setMonthQuizzes(data.quizzes || []))
      .catch(() => {});
  }, [branchId, year, section]);

  // Compute duration
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

  // Check if a class is happening right now
  const isClassNow = (dayIndex: number, start: string, end: string) => {
    if (dayIndex !== currentDayIndex) return false;
    const now = new Date();
    const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return curTime >= start && curTime <= end;
  };

  // Filter entries for currently selected day & search query (Daily View)
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

  // Weekly entries grouped by day (0=Mon to 5=Sat)
  const weeklyEntriesByDay = useMemo(() => {
    const daysMap: Record<number, TimetableEntry[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    entries.forEach(e => {
      const day = e.day_of_week;
      if (day >= 0 && day <= 5) {
        if (!searchQuery.trim()) {
          daysMap[day].push(e);
        } else {
          const q = searchQuery.toLowerCase().trim();
          if (
            e.subject.toLowerCase().includes(q) ||
            (e.teacher && e.teacher.toLowerCase().includes(q)) ||
            (e.room && e.room.toLowerCase().includes(q))
          ) {
            daysMap[day].push(e);
          }
        }
      }
    });

    // Sort each day by start time
    Object.keys(daysMap).forEach(k => {
      daysMap[Number(k)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return daysMap;
  }, [entries, searchQuery]);

  // Monthly Calendar Matrix Generation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Map events for a specific calendar date
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = (date.getDay() + 6) % 7; // Monday=0, ..., Sunday=6

    // 1. Classes on this day of week
    const classes = dayOfWeek < 6 ? entries.filter(e => e.day_of_week === dayOfWeek) : [];

    // 2. Assignments due on this date
    const assignments = monthAssignments.filter(a => {
      const aDate = a.due_date || a.dueDate;
      return aDate && aDate.startsWith(dateStr);
    });

    // 3. Quizzes on this date
    const quizzes = monthQuizzes.filter(q => {
      const qDate = q.date || q.due_date;
      return qDate && qDate.startsWith(dateStr);
    });

    return { classes, assignments, quizzes };
  };

  const selectedDayEvents = useMemo(() => {
    return getEventsForDate(selectedCalendarDate);
  }, [selectedCalendarDate, entries, monthAssignments, monthQuizzes]);

  return (
    <div className="space-y-6">
      
      {/* Top Filter & View Mode Bar */}
      <div className="card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Filters */}
          {showFilters ? (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Branch Select */}
              <div className="relative min-w-[170px]">
                <select
                  value={branchId}
                  onChange={e => handleBranchChange(e.target.value)}
                  className="select-field text-xs pl-3.5 pr-9 py-2 w-full font-medium text-slate-700"
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id || (b as any)._id} value={b.id || (b as any)._id}>
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

              {/* Section Select */}
              <div className="relative min-w-[140px]">
                <select
                  value={section}
                  onChange={e => handleSectionChange(e.target.value)}
                  className="select-field text-xs pl-3.5 pr-9 py-2 w-full font-medium text-slate-700"
                >
                  {getAllowedSections(branchId).map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {hasSavedPref && (
                <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                  <BookmarkCheck className="w-3 h-3 text-blue-600" />
                  Default
                </span>
              )}
            </div>
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

          {/* Right Actions: View Switcher (Daily / Weekly / Monthly) & Search */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('daily')}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'daily'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Daily schedule view"
              >
                <List className="w-3.5 h-3.5" />
                <span>Daily</span>
              </button>

              <button
                onClick={() => setViewMode('weekly')}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'weekly'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Weekly timetable matrix"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Weekly</span>
              </button>

              <button
                onClick={() => setViewMode('monthly')}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Monthly schedule & deadline calendar"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Monthly</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search class/prof..."
                className="input-field text-xs pl-9 py-2"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DAILY VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'daily' && (
        <div className="space-y-4 animate-fade-in">
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
      )}

      {/* ========================================================================= */}
      {/* 2. WEEKLY VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'weekly' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-blue-600" />
              <span>Weekly Schedule Matrix (Monday – Saturday)</span>
            </h3>
            <span className="text-xs text-slate-500">
              {entries.length} total weekly classes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {DAYS.slice(0, 6).map((dayName, dayIdx) => {
              const dayClasses = weeklyEntriesByDay[dayIdx] || [];
              const isToday = dayIdx === currentDayIndex;

              return (
                <div
                  key={dayName}
                  className={`card p-4 flex flex-col space-y-3 transition-all ${
                    isToday
                      ? 'border-blue-400/90 shadow-md ring-1 ring-blue-500/20 bg-blue-50/10'
                      : 'border-slate-200/90'
                  }`}
                >
                  {/* Day Column Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {SHORT_DAYS[dayIdx]}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {dayName}
                      </h4>
                    </div>
                    {isToday ? (
                      <span className="badge bg-blue-600 text-white text-[9px] font-bold py-0.5 px-2">
                        Today
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                      </span>
                    )}
                  </div>

                  {/* Classes List */}
                  {dayClasses.length === 0 ? (
                    <div className="py-8 text-center flex-1 flex flex-col items-center justify-center">
                      <p className="text-xs text-slate-400">No classes</p>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1">
                      {dayClasses.map(entry => {
                        const isLive = isClassNow(entry.day_of_week, entry.start_time, entry.end_time);
                        const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.lecture;

                        return (
                          <div
                            key={entry.id}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                              isLive
                                ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-500 shadow-2xs'
                                : `${config.bg} ${config.border} hover:shadow-2xs`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={`badge ${
                                entry.type === 'lecture' ? 'badge-lecture' :
                                entry.type === 'lab' ? 'badge-lab' : 'badge-tutorial'
                              } text-[9px] py-0 px-1.5 font-bold`}>
                                {entry.start_time}
                              </span>

                              {isLive && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              )}
                            </div>

                            <p className="font-bold text-slate-900 text-[11px] leading-tight line-clamp-2">
                              {entry.subject}
                            </p>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                              {entry.room && (
                                <span className="truncate max-w-[90px]">{entry.room}</span>
                              )}
                              {entry.teacher && (
                                <span className="truncate max-w-[90px] text-right font-medium">
                                  {entry.teacher.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MONTHLY VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'monthly' && (
        <div className="space-y-5 animate-fade-in">
          
          {/* Month Header Navigation */}
          <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <p className="text-xs text-slate-500">
                  Interactive monthly planner with lectures, quizzes, and assignment deadlines
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="btn-secondary text-xs p-2 rounded-xl"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(now);
                  setSelectedCalendarDate(now);
                }}
                className="btn-secondary text-xs py-2 px-3 font-semibold"
              >
                Today
              </button>

              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="btn-secondary text-xs p-2 rounded-xl"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Monthly Calendar Grid (8 cols on lg) */}
            <div className="lg:col-span-8 card p-4 sm:p-5 space-y-3">
              {/* Day Headers (Mon - Sun) */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                {SHORT_DAYS.map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((dateItem, i) => {
                  const isCurMonth = isSameMonth(dateItem, currentMonth);
                  const isCurrentDay = isSameDay(dateItem, new Date());
                  const isSelectedDay = isSameDay(dateItem, selectedCalendarDate);
                  const { classes, assignments, quizzes } = getEventsForDate(dateItem);
                  const hasEvents = classes.length > 0 || assignments.length > 0 || quizzes.length > 0;

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedCalendarDate(dateItem)}
                      className={`min-h-[72px] sm:min-h-[84px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                        !isCurMonth
                          ? 'bg-slate-50/40 border-slate-100 text-slate-300 opacity-60'
                          : isSelectedDay
                          ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : isCurrentDay
                          ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-400'
                          : 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Date number */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-bold leading-none ${
                            isCurrentDay
                              ? 'w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]'
                              : isSelectedDay
                              ? 'text-blue-700'
                              : isCurMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {format(dateItem, 'd')}
                        </span>
                      </div>

                      {/* Event indicators */}
                      <div className="space-y-0.5 w-full mt-1">
                        {/* Quizzes tag */}
                        {quizzes.length > 0 && (
                          <div className="w-full truncate text-[9px] font-bold px-1 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                            🎓 Quiz ({quizzes.length})
                          </div>
                        )}

                        {/* Assignments tag */}
                        {assignments.length > 0 && (
                          <div className="w-full truncate text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            📝 Due ({assignments.length})
                          </div>
                        )}

                        {/* Classes tag */}
                        {classes.length > 0 && isCurMonth && (
                          <div className="w-full truncate text-[9px] font-medium px-1 py-0.2 rounded bg-slate-100 text-slate-700 hidden sm:block">
                            {classes.length} {classes.length === 1 ? 'class' : 'classes'}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  Quizzes & Exams
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Assignment Deadlines
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Scheduled Classes
                </span>
              </div>
            </div>

            {/* Right: Selected Date Schedule & Tasks Inspector (4 cols on lg) */}
            <div className="lg:col-span-4 card p-4 sm:p-5 space-y-4 flex flex-col">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Selected Date
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  {format(selectedCalendarDate, 'EEEE, MMMM d, yyyy')}
                </h4>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
                {/* 1. Quizzes Section */}
                {selectedDayEvents.quizzes.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                      <span>Quizzes / Exams ({selectedDayEvents.quizzes.length})</span>
                    </h5>
                    {selectedDayEvents.quizzes.map((quiz: any) => (
                      <div
                        key={quiz.id}
                        className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="badge bg-purple-200 text-purple-900 text-[9px] font-bold">
                            {quiz.subject}
                          </span>
                          {quiz.targetLabel && (
                            <span className="badge bg-indigo-100 text-indigo-800 text-[9px] font-bold">
                              🎯 {quiz.targetLabel}
                            </span>
                          )}
                          {quiz.weightage && (
                            <span className="text-[10px] font-semibold text-purple-700">
                              {quiz.weightage}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900">{quiz.title}</p>
                        {quiz.time && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-600" /> {quiz.time} {quiz.room ? `• ${quiz.room}` : ''}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Assignments Due Section */}
                {selectedDayEvents.assignments.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>Assignments Due ({selectedDayEvents.assignments.length})</span>
                    </h5>
                    {selectedDayEvents.assignments.map((assignment: any) => (
                      <div
                        key={assignment.id}
                        className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="badge bg-amber-200 text-amber-900 text-[9px] font-bold">
                            {assignment.subject}
                          </span>
                          <span className="text-[10px] capitalize font-medium text-amber-800">
                            {assignment.priority} Priority
                          </span>
                        </div>
                        <p className="font-bold text-slate-900">{assignment.title}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Classes Section */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lectures & Labs ({selectedDayEvents.classes.length})</span>
                  </h5>

                  {selectedDayEvents.classes.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400 border border-slate-100">
                      No classes scheduled on this day
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedDayEvents.classes.map(entry => (
                        <div
                          key={entry.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{entry.subject}</p>
                            <p className="text-[10px] text-slate-400">
                              {entry.teacher || 'Prof'} {entry.room ? `• ${entry.room}` : ''}
                            </p>
                          </div>
                          <span className="badge bg-white text-slate-700 border border-slate-200 font-mono text-[10px] shrink-0">
                            {entry.start_time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
