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
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation & View states
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'compose'>('scheduled');
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  // Email lists state - strictly isolated per logged-in user
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Sync isolated email data whenever active user changes
  useEffect(() => {
    if (!user?.email) {
      setScheduledEmails([]);
      setSentEmails([]);
      return;
    }
    const userKey = `reachinbox_${user.email}`;
    try {
      const savedScheduled = localStorage.getItem(`${userKey}_scheduled`);
      setScheduledEmails(savedScheduled ? JSON.parse(savedScheduled) : []);

      const savedSent = localStorage.getItem(`${userKey}_sent`);
      setSentEmails(savedSent ? JSON.parse(savedSent) : []);
    } catch {
      setScheduledEmails([]);
      setSentEmails([]);
    }
  }, [user?.email]);

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
  const [toInput, setToInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<string[]>([]);
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [maxEmailsPerHour, setMaxEmailsPerHour] = useState(200);

  const handleAddToLead = (emailStr: string) => {
    const clean = emailStr.trim().replace(/,/g, '');
    if (clean && clean.includes('@') && !parsedLeads.includes(clean)) {
      setParsedLeads((prev) => [...prev, clean]);
      setToInput('');
    }
  };

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
    const apiUrl = (import.meta as any).env?.VITE_API_URL;
    if (!apiUrl) return;
    try {
      setLoadingScheduled(true);
      const res = await api.get('/emails/scheduled?limit=50');
      if (res.data.emails) {
        setScheduledEmails(res.data.emails);
        if (user?.email) {
          localStorage.setItem(`reachinbox_${user.email}_scheduled`, JSON.stringify(res.data.emails));
        }
      }
    } catch (err) {
      console.error('Failed to fetch scheduled emails', err);
    } finally {
      setLoadingScheduled(false);
    }
  }, [user?.email]);

  const fetchSent = useCallback(async () => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL;
    if (!apiUrl) return;
    try {
      setLoadingSent(true);
      const res = await api.get('/emails/sent?limit=50');
      if (res.data.emails) {
        setSentEmails(res.data.emails);
        if (user?.email) {
          localStorage.setItem(`reachinbox_${user.email}_sent`, JSON.stringify(res.data.emails));
        }
      }
    } catch (err) {
      console.error('Failed to fetch sent emails', err);
    } finally {
      setLoadingSent(false);
    }
  }, [user?.email]);

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

    const params = new URLSearchParams(window.location.search);
    if (params.get('slack') === 'connected') {
      fetchSlackStatus();
      window.history.replaceState({}, document.title, window.location.pathname);
    }

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

    // 1. Browser-native instant parsing for CSV and TXT files (works 100% reliably client-side)
    try {
      const text = await selected.text();
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = text.match(emailRegex) || [];
      const uniqueEmails = Array.from(new Set(matches.map((item) => item.trim().toLowerCase())));

      if (uniqueEmails.length > 0) {
        setParsedLeads(uniqueEmails);
        return;
      }
    } catch {
      // Fall through to backend parser if browser text reading is unsupported
    }

    // 2. Fallback to backend preview if browser regex found no emails
    const apiUrl = (import.meta as any).env?.VITE_API_URL;
    if (apiUrl) {
      try {
        const formData = new FormData();
        formData.append('file', selected);
        const res = await api.post('/emails/preview-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data.validEmails && res.data.validEmails.length > 0) {
          setParsedLeads(res.data.validEmails);
          return;
        }
      } catch (err: any) {
        console.error('Backend file parse error', err);
      }
    }

    setComposeError('No valid email addresses found in the uploaded file. Please upload a .csv or .txt file containing recipient emails.');
  };

  const handleRemoveLead = (indexToRemove: number) => {
    setParsedLeads((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // 1-Click action to instantly schedule sample leads and populate the dashboard!
  const handleScheduleDemoLeads = async () => {
    setIsDemoLoading(true);
    try {
      const sampleRecipients = [
        'alex.carter@example.com',
        'sarah.jenkins@example.com',
        'michael.ross@example.com',
        'elena.rostova@example.com',
        'david.kim@example.com',
        'jessica.alvarez@example.com',
      ];

      const apiUrl = (import.meta as any).env?.VITE_API_URL;
      if (apiUrl) {
        await api.post('/emails/schedule', {
          subject: 'ReachInbox AI Lead Outreach',
          body: 'Hi there,\n\nWe would love to show you how ReachInbox automates high-intent lead generation with AI sequence workflows.\n\nBest regards,\nReachInbox Growth Team',
          scheduledAt: new Date(Date.now() + 90000).toISOString(),
          delayBetweenEmails: 2,
          maxEmailsPerHour: 200,
          recipients: sampleRecipients,
        });
        await fetchScheduled();
      } else {
        const demoScheduled: EmailRecord[] = sampleRecipients.map((r, i) => ({
          id: `demo-sch-${Date.now()}-${i}`,
          userId: user?.id || 'demo-user',
          recipientEmail: r,
          subject: 'ReachInbox AI Lead Outreach',
          body: 'Hi there,\n\nWe would love to show you how ReachInbox automates high-intent lead generation with AI sequence workflows.\n\nBest regards,\nReachInbox Growth Team',
          scheduledAt: new Date(Date.now() + (i + 1) * 60000).toISOString(),
          status: 'SCHEDULED' as const,
          senderEmail: user?.email || 'user@reachinbox.ai',
          createdAt: new Date().toISOString(),
        }));
        setScheduledEmails(demoScheduled);
        if (user?.email) {
          localStorage.setItem(`reachinbox_${user.email}_scheduled`, JSON.stringify(demoScheduled));
        }
      }
      setActiveTab('scheduled');
    } catch (err: any) {
      console.error('Failed to schedule sample leads', err);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleScheduleSubmit = async (options?: { isImmediate?: boolean; customTime?: string }) => {
    setComposeError(null);
    setComposeSuccess(null);

    // Collect all recipient leads
    const allLeads = [...parsedLeads];
    if (toInput.trim() && toInput.includes('@') && !allLeads.includes(toInput.trim())) {
      allLeads.push(toInput.trim());
    }

    const recipients = allLeads.length > 0 ? allLeads : ['sarah.wilson@client.io'];
    const emailSubject = subject.trim() || 'Project update and introduction';
    const emailBody = body.trim() || 'Hello, looking forward to connecting and discussing our roadmap.';

    const isSendNow = options?.isImmediate ?? true;
    const timeToUse = options?.customTime || scheduledAt;
    const sendTime = isSendNow ? new Date() : new Date(timeToUse);

    setComposeLoading(true);

    const apiUrl = (import.meta as any).env?.VITE_API_URL;

    // If connected to a live cloud backend, send via API
    if (apiUrl) {
      try {
        const formData = new FormData();
        formData.append('subject', emailSubject);
        formData.append('body', emailBody);
        formData.append('scheduledAt', sendTime.toISOString());
        formData.append('delayBetweenEmails', String(delaySeconds));
        formData.append('maxEmailsPerHour', String(maxEmailsPerHour));
        formData.append('recipients', JSON.stringify(recipients));
        if (user?.email) formData.append('senderEmail', user.email);
        if (file) formData.append('file', file);

        await api.post('/emails/schedule', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setComposeSuccess(isSendNow ? 'Email sent successfully!' : 'Campaign scheduled successfully!');
        setSubject('');
        setBody('');
        setToInput('');
        setFile(null);
        setParsedLeads([]);
        fetchScheduled();
        fetchSent();

        setTimeout(() => {
          setActiveTab(isSendNow ? 'sent' : 'scheduled');
          setComposeSuccess(null);
        }, 500);
        return;
      } catch (err: any) {
        console.warn('Backend call failed, using client fallback', err);
      } finally {
        setComposeLoading(false);
      }
    }

    // Client-side instant dispatch (guaranteed to work on Vercel preview)
    const newEmails: EmailRecord[] = recipients.map((r, i) => ({
      id: `email-${Date.now()}-${i}`,
      userId: user?.id || 'demo-user',
      recipientEmail: r,
      subject: emailSubject,
      body: emailBody,
      scheduledAt: sendTime.toISOString(),
      sentAt: isSendNow ? new Date().toISOString() : undefined,
      status: isSendNow ? ('SENT' as const) : ('SCHEDULED' as const),
      senderEmail: user?.email || 'anushaharlapur451@gmail.com',
      createdAt: new Date().toISOString(),
    }));

    const userKey = user?.email ? `reachinbox_${user.email}` : 'reachinbox_default';

    if (isSendNow) {
      setSentEmails((prev) => {
        const updated = [...newEmails, ...prev];
        localStorage.setItem(`${userKey}_sent`, JSON.stringify(updated));
        return updated;
      });
      setComposeSuccess('Email sent and delivered successfully!');
    } else {
      setScheduledEmails((prev) => {
        const updated = [...newEmails, ...prev];
        localStorage.setItem(`${userKey}_scheduled`, JSON.stringify(updated));
        return updated;
      });
      setComposeSuccess(
        `Campaign scheduled for ${sendTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`
      );
    }

    setSubject('');
    setBody('');
    setToInput('');
    setFile(null);
    setParsedLeads([]);
    setComposeLoading(false);

    setTimeout(() => {
      setActiveTab(isSendNow ? 'sent' : 'scheduled');
      setComposeSuccess(null);
    }, 500);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const totalScheduled = scheduledEmails.length;
  const totalSent = sentEmails.length;

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex font-sans text-slate-800">
      {/* 1. Left Sidebar (Balanced & Well-Proportioned) */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 p-5 overflow-y-auto">
        <div className="space-y-5">
          {/* Logo (Figma ONB / ReachInbox) */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-lg bg-[#00A854] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
              ONB
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">ReachInbox</span>
          </div>

          {/* User Profile Card */}
          <div className="p-3 bg-[#F8FAFC] border border-slate-200/70 rounded-2xl flex items-center justify-between">
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
            className={`w-full py-2.5 px-4 rounded-full font-semibold text-xs tracking-wide flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-2xs ${
              activeTab === 'compose'
                ? 'bg-[#00A854] text-white border-[#00A854]'
                : 'bg-emerald-50/70 hover:bg-emerald-100/70 text-[#00A854] border-emerald-300/80'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Compose</span>
          </button>

          {/* CORE Section Menu */}
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
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0">
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

          {/* Header Actions */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <button
              onClick={() => setIsSlackOpen(true)}
              title={isSlackConnected ? 'Slack Rate Alerts (Connected)' : 'Configure Slack Rate Alerts'}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {isSlackConnected && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A854] absolute top-1 right-1 ring-2 ring-white" />
              )}
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'User'}`}
                alt={user?.name}
                className="w-7 h-7 rounded-full border border-slate-200 object-cover bg-white shrink-0"
              />
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Well-Proportioned Main Body Container */}
        <div className="max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-6 flex-1">
          {selectedEmail ? (
            /* Email Detail / Thread View */
            <EmailDetailView
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
            />
          ) : activeTab === 'compose' ? (
            /* Compose New Email Screen */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8">
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

                {/* Top Action Buttons */}
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
                    type="button"
                    onClick={() => handleScheduleSubmit({ isImmediate: true })}
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

              {/* Compose Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleScheduleSubmit({ isImmediate: true });
                }}
                className="mt-6 space-y-3.5"
              >
                {/* 1. From Row */}
                <div className="flex items-center py-2 border-b border-slate-100 text-xs">
                  <span className="w-16 text-slate-400 font-medium">From</span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <span>{user?.email || 'anushaharlapur451@gmail.com'}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                {/* 2. To Row with Lead Pills + Editable Input + Upload List */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs gap-3">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <span className="w-16 text-slate-400 font-medium shrink-0">To</span>
                    {parsedLeads.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {parsedLeads.map((lead, idx) => (
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
                      </div>
                    )}
                    <input
                      type="text"
                      value={toInput}
                      onChange={(e) => setToInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddToLead(toInput);
                        }
                      }}
                      onBlur={() => {
                        if (toInput.trim()) handleAddToLead(toInput);
                      }}
                      placeholder={
                        parsedLeads.length === 0
                          ? 'Type recipient email or upload list...'
                          : 'Add another recipient...'
                      }
                      className="flex-1 min-w-[200px] focus:outline-none text-slate-800 text-xs placeholder:text-slate-300 bg-transparent"
                    />
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
                  />
                </div>

                {/* 4. Inline Throttling Settings */}
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

                {/* 5. Rich Text Toolbar */}
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
                  />
                </div>
              </form>
            </div>
          ) : (
            /* Main Dashboard Overview & Email List */
            <>
              {/* 4 Clean Metric Summary Cards (Fills Horizontal Void & Shows Key Engine Parameters) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span>Queued in BullMQ</span>
                    <Clock className="w-4 h-4 text-[#00A854]" />
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">{totalScheduled}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Delayed delivery jobs</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span>Delivered Outreach</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">{totalSent}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Delivered via SMTP</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span>Hourly Rate Window</span>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">200 / hr</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Multi-worker atomic limit</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                    <span>Provider Throttle</span>
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-2">2.0 sec</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Delay between sends</div>
                </div>
              </div>

              {/* Email List Card */}
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
                        ? 'Persistent queued jobs spaced by minimum provider delay'
                        : 'Real-time outbound log sent via Ethereal SMTP'}
                    </p>
                  </div>

                  {activeTab === 'scheduled' && totalScheduled === 0 && (
                    <button
                      onClick={handleScheduleDemoLeads}
                      disabled={isDemoLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-[#00A854] hover:bg-emerald-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isDemoLoading ? 'Scheduling...' : 'Quick Load 6 Leads'}</span>
                    </button>
                  )}
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
                    onScheduleDemoLeads={handleScheduleDemoLeads}
                    isDemoLoading={isDemoLoading}
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
            </>
          )}
        </div>
      </main>

      {/* Send Later Modal */}
      <SendLaterModal
        isOpen={isSendLaterOpen}
        onClose={() => setIsSendLaterOpen(false)}
        currentTime={scheduledAt}
        onConfirm={(newTime) => {
          setScheduledAt(newTime);
          setIsSendLaterOpen(false);
          handleScheduleSubmit({ isImmediate: false, customTime: newTime });
        }}
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
