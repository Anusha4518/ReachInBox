import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  senderEmail?: string;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  senderEmail,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{
    validEmails: string[];
    validCount: number;
    invalidCount: number;
  } | null>(null);

  // Default to 1 minute from now in local timezone format
  const getDefaultScheduledTime = () => {
    const d = new Date(Date.now() + 60000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [scheduledAt, setScheduledAt] = useState(getDefaultScheduledTime());
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [maxEmailsPerHour, setMaxEmailsPerHour] = useState(200);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setErrorMsg(null);

    // Call preview endpoint
    const formData = new FormData();
    formData.append('file', selected);

    try {
      const response = await api.post('/emails/preview-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreviewInfo(response.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to parse recipients file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!subject.trim()) {
      setErrorMsg('Subject is required');
      return;
    }
    if (!body.trim()) {
      setErrorMsg('Email body is required');
      return;
    }
    if (!file && (!previewInfo || previewInfo.validCount === 0)) {
      setErrorMsg('Please upload a CSV or TXT file containing recipient email leads');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('body', body.trim());
      formData.append('scheduledAt', new Date(scheduledAt).toISOString());
      formData.append('delayBetweenEmails', String(delaySeconds));
      formData.append('maxEmailsPerHour', String(maxEmailsPerHour));
      if (senderEmail) formData.append('senderEmail', senderEmail);
      if (file) formData.append('file', file);

      await api.post('/emails/schedule', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Compose New Campaign</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload leads and schedule persistent automated delivery
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Line *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scaling outreach with ReachInbox AI"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              required
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Content *
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email template here..."
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all resize-y"
              required
            />
          </div>

          {/* CSV File Upload & Parsing */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Leads (CSV or TXT file) *
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-slate-50/50">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-medium text-slate-700">
                  {file ? file.name : 'Click to upload or drag & drop .csv / .txt file'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Extracts and de-duplicates valid email addresses automatically
                </span>
              </div>
            </div>

            {/* Parsing Feedback */}
            {previewInfo && (
              <div className="mt-2.5 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Detected <strong>{previewInfo.validCount}</strong> valid recipient leads
                  </span>
                </div>
                {previewInfo.invalidCount > 0 && (
                  <span className="text-amber-700 text-[11px]">
                    ({previewInfo.invalidCount} invalid rows ignored)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Schedule Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delay Between (sec)
              </label>
              <input
                type="number"
                min={0}
                max={3600}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hourly Limit
              </label>
              <input
                type="number"
                min={1}
                max={5000}
                value={maxEmailsPerHour}
                onChange={(e) => setMaxEmailsPerHour(parseInt(e.target.value) || 200)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs transition-all disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{loading ? 'Scheduling...' : 'Schedule Campaign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

