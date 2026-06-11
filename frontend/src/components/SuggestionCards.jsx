const TYPE_STYLES = {
  project: { className: 'suggestion-project', label: 'Project' },
  certification: { className: 'suggestion-certification', label: 'Certification' },
  course: { className: 'suggestion-course', label: 'Course' },
  skill: { className: 'suggestion-skill', label: 'Skill' },
  contribution: { className: 'suggestion-contribution', label: 'Contribution' },
};

export default function SuggestionCards({ suggestions = [] }) {
  if (!suggestions.length) return null;

  return (
    <div>
      <div className="section-heading">
        <div>
          <p className="section-label">Gap closing ideas</p>
          <h3>Recommended additions</h3>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {suggestions.map((suggestion, index) => {
          const style = TYPE_STYLES[suggestion.type] || TYPE_STYLES.skill;
          return (
            <div
              key={`${suggestion.title}-${index}`}
              className={`suggestion-card ${style.className}`}
            >
              <div className="suggestion-card-top">
                <span className="suggestion-badge">
                  {style.label}
                </span>
                <strong className="suggestion-title">{suggestion.title}</strong>
              </div>
              <p className="suggestion-why">{suggestion.why}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
