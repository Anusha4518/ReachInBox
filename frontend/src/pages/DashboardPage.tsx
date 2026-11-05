import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { EmailRecord } from '../types/email.js';
import { ScheduledEmailsTable } from '../components/ScheduledEmailsTable.js';
import { SentEmailsTable } from '../components/SentEmailsTable.js';
import { EmailDetailView } from '../components/EmailDetailView.js';
import { SendLaterModal } from '../components/SendLaterModal.js';
import { SlackModal } from '../components/SlackModal.js';
import {
  LogOut,
  Plus,
  Clock,
  Send,
  Search,
  Upload,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Slack,
  Sparkles,
  ChevronDown,
  X,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Type,
  Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation & View states
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'compose'>('scheduled');
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  // Email lists state
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);

  // Slack state
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isSlackConnected, setIsSlackConnected] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmailRecord[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Compose state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<string[]>([]);
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [maxEmailsPerHour, setMaxEmailsPerHour] = useState(200);

  // Send Later Popover state
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const getDefaultScheduledTime = () => {
    const d = new Date(Date.now() + 60000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const [scheduledAt, setScheduledAt] = useState(getDefaultScheduledTime());

  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState<string | null>(null);

  const fetchScheduled = useCallback(async () => {
    try {
      setLoadingScheduled(true);
      const res = await api.get('/emails/scheduled?limit=50');
      setScheduledEmails(res.data.emails || []);
    } catch (err) {
      console.error('Failed to fetch scheduled emails', err);
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  const fetchSent = useCallback(async () => {
    try {
      setLoadingSent(true);
      const res = await api.get('/emails/sent?limit=50');
      setSentEmails(res.data.emails || []);
    } catch (err) {
      console.error('Failed to fetch sent emails', err);
    } finally {
      setLoadingSent(false);
    }
  }, []);

  const fetchSlackStatus = useCallback(async () => {
    try {
      const res = await api.get('/slack/status');
      setIsSlackConnected(res.data.isConnected);
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
    fetchSent();
    fetchSlackStatus();

    const interval = setInterval(() => {
      fetchScheduled();
      fetchSent();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchScheduled, fetchSent, fetchSlackStatus]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    setSelectedEmail(null);
    try {
      const res = await api.get(`/emails/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res.data.results || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setComposeError(null);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const res = await api.post('/emails/preview-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParsedLeads(res.data.validEmails || []);
    } catch (err: any) {
      setComposeError(err.response?.data?.message || 'Failed to parse recipients file');
    }
  };

  const handleRemoveLead = (indexToRemove: number) => {
    setParsedLeads((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleScheduleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setComposeError(null);
    setComposeSuccess(null);

    if (!subject.trim()) {
      setComposeError('Subject line is required');
      return;
    }
    if (!body.trim()) {
      setComposeError('Email content is required');
      return;
    }
    if (parsedLeads.length === 0 && !file) {
      setComposeError('Please upload a recipient leads list (.csv or .txt)');
      return;
    }

    setComposeLoading(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('body', body.trim());
      formData.append('scheduledAt', new Date(scheduledAt).toISOString());
      formData.append('delayBetweenEmails', String(delaySeconds));
      formData.append('maxEmailsPerHour', String(maxEmailsPerHour));
      if (user?.email) formData.append('senderEmail', user.email);
      if (file) formData.append('file', file);

      await api.post('/emails/schedule', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setComposeSuccess('Campaign successfully scheduled!');
      setSubject('');
      setBody('');
      setFile(null);
      setParsedLeads([]);
      fetchScheduled();

      // Return to scheduled tab
      setTimeout(() => {
        setActiveTab('scheduled');
        setComposeSuccess(null);
      }, 1000);
    } catch (err: any) {
      setComposeError(err.response?.data?.message || 'Failed to schedule campaign');
    } finally {
      setComposeLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const totalScheduled = scheduledEmails.length;
  const totalSent = sentEmails.length;

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex font-sans text-slate-800">
      {/* 1. Left Sidebar (Figma Exact Layout & Styling) */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 p-5">
        <div>
          {/* Logo (Figma ONB / ReachInbox) */}
          <div className="flex items-center gap-2.5 mb-6 px-1">
            <div className="w-7 h-7 rounded-lg bg-[#00A854] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
              ONB
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">ReachInbox</span>
          </div>

          {/* User Profile Card (Figma Style) */}
          <div className="p-3 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'User'}`}
                alt={user?.name}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover bg-white shrink-0"
              />
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {user?.name || 'User'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'user@reachinbox.ai'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compose Button (Figma Pill) */}
          <button
            onClick={() => {
              setActiveTab('compose');
              setSelectedEmail(null);
              setSearchResults(null);
            }}
            className={`w-full py-2.5 px-4 rounded-full font-semibold text-xs tracking-wide flex items-center justify-center gap-2 border transition-all cursor-pointer mb-6 ${
              activeTab === 'compose'
                ? 'bg-[#00A854] text-white border-[#00A854] shadow-xs'
                : 'bg-emerald-50/70 hover:bg-emerald-100/70 text-[#00A854] border-emerald-300/80'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Compose</span>
          </button>

          {/* CORE Section Menu (Figma Exact) */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              CORE
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  setActiveTab('scheduled');
                  setSelectedEmail(null);
                  setSearchResults(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'scheduled' && !selectedEmail && !searchResults
                    ? 'bg-[#EDF9F0] text-[#00A854] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 opacity-80" />
                  <span>Scheduled</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200/80 text-slate-600">
                  {totalScheduled}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('sent');
                  setSelectedEmail(null);
                  setSearchResults(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'sent' && !selectedEmail && !searchResults
                    ? 'bg-[#EDF9F0] text-[#00A854] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4 opacity-80" />
                  <span>Sent</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200/80 text-slate-600">
                  {totalSent}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Slack Alert Link */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={() => setIsSlackOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Slack className={`w-3.5 h-3.5 ${isSlackConnected ? 'text-[#00A854]' : 'text-slate-400'}`} />
              <span>Slack Rate Alerts</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                isSlackConnected
                  ? 'bg-emerald-50 text-[#00A854]'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isSlackConnected ? 'Connected' : 'Setup'}
            </span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Search Bar (Figma Exact) */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between">
          <form onSubmit={handleSearch} className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) setSearchResults(null);
              }}
              placeholder="Search recipient or subject..."
              className="w-full pl-10 pr-16 py-2 rounded-xl border border-slate-200 bg-[#F8FAFC] text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00A854]" />
              <span>Limit: 200/hr</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Delay: 2s</span>
            </div>
            <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'User'}`}
              alt={user?.name}
              className="w-7 h-7 rounded-full border border-slate-200 object-cover bg-white shrink-0"
            />
          </div>
        </header>

        {/* View Switcher: Email Detail vs Compose vs List Views */}
        <div className="p-8 flex-1">
          {selectedEmail ? (
            /* Figma Email Detail / Thread View (Screen 3) */
            <EmailDetailView
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
            />
          ) : activeTab === 'compose' ? (
            /* Figma Compose New Email Screen (Screen 4) */
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8">
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('scheduled')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Compose New Email
                  </h2>
                </div>

                {/* Top Action Buttons (Figma: Send Later + Send) */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsSendLaterOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-emerald-300 text-[#00A854] hover:bg-emerald-50 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Send Later</span>
                  </button>

                  <button
                    onClick={() => handleScheduleSubmit()}
                    disabled={composeLoading}
                    className="px-5 py-1.5 rounded-full bg-[#00A854] hover:bg-[#009248] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{composeLoading ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
              </div>

              {/* Alerts */}
              {composeError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{composeError}</span>
                </div>
              )}

              {composeSuccess && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{composeSuccess}</span>
                </div>
              )}

              {/* Compose Form (Figma Exact Rows) */}
              <form onSubmit={handleScheduleSubmit} className="mt-6 space-y-3.5">
                {/* 1. From Row (Figma Style) */}
                <div className="flex items-center py-2 border-b border-slate-100 text-xs">
                  <span className="w-16 text-slate-400 font-medium">From</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <span>{user?.email || 'user@reachinbox.ai'}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                {/* 2. To Row with Lead Pills + Upload List (Figma Exact) */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs gap-3">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <span className="w-16 text-slate-400 font-medium shrink-0">To</span>
                    {parsedLeads.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {parsedLeads.slice(0, 4).map((lead, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EDF9F0] text-[#00A854] border border-emerald-200/80"
                          >
                            <span>{lead}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLead(idx)}
                              className="hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {parsedLeads.length > 4 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            +{parsedLeads.length - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">recipient@example.com</span>
                    )}
                  </div>

                  {/* Upload List Button */}
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 text-[#00A854] hover:bg-emerald-50 text-xs font-semibold cursor-pointer transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload List</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 3. Subject Row */}
                <div className="flex items-center py-2 border-b border-slate-100 text-xs">
                  <span className="w-16 text-slate-400 font-medium">Subject</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="flex-1 focus:outline-none text-slate-800 text-xs font-medium placeholder:text-slate-300 bg-transparent"
                    required
                  />
                </div>

                {/* 4. Inline Throttling Settings (Figma Exact) */}
                <div className="flex items-center gap-6 py-2 border-b border-slate-100 text-xs flex-wrap text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Delay, between 2 emails:</span>
                    <input
                      type="number"
                      min={0}
                      max={3600}
                      value={delaySeconds}
                      onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
                      className="w-12 px-2 py-0.5 border border-slate-200 rounded-md text-center text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-slate-400 text-[11px]">sec</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Hourly Limit:</span>
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={maxEmailsPerHour}
                      onChange={(e) => setMaxEmailsPerHour(parseInt(e.target.value) || 200)}
                      className="w-14 px-2 py-0.5 border border-slate-200 rounded-md text-center text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 ml-auto text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Scheduled for:</span>
                    <span className="text-slate-700 font-medium">
                      {new Date(scheduledAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>
                </div>

                {/* 5. Rich Text Toolbar (Figma Exact Icons) */}
                <div className="flex items-center gap-1 py-1.5 border-b border-slate-100 text-slate-400 text-xs flex-wrap">
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Undo">
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Redo">
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Typography">
                    <Type className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Bold">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Italic">
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Underline">
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Strikethrough">
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Align Left">
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Bullet List">
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Numbered List">
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Quote">
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Code">
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Insert Link">
                    <Link className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" className="p-1.5 hover:text-slate-700 rounded transition-colors" title="Insert Image">
                    <Image className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 6. Email Body Textarea */}
                <div className="pt-2">
                  <textarea
                    rows={12}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type Your Reply..."
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-y placeholder:text-slate-300 font-sans leading-relaxed"
                    required
                  />
                </div>
              </form>
            </div>
          ) : (
            /* Figma Homepage Lists for Scheduled & Sent */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {searchResults
                      ? `Search Results (${searchResults.length})`
                      : activeTab === 'scheduled'
                      ? `Scheduled Emails (${totalScheduled})`
                      : `Sent Emails (${totalSent})`}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeTab === 'scheduled'
                      ? 'Queued delivery batches with provider delay'
                      : 'Delivered outreach emails via Ethereal SMTP'}
                  </p>
                </div>
              </div>

              {searchResults ? (
                <ScheduledEmailsTable
                  emails={searchResults}
                  loading={searchLoading}
                  onRefresh={fetchScheduled}
                  onOpenCompose={() => setActiveTab('compose')}
                  onSelectEmail={(email) => setSelectedEmail(email)}
                />
              ) : activeTab === 'scheduled' ? (
                <ScheduledEmailsTable
                  emails={scheduledEmails}
                  loading={loadingScheduled}
                  onRefresh={fetchScheduled}
                  onOpenCompose={() => setActiveTab('compose')}
                  onSelectEmail={(email) => setSelectedEmail(email)}
                />
              ) : (
                <SentEmailsTable
                  emails={sentEmails}
                  loading={loadingSent}
                  onRefresh={fetchSent}
                  onSelectEmail={(email) => setSelectedEmail(email)}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Send Later Modal (Figma Exact) */}
      <SendLaterModal
        isOpen={isSendLaterOpen}
        onClose={() => setIsSendLaterOpen(false)}
        currentTime={scheduledAt}
        onConfirm={(newTime) => setScheduledAt(newTime)}
      />

      {/* Slack Integration Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        isConnected={isSlackConnected}
        onStatusChange={fetchSlackStatus}
      />
    </div>
  );
};

export default DashboardPage;
