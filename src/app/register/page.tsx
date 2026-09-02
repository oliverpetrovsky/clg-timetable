'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  GraduationCap, 
  Loader2, 
  User, 
  Mail, 
  Lock, 
  Building2, 
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface Branch {
  id: string;
  _id?: string;
  name: string;
  code: string;
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [branchId, setBranchId] = useState<string>('');
  const [year, setYear] = useState(1);
  const [section, setSection] = useState('A');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        const list = data.branches || [];
        setBranches(list);
        if (list.length > 0) {
          setBranchId(String(list[0].id || list[0]._id));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!branchId) {
      setError('Please select your academic branch.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, branchId, year, section }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please check your inputs.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="card max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl border-slate-200/90">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
              <span className="bg-gradient-to-tr from-blue-400 to-indigo-200 bg-clip-text text-transparent">
                T
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create student account</h1>
            <p className="text-xs text-slate-500">Get automatic timetable updates, assignment alerts, and Notion task sync</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field pl-10 text-xs"
                  placeholder="e.g. Alex Morgan"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">College Email</label>
                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                  @iiitb.ac.in only
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-10 text-xs"
                  placeholder="rollnumber@iiitb.ac.in"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Must be your registered IIIT-B college email address</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10 text-xs"
                  placeholder="Minimum 6 characters"
                  minLength={6}
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

            {/* Academic Branch */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Department / Branch</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  className="select-field pl-10 text-xs"
                  required
                >
                  <option value="">Select your branch</option>
                  {branches.map(b => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year and Section */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Academic Year</label>
                <select
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value))}
                  className="select-field text-xs"
                >
                  {[1, 2, 3, 4].map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Section</label>
                <select
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  className="select-field text-xs"
                >
                  {['A', 'B', 'C', 'D'].map(s => (
                    <option key={s} value={s}>Section {s}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs shadow-md mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

          </form>

          {/* Sign In Link */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>

        </div>
      </div>
  );
}
