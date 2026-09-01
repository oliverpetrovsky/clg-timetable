'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { 
  GraduationCap, 
  Loader2, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please check your network connection.');
      setLoading(false);
    }
  };

  const fillQuickAccount = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
  };

  return (
    <>
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="card max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl border-slate-200/90">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
              <span className="bg-gradient-to-tr from-blue-400 to-indigo-200 bg-clip-text text-transparent">
                T
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-xs text-slate-500">Sign in to your college account to view your personalized schedule</p>
          </div>

          {/* Quick Demo Credentials Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Quick 1-Click Demo Login
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => fillQuickAccount('student@college.edu', 'student123')}
                className="text-[10px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-2 rounded-xl text-center truncate transition-colors"
                title="student@college.edu / student123"
              >
                👨‍🎓 Student
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('cse.admin@college.edu', 'branch123')}
                className="text-[10px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-2 rounded-xl text-center truncate transition-colors"
                title="cse.admin@college.edu / branch123"
              >
                🏢 CSE Admin
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@college.edu', 'admin123')}
                className="text-[10px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-1.5 px-2 rounded-xl text-center truncate transition-colors"
                title="admin@college.edu / admin123"
              >
                👑 Super Admin
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">College Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-10 text-xs"
                  placeholder="student@college.edu"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10 text-xs"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs shadow-md mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

          </form>

          {/* Sign up redirect */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Don&apos;t have an account yet?{' '}
              <Link href="/register" className="text-blue-600 font-semibold hover:underline">
                Create free account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
