'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TimetableView from '../components/TimetableView';
import AssignmentList from '../components/AssignmentList';
import NotionSyncModal from '../components/NotionSyncModal';
import NotionWidget from '../components/NotionWidget';
import PersonalTaskList, { CustomTask } from '../components/PersonalTaskList';
import QuizList from '../components/QuizList';
import { 
  Bell, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  Trash2, 
  Check, 
  Layers, 
  RefreshCw,
  GraduationCap,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  branch_code?: string;
  branch_name?: string;
  year: number | null;
  section: string | null;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'quizzes' | 'timetable' | 'assignments' | 'notifications'>('tasks');
  const [loading, setLoading] = useState(true);
  const [showNotionModal, setShowNotionModal] = useState(false);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [completedAssignmentCount, setCompletedAssignmentCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);

  const router = useRouter();

  // Load User & Notifications
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          router.push('/login');
          return;
        }
        const u = data.user;
        setUser(u);
        setLoading(false);

        // Fetch notifications
        fetch('/api/notifications')
          .then(res => res.json())
          .then(nData => setNotifications(nData.notifications || []));

        // Fetch user assignments & tracking count according to user's branch, year, and section
        if (u.branchId && u.year) {
          const secParam = u.section ? `&section=${encodeURIComponent(u.section)}` : '';
          fetch(`/api/assignments?branchId=${u.branchId}&year=${u.year}${secParam}`)
            .then(res => res.json())
            .then(aData => {
              setAssignmentCount(aData.assignments?.length || 0);
            });

          fetch('/api/assignments/track')
            .then(res => res.json())
            .then(tData => {
              const completed = (tData.tracking || []).filter((t: any) => t.status === 'completed').length;
              setCompletedAssignmentCount(completed);
            });
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Load custom personal tasks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('college_timetable_custom_tasks');
      if (saved) {
        setCustomTasks(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveCustomTasks = (tasks: CustomTask[]) => {
    setCustomTasks(tasks);
    try {
      localStorage.setItem('college_timetable_custom_tasks', JSON.stringify(tasks));
    } catch {}
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'all' }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  // Combine custom tasks for Notion Sync
  const allTasksForNotion = useMemo(() => {
    return customTasks.map(t => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      dueDate: t.dueDate,
      priority: t.priority,
      status: t.completed ? 'completed' : 'pending',
    }));
  }, [customTasks]);

  const totalTasks = assignmentCount + customTasks.length;
  const completedTasks = completedAssignmentCount + customTasks.filter(t => t.completed).length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] flex-1">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in flex-1">
        
        {/* Personalized Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Personal Workspace
              </span>
              <span className="text-slate-300">•</span>
              <span className="badge bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold">
                Year {user.year || 1} — Section {user.section || 'A'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user.name.split(' ')[0]} 👋
            </h1>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotionModal(true)}
              className="btn-notion text-xs py-2.5 px-4 shadow-sm flex items-center gap-2"
            >
              <span className="w-4 h-4 rounded bg-white/20 text-white flex items-center justify-center font-bold text-[10px]">
                N
              </span>
              <span>Sync with Notion</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('tasks');
                setShowAddTask(true);
              }}
              className="btn-primary text-xs py-2.5 px-4 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Personal Task</span>
            </button>
          </div>
        </div>

        {/* Progress & Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          
          {/* Task Completion Metric */}
          <div className="card p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Overall Progress</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{progressPercent}%</span>
                <span className="text-xs text-slate-400">{completedTasks}/{totalTasks} done</span>
              </div>
              <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Upcoming Quizzes Metric Card */}
          <div 
            onClick={() => setActiveTab('quizzes')}
            className="card p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:border-purple-300 hover:shadow-2xs transition-all"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Upcoming Quizzes</span>
              <p className="text-2xl font-bold text-slate-900">{quizCount}</p>
              <p className="text-[11px] text-purple-600 font-medium">Tests & Exams</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          {/* Active Assignments */}
          <div 
            onClick={() => setActiveTab('assignments')}
            className="card p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-2xs transition-all"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Course Assignments</span>
              <p className="text-2xl font-bold text-slate-900">{assignmentCount}</p>
              <p className="text-[11px] text-blue-600 font-medium">
                {user.branch_code || 'Branch'} • Year {user.year || 1} Sec {user.section || 'A'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          {/* Personal Tasks */}
          <div 
            onClick={() => setActiveTab('tasks')}
            className="card p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 hover:shadow-2xs transition-all"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Personal Tasks</span>
              <p className="text-2xl font-bold text-slate-900">{customTasks.length}</p>
              <p className="text-[11px] text-slate-400">Synced to device</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* Notion Sync Status */}
          <div 
            onClick={() => setShowNotionModal(true)}
            className="card p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:border-slate-300 hover:shadow-2xs transition-all"
          >
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Notion Sync</span>
              <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Active Database
              </p>
              <p className="text-[11px] text-slate-400 hover:text-slate-900 underline">Configure sync</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              N
            </div>
          </div>

        </div>

        {/* Dashboard Tabs Bar */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-2xl max-w-2xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all shrink-0 ${
              activeTab === 'tasks'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>My Tasks</span>
            {customTasks.length > 0 && (
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                {customTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all shrink-0 ${
              activeTab === 'quizzes'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
            <span>Quizzes</span>
            {quizCount > 0 && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-bold">
                {quizCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all shrink-0 ${
              activeTab === 'timetable'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Timetable</span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all shrink-0 ${
              activeTab === 'assignments'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Assignments</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium transition-all relative shrink-0 ${
              activeTab === 'notifications'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: My Work & Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-6 animate-fade-in">
            {/* Personal Tasks Section */}
            <PersonalTaskList
              tasks={customTasks}
              onTasksChange={saveCustomTasks}
              onOpenNotionModal={() => setShowNotionModal(true)}
              isAddFormOpen={showAddTask}
              onToggleAddForm={setShowAddTask}
            />

            {/* College Assignments Section */}
            <div className="space-y-3 pt-6 border-t border-slate-200/80">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{user.branch_code ? `${user.branch_code} ` : ''}Course Assignments</span>
                    <span className="badge badge-lecture text-[10px]">
                      Year {user.year || 1} • Sec {user.section || 'A'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official coursework & homework for {user.branch_name || user.branch_code || 'your branch'}
                  </p>
                </div>
                <button
                  onClick={() => setShowNotionModal(true)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sync to Notion
                </button>
              </div>

              {user.branchId && user.year ? (
                <AssignmentList
                  initialBranchId={user.branchId}
                  initialYear={user.year}
                  initialSection={user.section || 'A'}
                  showFilters={false}
                  showTrackButton={true}
                  onTrackChange={() => {
                    fetch('/api/assignments/track')
                      .then(res => res.json())
                      .then(tData => {
                        const completed = (tData.tracking || []).filter((t: any) => t.status === 'completed').length;
                        setCompletedAssignmentCount(completed);
                      });
                  }}
                />
              ) : (
                <p className="text-xs text-slate-500">Branch not configured.</p>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Quizzes & Exams */}
        {activeTab === 'quizzes' && (
          <div className="animate-fade-in space-y-4">
            <QuizList
              initialBranchId={user.branchId || undefined}
              initialYear={user.year || 1}
              initialSection={user.section || 'A'}
              showFilters={false}
              onQuizCountChange={setQuizCount}
            />
          </div>
        )}

        {/* Tab 3: My Timetable (Daily, Weekly, Monthly) */}
        {activeTab === 'timetable' && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Your Weekly Schedule</h2>
                <p className="text-xs text-slate-500">
                  Showing timetable for Year {user.year || 1}, Section {user.section || 'A'}
                </p>
              </div>
            </div>

            {user.branchId && user.year ? (
              <TimetableView
                initialBranchId={user.branchId}
                initialYear={user.year}
                initialSection={user.section || 'A'}
                showFilters={false}
              />
            ) : (
              <div className="card p-8 text-center">
                <p className="text-xs text-slate-500">Please set your branch and year in settings.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Assignments */}
        {activeTab === 'assignments' && (
          <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>{user.branch_name || user.branch_code || 'Branch'} Assignments</span>
                  <span className="badge badge-high text-[10px]">
                    Year {user.year || 1} • Sec {user.section || 'A'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Track deadlines, homework submissions, and priority levels for your batch
                </p>
              </div>
              <button
                onClick={() => setShowNotionModal(true)}
                className="btn-notion text-xs py-2 px-3 self-start sm:self-auto flex items-center gap-1.5"
              >
                <span className="w-3.5 h-3.5 rounded bg-white/20 text-white flex items-center justify-center font-bold text-[9px]">
                  N
                </span>
                <span>Sync Notion</span>
              </button>
            </div>

            {user.branchId && user.year ? (
              <AssignmentList
                initialBranchId={user.branchId}
                initialYear={user.year}
                initialSection={user.section || 'A'}
                showFilters={false}
                showTrackButton={true}
                onTrackChange={() => {
                  fetch('/api/assignments/track')
                    .then(res => res.json())
                    .then(tData => {
                      const completed = (tData.tracking || []).filter((t: any) => t.status === 'completed').length;
                      setCompletedAssignmentCount(completed);
                    });
                }}
              />
            ) : null}
          </div>
        )}

        {/* Tab 4: Notifications & Alerts */}
        {activeTab === 'notifications' && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Notifications & Alerts</h2>
                <p className="text-xs text-slate-500">Timetable changes, urgent reminders, and new assignments</p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="btn-ghost text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="card py-16 px-6 text-center border-dashed">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-5 h-5 opacity-60" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">No alerts yet</h3>
                <p className="text-xs text-slate-500 mt-1">You're all caught up on announcements and schedule updates.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`card p-4 sm:p-5 flex items-start gap-3.5 transition-all ${
                      !notif.is_read ? 'bg-blue-50/30 border-blue-200/80 shadow-2xs' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${
                      notif.type === 'assignment' ? 'bg-emerald-50 text-emerald-600' :
                      notif.type === 'timetable_change' ? 'bg-blue-50 text-blue-600' :
                      notif.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {notif.type === 'assignment' ? <BookOpen className="w-4 h-4" /> :
                       notif.type === 'timetable_change' ? <Calendar className="w-4 h-4" /> :
                       notif.type === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                       <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">{notif.title}</h3>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Notion Integration Modal */}
      <NotionSyncModal
        isOpen={showNotionModal}
        onClose={() => setShowNotionModal(false)}
        tasksToSync={allTasksForNotion}
      />
    </>
  );
}
