'use client';

import { useState, useMemo, useEffect } from 'react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import {
  Check,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Layers,
  Sparkles,
  Clock,
  Tag,
  CheckCircle2,
  X,
  AlertCircle,
  Flame,
  CheckCheck
} from 'lucide-react';

export interface CustomTask {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completed: boolean;
  completedAt?: number;
  createdAt?: number;
  description?: string;
}

interface PersonalTaskListProps {
  tasks: CustomTask[];
  onTasksChange: (tasks: CustomTask[]) => void;
  onOpenNotionModal?: () => void;
  isAddFormOpen?: boolean;
  onToggleAddForm?: (open: boolean) => void;
}

const PRIORITY_RANK: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_CONFIG: Record<string, { badge: string; dot: string; label: string; border: string }> = {
  urgent: { badge: 'badge-urgent', dot: 'bg-rose-500', label: 'Urgent', border: 'border-rose-200' },
  high: { badge: 'badge-high', dot: 'bg-amber-500', label: 'High', border: 'border-amber-200' },
  medium: { badge: 'badge-medium', dot: 'bg-blue-500', label: 'Medium', border: 'border-blue-200' },
  low: { badge: 'badge-low', dot: 'bg-slate-400', label: 'Low', border: 'border-slate-200' },
};

export default function PersonalTaskList({
  tasks,
  onTasksChange,
  onOpenNotionModal,
  isAddFormOpen,
  onToggleAddForm,
}: PersonalTaskListProps) {
  // Sorting and Filtering state
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'newest' | 'title'>('priority');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Animation and cleanup state
  const [fadingTaskIds, setFadingTaskIds] = useState<string[]>([]);
  const [cleanupToast, setCleanupToast] = useState<{ message: string; submessage?: string } | null>(null);

  // Form states
  const [internalShowAdd, setInternalShowAdd] = useState(false);
  const showAddForm = isAddFormOpen !== undefined ? isAddFormOpen : internalShowAdd;
  const setShowAddForm = (open: boolean) => {
    if (onToggleAddForm) onToggleAddForm(open);
    else setInternalShowAdd(open);
  };

  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // Editing task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // Common quick subject presets
  const commonSubjects = ['DSA', 'Mathematics', 'Computer Networks', 'DBMS', 'AI & ML', 'Personal'];

  // Unique subjects dynamically computed from current tasks
  const dynamicSubjects = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.subject && t.subject.trim()) {
        set.add(t.subject.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  // Due date helper with badge styles
  const getDueDateBadge = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const now = new Date();
      if (isPast(date) && !isToday(date)) {
        return {
          label: 'Overdue',
          formatted: format(date, 'MMM d'),
          className: 'text-rose-700 font-semibold bg-rose-50 border-rose-200',
        };
      }
      if (isToday(date)) {
        return {
          label: 'Due Today',
          formatted: format(date, 'MMM d'),
          className: 'text-amber-800 font-bold bg-amber-100/90 border-amber-300 animate-pulse',
        };
      }
      if (isTomorrow(date)) {
        return {
          label: 'Due Tomorrow',
          formatted: format(date, 'MMM d'),
          className: 'text-amber-700 font-medium bg-amber-50 border-amber-200',
        };
      }
      const days = differenceInDays(date, now);
      if (days <= 3) {
        return {
          label: `${days}d left`,
          formatted: format(date, 'MMM d'),
          className: 'text-amber-700 font-medium bg-amber-50/60 border-amber-200',
        };
      }
      return {
        label: `${days}d left`,
        formatted: format(date, 'MMM d'),
        className: 'text-slate-600 bg-slate-100 border-slate-200',
      };
    } catch {
      return {
        label: dateStr,
        formatted: dateStr,
        className: 'text-slate-600 bg-slate-100 border-slate-200',
      };
    }
  };

  // Add a new personal task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: CustomTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newTitle.trim(),
      subject: newSubject.trim() || 'Personal',
      dueDate: newDueDate || new Date().toISOString().split('T')[0],
      priority: newPriority,
      completed: false,
      createdAt: Date.now(),
    };

    onTasksChange([newTask, ...tasks]);
    setNewTitle('');
    setNewSubject('');
    setNewDueDate('');
    setNewPriority('medium');
    setShowAddForm(false);
  };

  // Start editing a task
  const startEditing = (task: CustomTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditSubject(task.subject);
    setEditDueDate(task.dueDate || '');
    setEditPriority(task.priority);
  };

  // Save edited task
  const saveEditing = (id: string) => {
    if (!editTitle.trim()) return;
    const updated = tasks.map(t =>
      t.id === id
        ? {
            ...t,
            title: editTitle.trim(),
            subject: editSubject.trim() || 'Personal',
            dueDate: editDueDate || t.dueDate,
            priority: editPriority,
          }
        : t
    );
    onTasksChange(updated);
    setEditingTaskId(null);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingTaskId(null);
  };

  // Trigger cool fade-out animation and delete a single task
  const deleteTaskWithAnimation = (id: string) => {
    if (fadingTaskIds.includes(id)) return;
    setFadingTaskIds(prev => [...prev, id]);

    setTimeout(() => {
      const updated = tasks.filter(t => t.id !== id);
      onTasksChange(updated);
      setFadingTaskIds(prev => prev.filter(i => i !== id));
    }, 750);
  };

  // Toggle task completion with auto fade animation when > 5 completed tasks
  const toggleTaskCompletion = (id: string) => {
    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;

    const willBeCompleted = !targetTask.completed;
    const now = Date.now();

    // Update the task list
    const updatedTasks = tasks.map(t =>
      t.id === id
        ? {
            ...t,
            completed: willBeCompleted,
            completedAt: willBeCompleted ? (t.completedAt || now) : undefined,
          }
        : t
    );

    // Check if more than 5 tasks are now done
    const completedTasks = updatedTasks.filter(t => t.completed);

    if (completedTasks.length > 5) {
      // Find the oldest completed tasks exceeding the 5 task threshold
      const sortedCompleted = [...completedTasks].sort((a, b) => {
        const timeA = a.completedAt || a.createdAt || 0;
        const timeB = b.completedAt || b.createdAt || 0;
        return timeA - timeB; // Oldest completed first
      });

      const excessCount = completedTasks.length - 5;
      const tasksToPrune = sortedCompleted.slice(0, excessCount);
      const pruneIds = tasksToPrune.map(t => t.id);

      // Save updated tasks first so current item is toggled
      onTasksChange(updatedTasks);

      // Mark the pruned tasks to fade out with cool animation
      setFadingTaskIds(prev => Array.from(new Set([...prev, ...pruneIds])));
      setCleanupToast({
        message: '✨ Cleaned up completed tasks with cool fade animation!',
        submessage: `Removed ${excessCount} older completed ${excessCount > 1 ? 'tasks' : 'task'} to keep your workspace clean (kept 5 most recent).`,
      });

      // After fade animation completes, remove the excess tasks from state
      setTimeout(() => {
        const prunedList = updatedTasks.filter(t => !pruneIds.includes(t.id));
        onTasksChange(prunedList);
        setFadingTaskIds(prev => prev.filter(i => !pruneIds.includes(i)));
      }, 750);

      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setCleanupToast(null);
      }, 4000);
    } else {
      onTasksChange(updatedTasks);
    }
  };

  // Batch fade-out and clear excess completed tasks if user wants manual tidy
  const pruneExcessCompleted = () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length <= 5) return;

    const sortedCompleted = [...completedTasks].sort((a, b) => {
      const timeA = a.completedAt || a.createdAt || 0;
      const timeB = b.completedAt || b.createdAt || 0;
      return timeA - timeB;
    });

    const excessCount = completedTasks.length - 5;
    const tasksToPrune = sortedCompleted.slice(0, excessCount);
    const pruneIds = tasksToPrune.map(t => t.id);

    setFadingTaskIds(prev => Array.from(new Set([...prev, ...pruneIds])));
    setCleanupToast({
      message: '✨ Cleaned up older completed tasks!',
      submessage: `Faded out ${excessCount} older completed ${excessCount > 1 ? 'tasks' : 'task'} (kept 5 most recent).`,
    });

    setTimeout(() => {
      const remaining = tasks.filter(t => !pruneIds.includes(t.id));
      onTasksChange(remaining);
      setFadingTaskIds(prev => prev.filter(i => !pruneIds.includes(i)));
    }, 750);

    setTimeout(() => {
      setCleanupToast(null);
    }, 4000);
  };

  // Clear all completed tasks with cool fade animation
  const clearAllCompletedWithAnimation = () => {
    const completedIds = tasks.filter(t => t.completed).map(t => t.id);
    if (completedIds.length === 0) return;

    setFadingTaskIds(prev => Array.from(new Set([...prev, ...completedIds])));
    setCleanupToast({
      message: '✨ All completed tasks cleared!',
      submessage: `Faded out ${completedIds.length} completed ${completedIds.length > 1 ? 'tasks' : 'task'}.`,
    });

    setTimeout(() => {
      const remaining = tasks.filter(t => !t.completed);
      onTasksChange(remaining);
      setFadingTaskIds(prev => prev.filter(i => !completedIds.includes(i)));
    }, 750);

    setTimeout(() => {
      setCleanupToast(null);
    }, 4000);
  };

  // Sort and Filter Tasks
  const filteredAndSortedTasks = useMemo(() => {
    // 1. Filter
    const filtered = tasks.filter(task => {
      // Subject filter
      if (selectedSubject !== 'all' && task.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }
      // Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesSubject = task.subject.toLowerCase().includes(q);
        const matchesDesc = task.description ? task.description.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesSubject && !matchesDesc) return false;
      }
      return true;
    });

    // 2. Sort
    return [...filtered].sort((a, b) => {
      // Keep active tasks above completed tasks by default for better organization
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (sortBy === 'priority') {
        // Priority order: Urgent (4) > High (3) > Medium (2) > Low (1)
        const rankA = PRIORITY_RANK[a.priority] || 2;
        const rankB = PRIORITY_RANK[b.priority] || 2;
        if (rankA !== rankB) {
          return rankB - rankA; // Higher rank first
        }
        // Secondary: due date ascending
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      }

      if (sortBy === 'dueDate') {
        // Due Date: Closest deadline first; tasks without due date at bottom
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const timeDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (timeDiff !== 0) return timeDiff;
        // Secondary: priority rank descending
        return (PRIORITY_RANK[b.priority] || 2) - (PRIORITY_RANK[a.priority] || 2);
      }

      if (sortBy === 'newest') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }

      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }

      return 0;
    });
  }, [tasks, sortBy, selectedSubject, selectedPriority, searchQuery]);

  const completedCount = tasks.filter(t => t.completed).length;
  const activeCount = tasks.length - completedCount;

  return (
    <div className="space-y-4">
      {/* Cleanup / Celebration Banner Toast */}
      {cleanupToast && (
        <div className="card p-4 bg-emerald-50/90 border-emerald-300 text-emerald-950 flex items-start justify-between gap-3 shadow-sm animate-slide-up">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">{cleanupToast.message}</p>
              {cleanupToast.submessage && (
                <p className="text-[11px] text-emerald-700 mt-0.5">{cleanupToast.submessage}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setCleanupToast(null)}
            className="p-1 rounded-lg text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Main Control Bar */}
      <div className="card p-4 sm:p-5 space-y-4">
        {/* Top row: Section Title, Stats Badge & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Personal Tasks</span>
                <span className="badge bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-semibold">
                  {activeCount} active • {completedCount} done
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sorted by priority order with auto fade-out cleanup when &gt; 5 tasks are completed
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {completedCount > 5 && (
              <button
                onClick={pruneExcessCompleted}
                className="btn-secondary text-xs py-1.5 px-3 text-amber-700 border-amber-200 hover:bg-amber-50 flex items-center gap-1.5 shadow-2xs"
                title="Fade out older completed tasks exceeding 5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Auto-Clean (&gt;5 done)</span>
              </button>
            )}

            {completedCount > 0 && (
              <button
                onClick={clearAllCompletedWithAnimation}
                className="btn-ghost text-xs py-1.5 px-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                title="Clear all completed tasks with fade animation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Done</span>
              </button>
            )}

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Close' : 'Add Task'}</span>
            </button>
          </div>
        </div>

        {/* Filter and Sort Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Bar */}
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search personal tasks..."
              className="input-field text-xs pl-9 py-2"
            />
          </div>

          {/* Subject Filter Dropdown */}
          <div className="md:col-span-4 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="select-field text-xs pl-9 py-2 w-full font-medium text-slate-700"
              >
                <option value="all">All Subjects ({tasks.length})</option>
                {dynamicSubjects.map(sub => {
                  const count = tasks.filter(t => t.subject.toLowerCase() === sub.toLowerCase()).length;
                  return (
                    <option key={sub} value={sub}>
                      {sub} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedSubject !== 'all' && (
              <button
                onClick={() => setSelectedSubject('all')}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                title="Clear subject filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort By Selector */}
          <div className="md:col-span-4 flex items-center justify-end">
            <div className="relative w-full">
              <ArrowUpDown className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="select-field text-xs pl-9 py-2 w-full font-medium text-slate-700 bg-white"
              >
                <option value="priority">Priority (Urgent first)</option>
                <option value="dueDate">Due Date (Closest first)</option>
                <option value="newest">Newest Added</option>
                <option value="title">Title (A to Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Priority Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Priority:
          </span>
          {['all', 'urgent', 'high', 'medium', 'low'].map(p => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`text-[11px] px-2.5 py-1 rounded-lg capitalize transition-all border ${
                selectedPriority === p
                  ? 'bg-slate-900 text-white font-semibold border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p === 'all' ? 'All' : p}
              {p !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({tasks.filter(t => t.priority === p).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Inline / Expandable Add Task Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddTask}
          className="card p-5 bg-gradient-to-br from-slate-50/90 to-blue-50/20 border-slate-300 space-y-4 animate-slide-up shadow-sm"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                +
              </span>
              <h3 className="text-sm font-bold text-slate-900">Create New Personal Task</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Title */}
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g., Complete Chapter 3 exercises, Review DSA trees"
                className="input-field text-xs"
                required
                autoFocus
              />
            </div>

            {/* Subject */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Subject / Category</label>
              <input
                type="text"
                list="common-subjects"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="e.g. DSA, Math, Personal"
                className="input-field text-xs"
              />
              <datalist id="common-subjects">
                {commonSubjects.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {/* Due Date */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="input-field text-xs"
              />
            </div>
          </div>

          {/* Priority Selection & Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600">Priority Level:</span>
              {(['low', 'medium', 'high', 'urgent'] as const).map(p => {
                const conf = PRIORITY_CONFIG[p];
                const isSelected = newPriority === p;
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={`text-xs px-3 py-1.5 rounded-xl capitalize border flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? `${conf.badge} font-bold shadow-2xs ring-1 ring-slate-900/10`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs py-2 px-4 shadow-sm">
                Save Personal Task
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Task List Items */}
      {filteredAndSortedTasks.length === 0 ? (
        <div className="card py-16 px-6 text-center border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No personal tasks found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedSubject !== 'all' || selectedPriority !== 'all'
              ? 'No tasks match your current filter or search criteria.'
              : 'Add your custom tasks, homework reminders, or personal study goals above!'}
          </p>
          {(searchQuery || selectedSubject !== 'all' || selectedPriority !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSubject('all');
                setSelectedPriority('all');
              }}
              className="btn-ghost text-xs text-blue-600 hover:text-blue-700 mt-3"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {filteredAndSortedTasks.map(task => {
            const isFading = fadingTaskIds.includes(task.id);
            const isEditing = editingTaskId === task.id;
            const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
            const dueDateBadge = getDueDateBadge(task.dueDate);

            if (isEditing) {
              return (
                <div
                  key={task.id}
                  className="card p-4 sm:p-5 bg-blue-50/40 border-blue-300 space-y-3 shadow-xs animate-scale-in"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Edit Personal Task
                    </span>
                    <button
                      onClick={cancelEditing}
                      className="text-slate-400 hover:text-slate-700 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Task title"
                        className="input-field text-xs"
                        autoFocus
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        list="common-subjects"
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        placeholder="Subject"
                        className="input-field text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={e => setEditDueDate(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-600">Priority:</span>
                      {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                        <button
                          type="button"
                          key={p}
                          onClick={() => setEditPriority(p)}
                          className={`text-xs px-2.5 py-1 rounded-lg capitalize border ${
                            editPriority === p
                              ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={cancelEditing}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEditing(task.id)}
                        className="btn-primary text-xs py-1.5 px-3.5"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={task.id}
                className={`card p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-200 ${
                  task.completed
                    ? 'bg-slate-50/70 border-slate-200/80 opacity-75'
                    : 'card-hover border-slate-200/90'
                } ${isFading ? 'animate-task-fade-out' : ''}`}
              >
                {/* Left Side: Checkbox + Title + Subject + Due Date */}
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  {/* Completion Checkbox */}
                  <button
                    onClick={() => toggleTaskCompletion(task.id)}
                    className={`w-5 h-5 mt-0.5 sm:mt-0 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                      task.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs scale-105'
                        : 'bg-white border-slate-300 hover:border-slate-500 hover:bg-slate-50'
                    }`}
                    title={task.completed ? 'Mark pending' : 'Mark completed'}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={`text-xs sm:text-sm font-semibold text-slate-900 leading-snug break-words ${
                        task.completed ? 'line-through text-slate-400 font-normal' : ''
                      }`}
                    >
                      {task.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Subject Badge */}
                      <span className="badge bg-slate-100 text-slate-700 border-slate-200/90 text-[10px] py-0.5 px-2">
                        {task.subject || 'Personal'}
                      </span>

                      {/* Due Date Badge */}
                      {dueDateBadge && (
                        <span className={`badge border text-[10px] py-0.5 px-2 ${dueDateBadge.className}`}>
                          <Clock className="w-2.5 h-2.5 mr-0.5 inline-block" />
                          <span>{dueDateBadge.label}</span>
                          <span className="opacity-70 font-normal ml-1">({dueDateBadge.formatted})</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Priority Badge + Edit & Delete Actions */}
                <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Priority Badge */}
                  <span className={`badge ${priorityConf.badge} text-[10px] py-0.5 px-2.5 font-semibold`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
                    {priorityConf.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditing(task)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit task"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => deleteTaskWithAnimation(task.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete task with fade animation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
