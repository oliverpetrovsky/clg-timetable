import Navbar from '../components/Navbar';
import TimetableView from '../components/TimetableView';
import { Calendar, Sparkles } from 'lucide-react';

export default function TimetablePage() {
  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-6 animate-fade-in">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold uppercase tracking-wider">
                Public Schedule
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">All Branches & Years</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Calendar className="w-7 h-7 text-blue-600" />
              Class Timetable
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select your department, year, and section to view scheduled lectures, labs, and breaks.
            </p>
          </div>
        </div>

        {/* Interactive Timetable View */}
        <TimetableView />

      </main>
    </>
  );
}
