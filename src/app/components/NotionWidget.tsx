'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface NotionWidgetProps {
  onOpenModal: () => void;
  className?: string;
}

export default function NotionWidget({ onOpenModal, className = '' }: NotionWidgetProps) {
  const [hasConfig, setHasConfig] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [dbTitle, setDbTitle] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('college_timetable_notion_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey && parsed.databaseId) {
          setHasConfig(true);
          setDbTitle(parsed.databaseTitle || 'Notion DB');
          setLastSynced(parsed.lastSynced || null);
        }
      }
    } catch {}
  }, []);

  return (
    <button
      onClick={onOpenModal}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150 ${
        hasConfig
          ? 'bg-slate-900 text-white border-slate-900 hover:bg-black shadow-xs'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
      } ${className}`}
      title={hasConfig ? `Connected to ${dbTitle}` : 'Connect Notion account'}
    >
      <span className="w-4 h-4 rounded-md bg-white/10 text-white flex items-center justify-center font-bold text-[10px] leading-none shrink-0">
        N
      </span>
      <span>{hasConfig ? 'Notion Connected' : 'Sync with Notion'}</span>
      {hasConfig && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
    </button>
  );
}
