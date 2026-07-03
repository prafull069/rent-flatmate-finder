export default function CompatibilityBadge({ compatibility }) {
  if (!compatibility) return null;
  const { score, explanation, source } = compatibility;

  return (
    <div className="keyhole-score">
      <div className="score-number">{score}%</div>
      <div>
        <div className="score-explanation">{explanation}</div>
        {source === "FALLBACK" && (
          <div className="score-badge-fallback">estimated · AI scoring unavailable</div>
        )}
      </div>
    </div>
  );
}
