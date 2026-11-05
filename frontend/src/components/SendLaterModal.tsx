import React, { useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';

interface SendLaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduledTimeIso: string) => void;
  currentTime: string;
}

export const SendLaterModal: React.FC<SendLaterModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentTime,
}) => {
  if (!isOpen) return null;

  const [selectedTime, setSelectedTime] = useState(currentTime);

  const getPresetTime = (hours: number, minutes: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // tomorrow
    d.setHours(hours, minutes, 0, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const presets = [
    { label: 'Tomorrow', time: getPresetTime(9, 0) },
    { label: 'Tomorrow, 10:00 AM', time: getPresetTime(10, 0) },
    { label: 'Tomorrow, 11:30 AM', time: getPresetTime(11, 30) },
    { label: 'Tomorrow, 3:00 PM', time: getPresetTime(15, 0) },
  ];

  const handleDone = () => {
    onConfirm(selectedTime);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-2xs p-4">
      {/* Figma Popover Card */}
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl border border-slate-200/90 p-5 font-sans animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Send Later</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date & Time Picker */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">
            Pick date & time
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="datetime-local"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-[#F8FAFC]"
            />
          </div>
        </div>

        {/* Quick Presets List (Figma Exact) */}
        <div className="mt-4 space-y-1">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedTime(preset.time)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                selectedTime === preset.time
                  ? 'bg-[#EDF9F0] text-[#00A854] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 opacity-70" />
                <span>{preset.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Action Buttons (Figma: Cancel + Done) */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="px-4 py-1.5 rounded-xl bg-[#00A854] hover:bg-[#009248] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

