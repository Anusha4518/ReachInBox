import React from 'react';
import { EmailRecord } from '../types/email.js';
import { Calendar, Clock, RefreshCw, Sparkles, Plus } from 'lucide-react';

interface ScheduledEmailsTableProps {
  emails: EmailRecord[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCompose: () => void;
  onSelectEmail?: (email: EmailRecord) => void;
  onScheduleDemoLeads?: () => void;
  isDemoLoading?: boolean;
}

export const ScheduledEmailsTable: React.FC<ScheduledEmailsTableProps> = ({
  emails,
  loading,
  onRefresh,
  onOpenCompose,
  onSelectEmail,
  onScheduleDemoLeads,
  isDemoLoading,
}) => {
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isTomorrow =
        new Date(now.getTime() + 86400000).toDateString() === d.toDateString();

      const timeStr = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      if (isToday) return `Today, ${timeStr}`;
      if (isTomorrow) return `Tomorrow, ${timeStr}`;

      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-7 h-7 border-2 border-[#00A854] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-500 font-medium">Loading scheduled queue...</span>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="py-16 px-6 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#00A854] flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-2xs">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No scheduled emails in queue</h3>
        <p className="text-xs text-slate-400 mt-1.5 mb-6 max-w-sm mx-auto leading-relaxed">
          Compose your first cold outreach sequence or load demo leads to test automated sending.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={onOpenCompose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00A854] hover:bg-[#009248] text-white font-semibold text-xs transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Compose New Email</span>
          </button>
          {onScheduleDemoLeads && (
            <button
              onClick={onScheduleDemoLeads}
              disabled={isDemoLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isDemoLoading ? 'Scheduling...' : 'Load 6 Sample Leads'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Subheader Toolbar */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400 bg-[#FAFAFB]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#00A854]" />
          <span className="font-medium text-slate-600">{emails.length} queued emails</span>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer text-slate-500"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Figma Email List Rows */}
      <div className="divide-y divide-slate-100">
        {emails.map((email) => (
          <div
            key={email.id}
            onClick={() => onSelectEmail && onSelectEmail(email)}
            className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
          >
            {/* Left: Recipient */}
            <div className="w-52 shrink-0 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 truncate">
                To: {email.recipientEmail.split('@')[0]}
              </span>
            </div>

            {/* Center: Tag + Subject + Body Snippet */}
            <div className="flex-1 flex items-center gap-2.5 overflow-hidden text-xs">
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/90">
                Scheduled
              </span>

              <span className="font-semibold text-slate-800 truncate shrink-0 max-w-xs">
                {email.subject}
              </span>

              <span className="text-slate-400 truncate hidden md:inline">
                - {email.body}
              </span>
            </div>

            {/* Right: Scheduled Time */}
            <div className="shrink-0 text-xs text-slate-400 font-medium group-hover:text-slate-700 transition-colors">
              {formatTime(email.scheduledAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
