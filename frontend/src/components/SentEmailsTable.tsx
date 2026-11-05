import React from 'react';
import { EmailRecord } from '../types/email.js';
import { Send, RefreshCw, CheckCircle2 } from 'lucide-react';

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
      <div className="py-20 text-center">
        <div className="w-7 h-7 border-2 border-[#00A854] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-500 font-medium">Loading sent emails...</span>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="py-16 px-6 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-200">
          <Send className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No sent emails recorded</h3>
        <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
          Processed emails delivered via Ethereal SMTP will automatically show up here with live status.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Subheader Toolbar */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400 bg-[#FAFAFB]">
        <div className="flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-[#00A854]" />
          <span className="font-medium text-slate-600">{emails.length} delivered emails</span>
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
              <div className="w-2 h-2 rounded-full bg-[#00A854] shrink-0" />
              <span className="text-xs font-semibold text-slate-800 truncate">
                To: {email.recipientEmail.split('@')[0]}
              </span>
            </div>

            {/* Center: Tag + Subject + Body Snippet */}
            <div className="flex-1 flex items-center gap-2.5 overflow-hidden text-xs">
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-[#00A854] border border-emerald-200">
                Sent
              </span>

              <span className="font-semibold text-slate-800 truncate shrink-0 max-w-xs">
                {email.subject}
              </span>

              <span className="text-slate-400 truncate hidden md:inline">
                - {email.body}
              </span>
            </div>

            {/* Right: Sent Time */}
            <div className="shrink-0 text-xs text-slate-400 font-medium group-hover:text-slate-700 transition-colors">
              {formatTime(email.sentAt || email.updatedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
