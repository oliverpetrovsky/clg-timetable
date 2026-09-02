import AssignmentList from '../components/AssignmentList';
import { BookOpen } from 'lucide-react';

export default function AssignmentsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-6 animate-fade-in flex-1">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold uppercase tracking-wider">
              Course Work
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">All Departments</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-emerald-600" />
            Assignments & Projects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse upcoming homework, lab reports, project submissions, and due dates across branches.
          </p>
        </div>
      </div>

      {/* Assignments List */}
      <AssignmentList />
    </main>
  );
}
