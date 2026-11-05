import React from 'react';
import { EmailRecord } from '../types/email.js';
import {
  ArrowLeft,
  Trash2,
  Star,
  MoreVertical,
  ChevronDown,
  Paperclip,
  CheckCircle2,
  Clock,
  Download,
} from 'lucide-react';

interface EmailDetailViewProps {
  email: EmailRecord;
  onBack: () => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({ email, onBack }) => {
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const senderInitial = (email.sender?.email || email.recipientEmail || 'R')
    .charAt(0)
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* 1. Header Toolbar (Figma Exact) */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
            {email.subject}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          <button
            className="p-1.5 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            title="Star"
          >
            <Star className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            title="More"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Email Content Body */}
      <div className="p-8 max-w-4xl">
        {/* Sender Info Row (Figma Exact) */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            {/* Green Avatar Circle */}
            <div className="w-10 h-10 rounded-full bg-[#00A854] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              {senderInitial}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  {email.sender?.email ? email.sender.email.split('@')[0] : 'Campaign Sender'}
                </span>
                <span className="text-xs text-slate-400">
                  {email.sender?.email || 'noreply@reachinbox.ai'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                <span>To:</span>
                <span className="font-medium text-slate-700">{email.recipientEmail}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </div>
            </div>
          </div>

          {/* Timestamp and Status Badge */}
          <div className="text-right shrink-0">
            <div className="text-[11px] text-slate-400">
              {formatDateTime(email.sentAt || email.scheduledAt)}
            </div>
            <div className="mt-1">
              {email.status === 'SENT' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#00A854] border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Sent
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <Clock className="w-3 h-3" />
                  Scheduled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Email Text Body (with support for Figma highlight callout box) */}
        <div className="prose prose-slate prose-sm text-xs text-slate-700 leading-relaxed space-y-4 pt-2 border-t border-slate-100">
          <p className="whitespace-pre-line">{email.body}</p>

          {/* Figma Style Highlight Callout Box */}
          <div className="my-6 p-4 rounded-xl bg-amber-50/70 border-l-4 border-amber-400 text-amber-900 text-xs">
            <div className="font-semibold text-slate-800">
              ReachInbox Outreach Automation
            </div>
            <div className="text-slate-600 mt-1">
              Scheduled via BullMQ persistent worker queue. Rate-limited and throttled safely.
            </div>
          </div>
        </div>

        {/* 3. Attachments Section (Figma Exact Cards at Bottom) */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-3">
            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
            <span>Attachments (1 file)</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-[#F8FAFC] hover:bg-slate-100 transition-colors cursor-pointer group max-w-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#00A854] flex items-center justify-center font-bold text-xs shrink-0">
                CSV
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#00A854] transition-colors">
                  campaign_recipients.csv
                </div>
                <div className="text-[10px] text-slate-400">1.2 KB • Validated leads</div>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 ml-auto shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

