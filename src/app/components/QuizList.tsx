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
  Tag
} from 'lucide-react';

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
  branch_name?: string;
  branch_code?: string;
}

interface QuizListProps {
  initialBranchId?: string | number;
  initialYear?: number;
  initialSection?: string;
  showFilters?: boolean;
  onQuizCountChange?: (count: number) => void;
}

export default function QuizList({
  initialBranchId,
  initialYear,
  initialSection,
  showFilters = true,
  onQuizCountChange,
}: QuizListProps) {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [branchId, setBranchId] = useState<string | number>(initialBranchId || '');
  const [year, setYear] = useState<number>(initialYear || 1);
  const [section, setSection] = useState<string>(initialSection || '');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'weightage'>('date');

  // Preparation status tracking (persisted in localStorage)
  const [prepMap, setPrepMap] = useState<Record<string, 'not_started' | 'preparing' | 'ready'>>({});

  // Add Quiz Form
  const [showAddModal, setShowAddModal] = useState(false);
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

  // Sync props
  useEffect(() => {
    if (initialBranchId) setBranchId(initialBranchId);
    if (initialYear) setYear(initialYear);
    if (initialSection !== undefined) setSection(initialSection);
  }, [initialBranchId, initialYear, initialSection]);

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

  // Fetch quizzes
  useEffect(() => {
    setLoading(true);
    const bParam = branchId ? `branchId=${branchId}` : 'branchId=1';
    const yParam = `year=${year}`;
    const sParam = section ? `&section=${encodeURIComponent(section)}` : '';

    fetch(`/api/quizzes?${bParam}&${yParam}${sParam}`)
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

  // Add Quiz Handler
  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSubject.trim() || !newDate) return;

    const payload = {
      branchId: branchId || '1',
      year,
      section: section || 'A',
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
      if (data.quiz) {
        const created: QuizItem = {
          id: data.quiz._id || `quiz-${Date.now()}`,
          ...payload,
          status: 'upcoming',
        };
        setQuizzes(prev => [created, ...prev]);
      }
    } catch {
      // Local fallback
      const created: QuizItem = {
        id: `quiz-local-${Date.now()}`,
        ...payload,
        status: 'upcoming',
      };
      setQuizzes(prev => [created, ...prev]);
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
    setQuizzes(prev => prev.filter(q => q.id !== id));
    try {
      await fetch(`/api/quizzes?id=${id}`, { method: 'DELETE' });
    } catch {}
  };

  // Edit Quiz
  const startEditing = (quiz: QuizItem) => {
    setEditingQuizId(quiz.id);
    setEditTitle(quiz.title);
    setEditSubject(quiz.subject);
    setEditDate(quiz.date);
    setEditTime(quiz.time || '');
    setEditRoom(quiz.room || '');
    setEditDesc(quiz.description || '');
  };

  const saveEditing = async (id: string) => {
    if (!editTitle.trim()) return;

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
            }
          : q
      )
    );

    try {
      await fetch('/api/quizzes', {
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
        }),
      });
    } catch {}

    setEditingQuizId(null);
  };

  // Filter and sort quizzes
  const filteredAndSortedQuizzes = useMemo(() => {
    const list = quizzes.filter(q => {
      if (selectedSubject !== 'all' && q.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }
      if (selectedStatus !== 'all' && q.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = q.title.toLowerCase().includes(query);
        const matchesSubject = q.subject.toLowerCase().includes(query);
        const matchesDesc = q.description ? q.description.toLowerCase().includes(query) : false;
        const matchesRoom = q.room ? q.room.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesSubject && !matchesDesc && !matchesRoom) return false;
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
  }, [quizzes, selectedSubject, selectedStatus, searchQuery, sortBy]);

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
              Track upcoming tests, weightage, venue, and study preparation
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Quiz</span>
          </button>
        </div>

        {/* Toolbar: Search, Subject Filter & Sort */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search quiz topic or room..."
              className="input-field text-xs pl-9 py-2"
            />
          </div>

          {/* Subject Filter */}
          <div className="md:col-span-4 flex items-center gap-1.5">
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
          <div className="md:col-span-4 flex items-center justify-end">
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

      {/* Add Quiz Modal Form */}
      {showAddModal && (
        <form
          onSubmit={handleAddQuiz}
          className="card p-5 sm:p-6 bg-gradient-to-br from-purple-50/50 via-white to-slate-50 border-purple-200 space-y-4 animate-slide-up shadow-sm"
        >
          <div className="flex items-center justify-between pb-2 border-b border-purple-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span>Schedule New Quiz / Test</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
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
                placeholder="e.g. Midterm 1: Graphs & Trees"
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
                placeholder="e.g. DSA, Mathematics, Networks"
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
                placeholder="Audi-1 / Lab 201"
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
          <h3 className="text-base font-bold text-slate-800">No quizzes scheduled</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedSubject !== 'all'
              ? 'No quizzes match your filter criteria.'
              : 'You have no upcoming quizzes scheduled for this batch!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredAndSortedQuizzes.map(quiz => {
            const isEditing = editingQuizId === quiz.id;
            const countdown = getCountdownBadge(quiz.date);
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
                    <div className="sm:col-span-4">
                      <input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={editTime}
                        onChange={e => setEditTime(e.target.value)}
                        placeholder="Time slot"
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="sm:col-span-4">
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
                  {/* Left: Info, Subject, Title, Topics */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
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
