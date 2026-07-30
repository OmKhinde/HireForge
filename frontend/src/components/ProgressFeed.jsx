import { useEffect, useRef } from 'react';

export default function ProgressFeed({ steps = [], status }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  if (steps.length === 0 && status === 'queued') {
    return (
      <div className="border border-slate-200 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 p-3.5 font-mono text-[13px] leading-relaxed">
        <div className="flex items-center justify-between mb-2.5 pb-2.5 border-b border-slate-200/40">
          <div className="flex gap-1.5">
            <span className="w-[9px] h-[9px] rounded-full bg-red-300" />
            <span className="w-[9px] h-[9px] rounded-full bg-orange-300" />
            <span className="w-[9px] h-[9px] rounded-full bg-green-300" />
          </div>
          <span className="text-slate-600 text-xs">agent-log</span>
        </div>
        <p className="m-0 text-slate-600">Job queued. A worker will pick it up shortly.</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 p-3.5 font-mono text-[13px] leading-relaxed max-h-[260px] overflow-y-auto scrollbar-thin">
      {/* macOS dots header */}
      <div className="flex items-center justify-between mb-2.5 pb-2.5 border-b border-slate-200/40">
        <div className="flex gap-1.5">
          <span className="w-[9px] h-[9px] rounded-full bg-red-300" />
          <span className="w-[9px] h-[9px] rounded-full bg-orange-300" />
          <span className="w-[9px] h-[9px] rounded-full bg-green-300" />
        </div>
        <span className="text-slate-600 text-xs">optimization-log</span>
      </div>

      {/* Steps */}
      {steps.map((step, i) => (
        <div
          key={i}
          className={`flex gap-2.5 text-slate-500 ${i > 0 ? 'mt-1' : ''} ${
            i === steps.length - 1 && status === 'processing' ? 'text-slate-900 font-medium' : ''
          }`}
        >
          <span className="text-indigo-600">
            {i === steps.length - 1 && status === 'done' ? '✓' : '→'}
          </span>
          {step}
        </div>
      ))}

      {status === 'processing' && (
        <div className="flex gap-2.5 mt-1 text-amber-700">
          <span className="animate-[pulse-dot_1.5s_ease-in-out_infinite]">◌</span>
          Processing...
        </div>
      )}

      {status === 'done' && (
        <div className="flex gap-2.5 mt-1 text-emerald-600 font-medium">
          <span>✓</span>
          Complete
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
