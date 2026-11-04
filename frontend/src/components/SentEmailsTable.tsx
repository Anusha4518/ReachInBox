import React from 'react';
import { EmailRecord } from '../types/email.js';
import { Send, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface SentEmailsTableProps {
  emails: EmailRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({
  emails,
  loading,
  onRefresh,
}) => {
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'SENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Sent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3 h-3 text-rose-500" />
        Failed
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-500 font-medium">Loading sent delivery log...</span>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
          <Send className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">No sent emails recorded</h3>
        <p className="text-xs text-slate-500 mt-1.5">
          Processed emails sent through Ethereal SMTP will automatically show up here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Table Subheader */}
      <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {emails.length} processed emails</span>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-6 py-3">Recipient Email</th>
              <th className="px-6 py-3">Subject</th>
              <th className="px-6 py-3">Sent Time</th>
              <th className="px-6 py-3">Sender</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-3.5 font-medium text-slate-900">
                  {email.recipientEmail}
                </td>
                <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">
                  {email.subject}
                </td>
                <td className="px-6 py-3.5 text-slate-500">
                  {formatDateTime(email.sentAt || email.updatedAt)}
                </td>
                <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                  {email.sender?.email || 'Default'}
                </td>
                <td className="px-6 py-3.5">
                  {getStatusBadge(email.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
