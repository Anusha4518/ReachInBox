import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
      <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">ReachInbox Email Scheduler</h1>
        <p className="text-sm text-slate-600 mb-4">
          Production-minded email scheduling application with Redis BullMQ, Ethereal SMTP, and Slack limits.
        </p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Phase 1: Project Setup Active
        </span>
      </div>
    </div>
  );
};

export default App;
