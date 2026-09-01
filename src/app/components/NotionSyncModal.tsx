'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ExternalLink, 
  HelpCircle, 
  Sparkles,
  Key,
  Database,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';

interface NotionConfig {
  apiKey: string;
  databaseId: string;
  databaseTitle?: string;
  lastSynced?: string;
}

interface TaskToSync {
  id?: number | string;
  title: string;
  subject: string;
  dueDate: string;
  priority?: string;
  status?: string;
  description?: string | null;
}

interface NotionSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasksToSync?: TaskToSync[];
  onSyncComplete?: (result: { syncedCount: number; timestamp: string }) => void;
}

export default function NotionSyncModal({
  isOpen,
  onClose,
  tasksToSync = [],
  onSyncComplete,
}: NotionSyncModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; title?: string; message?: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; count?: number; message?: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});

  // Load saved Notion config
  useEffect(() => {
    try {
      const saved = localStorage.getItem('college_timetable_notion_config');
      if (saved) {
        const parsed: NotionConfig = JSON.parse(saved);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.databaseId) setDatabaseId(parsed.databaseId);
        if (parsed.databaseTitle) {
          setTestResult({ success: true, title: parsed.databaseTitle });
        }
      }
    } catch {}
  }, []);

  // Initialize selected tasks
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    tasksToSync.forEach((t, i) => {
      initial[t.id ? String(t.id) : `task-${i}`] = true;
    });
    setSelectedTasks(initial);
  }, [tasksToSync]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !databaseId.trim()) {
      setTestResult({ success: false, message: 'Please enter both your API Key and Database ID.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/notion/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), databaseId: databaseId.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          title: data.title,
          message: data.isDemo ? 'Connected in Demo Mode!' : `Connected to database: "${data.title}"`,
        });

        // Save valid config
        const config: NotionConfig = {
          apiKey: apiKey.trim(),
          databaseId: databaseId.trim(),
          databaseTitle: data.title,
        };
        localStorage.setItem('college_timetable_notion_config', JSON.stringify(config));
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: 'Network error while testing connection.' });
    } finally {
      setTesting(false);
    }
  };

  const handleQuickDemo = () => {
    setApiKey('demo_token_key');
    setDatabaseId('demo_database_assignments_2026');
    setTestResult({
      success: true,
      title: 'Demo Student Database',
      message: 'Demo configuration applied! Click "Sync Tasks Now" to test.',
    });
  };

  const handleSync = async () => {
    if (!apiKey.trim() || !databaseId.trim()) {
      setTestResult({ success: false, message: 'Please configure your Notion connection first.' });
      return;
    }

    const tasksToSend = tasksToSync.filter((t, i) => {
      const key = t.id ? String(t.id) : `task-${i}`;
      return selectedTasks[key] !== false;
    });

    if (tasksToSend.length === 0) {
      setSyncResult({ success: false, message: 'Please select at least one task to sync.' });
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          databaseId: databaseId.trim(),
          tasks: tasksToSend,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSyncResult({
          success: true,
          count: data.syncedCount,
          message: `Successfully synced ${data.syncedCount} of ${tasksToSend.length} tasks to Notion!`,
        });

        // Update last synced in storage
        const saved = localStorage.getItem('college_timetable_notion_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.lastSynced = data.timestamp;
          localStorage.setItem('college_timetable_notion_config', JSON.stringify(parsed));
        }

        if (onSyncComplete) {
          onSyncComplete({ syncedCount: data.syncedCount, timestamp: data.timestamp });
        }
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Failed to sync tasks to Notion.',
        });
      }
    } catch (err) {
      setSyncResult({
        success: false,
        message: 'Network error during sync.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleTask = (key: string) => {
    setSelectedTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = (val: boolean) => {
    const updated: Record<string, boolean> = {};
    tasksToSync.forEach((t, i) => {
      updated[t.id ? String(t.id) : `task-${i}`] = val;
    });
    setSelectedTasks(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              N
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                Sync with Notion
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-normal border border-slate-200">
                  Integration
                </span>
              </h2>
              <p className="text-xs text-slate-500">Push your timetable tasks & assignments directly into Notion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Quick Demo Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-950">Want to test without a Notion API key?</p>
                <p className="text-xs text-blue-700 mt-0.5">Use the instant 1-click Demo Mode to test the sync workflow.</p>
              </div>
            </div>
            <button
              onClick={handleQuickDemo}
              className="text-xs font-medium bg-white text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors shrink-0 shadow-2xs"
            >
              Try Demo
            </button>
          </div>

          {/* Connection Inputs */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  Notion Internal Integration Token
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  How to get this?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="input-field pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                Notion Database ID or URL
              </label>
              <input
                type="text"
                value={databaseId}
                onChange={e => setDatabaseId(e.target.value)}
                placeholder="e.g. 297f8c1464734b3f81e7d956f... or full URL"
                className="input-field font-mono text-xs"
              />
            </div>

            {/* Test Connection Button & Status */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !apiKey || !databaseId}
                className="btn-secondary text-xs py-2 px-3.5"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Test Connection
                  </>
                )}
              </button>

              {testResult && (
                <div className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                  testResult.success 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="truncate">{testResult.message || testResult.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Guide Accordion */}
          {showGuide && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2.5 animate-fade-in text-slate-600">
              <p className="font-semibold text-slate-900">How to connect your Notion database in 3 steps:</p>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">notion.so/my-integrations</a>, click <strong>+ New integration</strong>, name it "Timetable Tracker", and copy the token.</li>
                <li>In Notion, open your tasks database page, click <strong>••• (top right) → Add connections</strong>, and select your integration.</li>
                <li>Copy the Database ID from the database URL (the 32-character code before the `?`) and paste it above.</li>
              </ol>
            </div>
          )}

          {/* Task Selection Section */}
          {tasksToSync.length > 0 && (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Select Tasks to Sync ({Object.values(selectedTasks).filter(Boolean).length} / {tasksToSync.length})
                </h3>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => selectAll(true)} className="text-blue-600 hover:underline">Select all</button>
                  <span className="text-slate-300">•</span>
                  <button onClick={() => selectAll(false)} className="text-slate-500 hover:underline">Deselect all</button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {tasksToSync.map((task, idx) => {
                  const key = task.id ? String(task.id) : `task-${idx}`;
                  const isChecked = selectedTasks[key] !== false;
                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-slate-50/80 border-slate-300' : 'bg-white border-slate-200 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTask(key)}
                        className="mt-0.5 rounded text-slate-900 focus:ring-slate-900"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-slate-900 truncate">{task.title}</p>
                          {task.priority && (
                            <span className={`badge text-[10px] ${
                              task.priority === 'urgent' ? 'badge-urgent' :
                              task.priority === 'high' ? 'badge-high' : 'badge-low'
                            }`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{task.subject}</span>
                          <span>•</span>
                          <span>Due {task.dueDate}</span>
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sync Result Banner */}
          {syncResult && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fade-in ${
              syncResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {syncResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{syncResult.success ? 'Sync Completed!' : 'Sync Failed'}</p>
                <p className="mt-0.5">{syncResult.message}</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !apiKey || !databaseId || Object.values(selectedTasks).filter(Boolean).length === 0}
            className="btn-notion text-xs py-2 px-5 flex items-center gap-2"
          >
            {syncing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Syncing to Notion...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Sync {Object.values(selectedTasks).filter(Boolean).length} Task{Object.values(selectedTasks).filter(Boolean).length === 1 ? '' : 's'} Now
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
