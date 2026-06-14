export default function TeamWithPerson({ team, showScore, score, size }) {
  const flagUrl = team.flag_url
    || (team.country_code ? `https://flagcdn.com/24x18/${team.country_code.toLowerCase()}.png` : null)
  const persons = team.persons || []

  return (
    <div className={`team-with-person ${size || ''}`}>
      <div className="team-info">
        {flagUrl && <img className="team-flag" src={flagUrl} alt="" />}
        <span className="team-name">{team.name}</span>
      </div>
      {showScore && score !== undefined && score !== null && (
        <span className="team-score">{score}</span>
      )}
      {persons.length > 0 && (
        <div className="person-tags">
          {persons.map((p) => (
            <span key={p.id} className="person-tag">{p.name}</span>
          ))}
        </div>
      )}
    </div>
  )
}
