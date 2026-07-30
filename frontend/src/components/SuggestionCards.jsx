const TYPE_STYLES = {
  project:       { className: 'bg-blue-50/80 border-blue-200 text-blue-800',    label: 'Project' },
  certification: { className: 'bg-amber-50/80 border-amber-200 text-amber-800', label: 'Certification' },
  course:        { className: 'bg-emerald-50/80 border-emerald-200 text-emerald-800', label: 'Course' },
  skill:         { className: 'bg-orange-50/80 border-orange-200 text-orange-800',    label: 'Skill' },
  contribution:  { className: 'bg-slate-50/80 border-slate-300 text-slate-700',       label: 'Contribution' },
};

export default function SuggestionCards({ suggestions = [] }) {
  if (!suggestions.length) return null;

  return (
    <div>
      {/* Header */}
      <div className="pb-4.5 mb-4.5 border-b border-slate-200">
        <p className="m-0 mb-1 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Gap closing ideas</p>
        <h3 className="text-xl leading-tight tracking-tight font-bold text-slate-900 m-0">Recommended additions</h3>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {suggestions.map((suggestion, index) => {
          const style = TYPE_STYLES[suggestion.type] || TYPE_STYLES.skill;
          return (
            <div
              key={`${suggestion.title}-${index}`}
              className={`p-4.5 border rounded-2xl ${style.className}`}
            >
              <div className="flex items-center justify-between gap-3.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/70 text-[11px] font-extrabold tracking-[0.08em] uppercase">
                  {style.label}
                </span>
                <strong className="text-inherit text-sm">{suggestion.title}</strong>
              </div>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-slate-700/80">{suggestion.why}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
