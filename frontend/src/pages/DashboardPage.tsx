import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  Mail,
  LogOut,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Slack,
  Send,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">ReachInbox</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                Email Scheduler
              </span>
            </div>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-4">
              {/* Slack status pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <Slack className="w-3.5 h-3.5 text-slate-700" />
                <span>Slack:</span>
                <span className="text-amber-600 font-semibold">Not Connected</span>
              </div>

              {/* User Avatar & Name */}
              <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-200">
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Reach'}`}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover bg-slate-100"
                />
                <div className="hidden md:block text-left text-xs leading-tight">
                  <div className="font-semibold text-slate-900">{user?.name || 'User'}</div>
                  <div className="text-slate-500 truncate max-w-[140px]">{user?.email}</div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
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
              Manage and track your scheduled email campaigns and outbound delivery limits.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-3">
            <button
              onClick={() => alert('Compose Modal will open in Phase 4/11')}
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
              <span>Scheduled</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">0</div>
            <div className="text-xs text-slate-400 mt-1">Delayed jobs waiting</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Sent Successfully</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">0</div>
            <div className="text-xs text-slate-400 mt-1">Total delivered</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Failed</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">0</div>
            <div className="text-xs text-slate-400 mt-1">Delivery errors</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Rate Limit (Hourly)</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">200 / hr</div>
            <div className="text-xs text-slate-400 mt-1">2000ms delay enforced</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 px-6 pt-4 flex gap-6">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'scheduled'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails</span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'sent'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Sent Emails</span>
            </button>
          </div>

          {/* Table Container / Empty State */}
          <div className="p-8 text-center">
            {activeTab === 'scheduled' ? (
              <div className="max-w-md mx-auto py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No scheduled emails yet</h3>
                <p className="text-xs text-slate-500 mt-1.5 mb-5">
                  Compose an email or upload a CSV recipient list to schedule your first delivery.
                </p>
                <button
                  onClick={() => alert('Compose will open in Phase 4/11')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Schedule your first email
                </button>
              </div>
            ) : (
              <div className="max-w-md mx-auto py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">No sent emails recorded</h3>
                <p className="text-xs text-slate-500 mt-1.5">
                  Processed emails sent through Ethereal SMTP will automatically show up here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
