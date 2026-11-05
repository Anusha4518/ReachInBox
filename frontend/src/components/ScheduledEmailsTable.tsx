import React from 'react';
import { EmailRecord } from '../types/email.js';
import { Calendar, Clock, RefreshCw } from 'lucide-react';

interface ScheduledEmailsTableProps {
  emails: EmailRecord[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCompose: () => void;
  onSelectEmail?: (email: EmailRecord) => void;
}

export const ScheduledEmailsTable: React.FC<ScheduledEmailsTableProps> = ({
  emails,
  loading,
  onRefresh,
  onOpenCompose,
  onSelectEmail,
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
      <div className="p-12 text-center">
        <div className="w-6 h-6 border-2 border-[#00A854] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-500 font-medium">Loading scheduled queue...</span>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-16 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#00A854] flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No scheduled emails yet</h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Compose an email or upload a lead list to schedule automated outreach.
        </p>
        <button
          onClick={onOpenCompose}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00A854] hover:bg-[#009248] text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
        >
          Compose New Email
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Subheader Toolbar */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#00A854]" />
          <span>{emails.length} queued emails</span>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 hover:text-slate-700 transition-colors cursor-pointer"
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
            className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
          >
            {/* Left: Recipient */}
            <div className="w-48 shrink-0 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 truncate">
                To: {email.recipientEmail.split('@')[0]}
              </span>
            </div>

            {/* Center: Tag + Subject + Body Snippet */}
            <div className="flex-1 flex items-center gap-2 overflow-hidden text-xs">
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Scheduled
              </span>

              <span className="font-medium text-slate-800 truncate shrink-0 max-w-xs">
                {email.subject}
              </span>

              <span className="text-slate-400 truncate hidden sm:inline">
                - {email.body}
              </span>
            </div>

            {/* Right: Scheduled Time */}
            <div className="shrink-0 text-[11px] text-slate-400 font-medium group-hover:text-slate-700 transition-colors">
              {formatTime(email.scheduledAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
