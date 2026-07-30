export default function KeywordHeatmap({ keywordMap }) {
  if (!keywordMap || Object.keys(keywordMap).length === 0) return null;

  const present = Object.entries(keywordMap).filter(([, value]) => value === 'present');
  const missing = Object.entries(keywordMap).filter(([, value]) => value === 'missing');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3.5 pb-4.5 mb-4.5 border-b border-slate-200 max-md:flex-col max-md:items-start">
        <div>
          <p className="m-0 mb-1 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Keyword coverage</p>
          <h3 className="text-xl leading-tight tracking-tight font-bold text-slate-900 m-0">Match map</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center justify-center min-h-[26px] px-2.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
            {present.length} present
          </span>
          <span className="inline-flex items-center justify-center min-h-[26px] px-2.5 rounded-full text-xs font-bold text-red-700 bg-red-50 border border-red-200">
            {missing.length} missing
          </span>
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-row flex-wrap gap-2">
        {present.map(([keyword]) => (
          <span
            key={keyword}
            className="inline-flex items-center px-3 py-2.5 rounded-full text-[13px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200"
          >
            {keyword}
          </span>
        ))}
        {missing.map(([keyword]) => (
          <span
            key={keyword}
            className="inline-flex items-center px-3 py-2.5 rounded-full text-[13px] font-semibold text-amber-800 bg-amber-50 border border-amber-200"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}
