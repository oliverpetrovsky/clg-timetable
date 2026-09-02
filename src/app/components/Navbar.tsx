'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Calendar, 
  BookOpen, 
  Shield, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard
} from 'lucide-react';
import NotionSyncModal from './NotionSyncModal';
import NotionWidget from './NotionWidget';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  year: number | null;
  section: string | null;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotionModal, setShowNotionModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          fetch('/api/notifications')
            .then(res => res.json())
            .then(nData => {
              const unread = (nData.notifications || []).filter((n: any) => !n.is_read && !n.isRead).length;
              setNotifCount(unread);
            })
            .catch(() => {});
        } else {
          setUser(null);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    setMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-8">
              <Link 
                href="/" 
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                  <span className="bg-gradient-to-tr from-blue-400 to-indigo-200 bg-clip-text text-transparent font-extrabold text-base">
                    T
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                    TimeTrack
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                    IIIT-B Portal
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1.5">
                <Link
                  href="/timetable"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    isActive('/timetable')
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Timetable
                </Link>

                <Link
                  href="/assignments"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    isActive('/assignments')
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Assignments
                </Link>

                {user && (
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      isActive('/dashboard')
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>
                )}

                {user && (user.role === 'admin' || user.role === 'superadmin') && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      isActive('/admin')
                        ? 'bg-purple-700 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Panel
                  </Link>
                )}
              </nav>
            </div>

            {/* Right Action Bar */}
            <div className="hidden md:flex items-center gap-3">
              {/* Notion Sync Button */}
              {user && (
                <NotionWidget onOpenModal={() => setShowNotionModal(true)} />
              )}

              {user ? (
                <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                  {/* Notifications Link */}
                  <Link
                    href="/dashboard?tab=notifications"
                    className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {notifCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                        {notifCount > 9 ? '9+' : notifCount}
                      </span>
                    )}
                  </Link>

                  {/* User Profile Pill */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-semibold text-xs flex items-center justify-center uppercase">
                      {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[110px]">
                        {user.name ? user.name.split(' ')[0] : 'User'}
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize leading-none font-medium">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="btn-secondary text-xs py-2 px-3.5 cursor-pointer shadow-sm font-semibold"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="btn-primary text-xs py-2 px-4 shadow-sm cursor-pointer font-semibold"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex md:hidden items-center gap-2">
              {user && (
                <button
                  type="button"
                  onClick={() => setShowNotionModal(true)}
                  className="p-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer"
                  title="Notion Sync"
                >
                  <span className="font-bold text-xs">N</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none cursor-pointer"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fade-in">
            <div className="space-y-1">
              <Link
                href="/timetable"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${
                  isActive('/timetable') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Timetable
              </Link>
              <Link
                href="/assignments"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${
                  isActive('/assignments') ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Assignments
              </Link>
              {user && (
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${
                    isActive('/dashboard') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Personal Dashboard
                </Link>
              )}
              {user && (user.role === 'admin' || user.role === 'superadmin') && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer ${
                    isActive('/admin') ? 'bg-purple-700 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Link>
              )}
            </div>

            {user ? (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-semibold text-xs flex items-center justify-center">
                    {user.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-medium text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="btn-secondary text-xs text-center py-2.5 cursor-pointer font-semibold"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary text-xs text-center py-2.5 cursor-pointer font-semibold"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Notion Integration Modal */}
      <NotionSyncModal
        isOpen={showNotionModal}
        onClose={() => setShowNotionModal(false)}
      />
    </>
  );
}
