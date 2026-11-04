import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { EmailRecord } from '../types/email.js';
import { ComposeEmailModal } from '../components/ComposeEmailModal.js';
import { ScheduledEmailsTable } from '../components/ScheduledEmailsTable.js';
import { SentEmailsTable } from '../components/SentEmailsTable.js';
import { SlackModal } from '../components/SlackModal.js';
import {
  Mail,
  LogOut,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Slack,
  Send,
  Search,
  ExternalLink,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isSlackConnected, setIsSlackConnected] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmailRecord[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

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
    } catch (err) {
      console.warn('Slack status check:', err);
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
    fetchSent();
    fetchSlackStatus();

    // Auto poll every 10 seconds for live email status updates
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
    try {
      const res = await api.get(`/emails/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res.data.results || []);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Metrics
  const totalScheduled = scheduledEmails.length;
  const totalSent = sentEmails.filter((e) => e.status === 'SENT').length;
  const totalFailed = sentEmails.filter((e) => e.status === 'FAILED').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">ReachInbox</span>
              <span className="hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                Email Scheduler
              </span>
            </div>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3">
              {/* BullMQ Dashboard Link */}
              <a
                href="http://localhost:5000/admin/queues"
                target="_blank"
                rel="noreferrer"
                title="Open live BullMQ queue dashboard"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>BullMQ Queue UI</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>

              {/* Slack Connection Pill */}
              <button
                onClick={() => setIsSlackOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  isSlackConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Slack className={`w-3.5 h-3.5 ${isSlackConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Slack:</span>
                <span className={isSlackConnected ? 'font-bold text-emerald-700' : 'text-amber-600 font-semibold'}>
                  {isSlackConnected ? 'Connected' : 'Connect'}
                </span>
              </button>

              {/* User Avatar & Logout */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Reach'}`}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover bg-slate-100"
                />
                <div className="hidden lg:block text-left text-xs leading-tight">
                  <div className="font-semibold text-slate-900">{user?.name || 'User'}</div>
                  <div className="text-slate-500 truncate max-w-[130px]">{user?.email}</div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Heading & Main Action */}
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Production email scheduling with BullMQ delayed queues, rate limits, and Ethereal SMTP.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            <button
              onClick={() => setIsComposeOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <Plus className="w-4 h-4" />
              <span>Compose New Email</span>
            </button>
          </div>
        </div>

        {/* Minimal Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Scheduled Queue</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{totalScheduled}</div>
            <div className="text-xs text-slate-400 mt-1">BullMQ delayed jobs</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Sent Successfully</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{totalSent}</div>
            <div className="text-xs text-slate-400 mt-1">Delivered via SMTP</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Failed Delivery</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{totalFailed}</div>
            <div className="text-xs text-slate-400 mt-1">Logged errors</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Hourly Sending Limit</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">200 / hr</div>
            <div className="text-xs text-slate-400 mt-1">2000ms provider delay</div>
          </div>
        </div>

        {/* Search Bar (Elasticsearch backed) */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) setSearchResults(null);
              }}
              placeholder="Search emails by recipient or subject (Elasticsearch)..."
              className="w-full pl-10 pr-20 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults(null);
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={searchLoading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {searchLoading ? '...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Navigation Tabs and Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 px-6 pt-4 flex gap-6">
            <button
              onClick={() => {
                setActiveTab('scheduled');
                setSearchResults(null);
              }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'scheduled' && !searchResults
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails ({totalScheduled})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sent');
                setSearchResults(null);
              }}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'sent' && !searchResults
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent Emails ({sentEmails.length})</span>
            </button>

            {searchResults && (
              <div className="pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 border-blue-600 text-blue-600">
                <Search className="w-4 h-4" />
                <span>Search Results ({searchResults.length})</span>
              </div>
            )}
          </div>

          {/* Table Panels */}
          {searchResults ? (
            <ScheduledEmailsTable
              emails={searchResults}
              loading={searchLoading}
              onRefresh={fetchScheduled}
              onOpenCompose={() => setIsComposeOpen(true)}
            />
          ) : activeTab === 'scheduled' ? (
            <ScheduledEmailsTable
              emails={scheduledEmails}
              loading={loadingScheduled}
              onRefresh={fetchScheduled}
              onOpenCompose={() => setIsComposeOpen(true)}
            />
          ) : (
            <SentEmailsTable
              emails={sentEmails}
              loading={loadingSent}
              onRefresh={fetchSent}
            />
          )}
        </div>
      </main>

      {/* Compose Email Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          fetchScheduled();
          setActiveTab('scheduled');
        }}
        senderEmail={user?.email}
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
