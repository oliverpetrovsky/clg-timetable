export interface UserPreference {
  branchId: string;
  branchCode?: string;
  year: number;
  section: string;
}

const COOKIE_NAME = 'clg_timetable_pref';

/**
 * Reads user preference from cookies (with localStorage fallback)
 */
export function getUserPreference(): UserPreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    const raw = match ? decodeURIComponent(match[1]) : localStorage.getItem(COOKIE_NAME);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.branchId || parsed.branchCode)) {
        return {
          branchId: String(parsed.branchId || ''),
          branchCode: parsed.branchCode ? String(parsed.branchCode) : undefined,
          year: parsed.year ? Number(parsed.year) : 1,
          section: parsed.section ? String(parsed.section) : 'A',
        };
      }
    }
  } catch {}
  return null;
}

/**
 * Saves user preference to cookie (1 year persistence, SameSite=Lax, path=/) and localStorage
 */
export function saveUserPreference(pref: Partial<UserPreference>): UserPreference {
  const current = getUserPreference() || { branchId: '', year: 1, section: 'A' };
  const updated: UserPreference = {
    branchId: pref.branchId !== undefined ? String(pref.branchId) : current.branchId,
    branchCode: pref.branchCode !== undefined ? String(pref.branchCode) : current.branchCode,
    year: pref.year !== undefined ? Number(pref.year) : current.year,
    section: pref.section !== undefined ? String(pref.section) : current.section,
  };

  if (typeof window !== 'undefined') {
    try {
      const jsonStr = JSON.stringify(updated);
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(jsonStr)}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem(COOKIE_NAME, jsonStr);
      window.dispatchEvent(new CustomEvent('clg_pref_changed', { detail: updated }));
    } catch {}
  }

  return updated;
}
