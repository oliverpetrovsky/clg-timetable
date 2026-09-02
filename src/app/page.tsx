'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  BookOpen, 
  Bell, 
  Shield, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Layers,
  ChevronRight,
  BookmarkCheck,
  LayoutDashboard
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [savedPref, setSavedPref] = useState<{ branchId?: string; year?: number; section?: string } | null>(null);

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});

    // Check saved timetable cookie
    try {
      const match = document.cookie.match(/clg_timetable_pref=([^;]+)/);
      const savedStr = match ? decodeURIComponent(match[1]) : localStorage.getItem('clg_timetable_pref');
      if (savedStr) {
        setSavedPref(JSON.parse(savedStr));
      }
    } catch {}
  }, []);

  return (
    <>
      <main className="flex-1">
        
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/40">
          
          {/* Subtle decorative background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-400/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              
              {/* Top pill badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-medium shadow-sm animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>IIIT-B Timetable & Assignment Portal</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] animate-slide-up">
                Your college schedule, <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  effortlessly synced.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Stay on top of lectures, labs, and assignment deadlines. Personalize your student dashboard and sync directly with your Notion workspace in one click.
              </p>

              {/* Dynamic CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="w-full sm:w-auto btn-primary text-sm py-3 px-6 shadow-md flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <Link
                      href="/timetable"
                      className="w-full sm:w-auto btn-secondary text-sm py-3 px-6 shadow-xs flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>View Timetable</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/timetable"
                      className="w-full sm:w-auto btn-primary text-sm py-3 px-6 shadow-md flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>View Timetable</span>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-normal">Free</span>
                    </Link>

                    <Link
                      href="/register"
                      className="w-full sm:w-auto btn-secondary text-sm py-3 px-6 shadow-xs flex items-center justify-center gap-2"
                    >
                      <span>Student Sign Up</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </>
                )}
              </div>

              {/* Micro proof tags */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  No login required for timetable
                </span>
                <span className="flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-blue-600" />
                  Remembers your class view
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Notion 2-Way Task Sync
                </span>
              </div>

            </div>

            {/* Visual Teaser Mockup */}
            <div className="mt-14 max-w-4xl mx-auto card p-3 sm:p-4 shadow-xl border-slate-200/90 bg-white/90 backdrop-blur-md">
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:p-6 space-y-4">
                
                {/* Mockup Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                    </div>
                    <span className="text-xs font-mono text-slate-500 ml-2 font-medium">
                      CSE Year 2 • Section A Schedule
                    </span>
                  </div>
                  <Link
                    href="/timetable"
                    className="badge bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] hover:bg-emerald-100 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                    Interactive Schedule →
                  </Link>
                </div>

                {/* Mockup Classes Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Link href="/timetable" className="card p-4 bg-white border-blue-200/80 ring-1 ring-blue-500/10 hover:shadow-md transition-all">
                    <span className="badge badge-lecture text-[10px]">Lecture</span>
                    <h4 className="font-semibold text-sm text-slate-900 mt-2">Data Structures & Algorithms</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 09:00 - 10:00 AM • Room 301
                    </p>
                  </Link>

                  <Link href="/timetable" className="card p-4 bg-white border-purple-200/80 hover:shadow-md transition-all">
                    <span className="badge badge-tutorial text-[10px]">Tutorial</span>
                    <h4 className="font-semibold text-sm text-slate-900 mt-2">Discrete Mathematics</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 10:00 - 11:00 AM • Room 302
                    </p>
                  </Link>

                  <Link href="/timetable" className="card p-4 bg-white border-emerald-200/80 hover:shadow-md transition-all">
                    <span className="badge badge-lab text-[10px]">Lab Session</span>
                    <h4 className="font-semibold text-sm text-slate-900 mt-2">DSA Practical Lab</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 01:00 - 03:00 PM • Lab 201
                    </p>
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* Notion Feature Spotlight */}
        <section className="py-16 md:py-24 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
                  <span className="w-4 h-4 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[9px]">
                    N
                  </span>
                  Notion Integration
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                  Your assignments synced directly to your Notion workspace
                </h2>

                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                  Never manually copy due dates again. Connect your Notion database in 60 seconds with your internal integration token. Push all homework, project milestones, and personal to-dos with one click.
                </p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>Automatic mapping of Subject, Due Date, Priority, and Status</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>Instant Demo Mode to test sync before connecting live keys</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <span>Secure client-side token storage — your credentials stay private</span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Link href={user ? '/dashboard' : '/register'} className="btn-primary text-xs py-2.5 px-4 shadow-sm">
                    {user ? 'Open Notion Hub' : 'Try Notion Sync Now'}
                  </Link>
                </div>
              </div>

              {/* Notion Visual Card */}
              <div className="card p-6 sm:p-8 bg-slate-900 text-white shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white text-slate-900 flex items-center justify-center font-bold text-sm">
                      N
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Notion Database</p>
                      <p className="text-[11px] text-slate-400">College Tasks & Assignments</p>
                    </div>
                  </div>
                  <span className="badge bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                    ● Connected
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="font-medium text-slate-200">Implement Binary Search Tree</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Due Sep 8</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="font-medium text-slate-200">Library Management System OOP</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Due Sep 12</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span className="font-medium text-slate-200">Graph Theory Problem Set</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Due Sep 5</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center pt-2">
                  Synced assignments automatically into Notion
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-16 md:py-24 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Engineered for IIIT-B students & class reps
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Fast, responsive, and minimalist. Everything you need with zero clutter.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="card p-6 space-y-3 card-hover">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Live Timetables</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Browse any branch, year, or section schedule with zero login required. Instant filter by day and time.
                </p>
              </div>

              <div className="card p-6 space-y-3 card-hover">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Assignment Tracker</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Track course deadlines, set completion status, and never miss an urgent submission deadline.
                </p>
              </div>

              <div className="card p-6 space-y-3 card-hover">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Notion Task Sync</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Export assignments and personal to-dos to your Notion databases with auto-mapped properties.
                </p>
              </div>

              <div className="card p-6 space-y-3 card-hover">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Class Rep Admins</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Designated class reps keep timetable entries and assignments up-to-date with instant student alerts.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="py-16 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Ready to organize your college semester?
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
              Check your classes, track assignments, and streamline your schedule in seconds.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href={user ? '/dashboard' : '/register'} className="btn-accent text-xs py-3 px-6 shadow-md">
                {user ? 'Open Dashboard' : 'Create Student Account'}
              </Link>
              <Link href="/timetable" className="btn-secondary text-xs py-3 px-6 bg-slate-800 text-white border-slate-700 hover:bg-slate-700">
                Explore Timetable
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Clean Minimalist Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">TimeTrack</span>
            <span>•</span>
            <span>IIIT-B Timetable & Assignment Hub</span>
          </div>
          <p>© {new Date().getFullYear()} IIIT-B Timetable Tracker. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
