import React from 'react';
import { EmailRecord } from '../types/email.js';
import { Send, RefreshCw } from 'lucide-react';

interface SentEmailsTableProps {
  emails: EmailRecord[];
  loading: boolean;
  onRefresh: () => void;
  onSelectEmail?: (email: EmailRecord) => void;
}

export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({
  emails,
  loading,
  onRefresh,
  onSelectEmail,
}) => {
  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();

      const timeStr = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      if (isToday) return `Today, ${timeStr}`;

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
        <span className="text-xs text-slate-500 font-medium">Loading sent emails...</span>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-16 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Send className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No sent emails recorded</h3>
        <p className="text-xs text-slate-400 mt-1">
          Emails delivered via Ethereal SMTP will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Subheader Toolbar */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-[#00A854]" />
          <span>{emails.length} delivered emails</span>
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
              <div className="w-2 h-2 rounded-full bg-[#00A854] shrink-0" />
              <span className="text-xs font-semibold text-slate-800 truncate">
                To: {email.recipientEmail.split('@')[0]}
              </span>
            </div>

            {/* Center: Tag + Subject + Body Snippet */}
            <div className="flex-1 flex items-center gap-2 overflow-hidden text-xs">
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-[#00A854] border border-emerald-200">
                Sent
              </span>

              <span className="font-medium text-slate-800 truncate shrink-0 max-w-xs">
                {email.subject}
              </span>

              <span className="text-slate-400 truncate hidden sm:inline">
                - {email.body}
              </span>
            </div>

            {/* Right: Sent Time */}
            <div className="shrink-0 text-[11px] text-slate-400 font-medium group-hover:text-slate-700 transition-colors">
              {formatTime(email.sentAt || email.updatedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
