import React, { useState } from 'react';
import { X, Slack, CheckCircle2, Unlink, ExternalLink } from 'lucide-react';
import { api } from '../services/api.js';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onStatusChange: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  onStatusChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState('#email-alerts');

  if (!isOpen) return null;

  const handleOAuthConnect = () => {
    window.location.href = '/api/slack/connect';
  };

  const handleQuickConnect = async () => {
    setLoading(true);
    try {
      await api.post('/slack/test-connect', {
        webhookUrl: 'https://hooks.slack.com/services/DEMO/REACHINBOX/TEST',
        channel: channel.trim(),
      });
      onStatusChange();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to connect Slack');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await api.post('/slack/disconnect');
      onStatusChange();
      onClose();
    } catch (err: any) {
      alert('Failed to disconnect Slack');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
              <Slack className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Slack Notification Alerts</h3>
              <p className="text-xs text-slate-500">Hourly rate limit alert dispatch</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs text-slate-600">
          <p>
            When a sender hits the hourly sending limit (e.g. 200 emails/hr), ReachInbox dispatches an immediate notification to your Slack channel.
          </p>

          {isConnected ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Slack Workspace Connected</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Rate-limit notifications are active. If an hourly ceiling is breached, alerts will be posted automatically.
              </p>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-rose-700 hover:bg-rose-50 text-xs font-medium transition-colors"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect Slack</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Option A: OAuth button */}
              <button
                onClick={handleOAuthConnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4A154B] hover:bg-[#3d113e] text-white font-medium text-xs shadow-xs transition-colors"
              >
                <Slack className="w-4 h-4" />
                <span>Connect via Slack OAuth</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[10px] text-slate-400 uppercase tracking-wider">or quick test</span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {/* Option B: Quick connect dev test */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Target Channel or Webhook URL (for demo testing):
                </label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="#email-alerts"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                />
                <button
                  onClick={handleQuickConnect}
                  disabled={loading}
                  className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
                >
                  {loading ? 'Connecting...' : 'Enable Slack Alerts (Demo Mode)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

