import { useState, useEffect } from 'react'
import { fetchStandings } from '../api'

export default function Standings() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchStandings()
      .then(setStandings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="loading">Loading standings...</div></div>
  if (error) return <div className="page"><div className="error">{error}</div></div>

  const maxTeams = Math.max(...standings.map((s) => s.teams.length), 0)

  return (
    <div className="page standings-page">
      <div className="page-header">
        <h1>Standings</h1>
      </div>

      {standings.length === 0 ? (
        <div className="empty">No standings data available yet. Assign teams to people in the admin panel.</div>
      ) : (
        <div className="standings-table-wrapper">
          <table className="standings-table">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th className="col-person">Person</th>
                <th className="col-total">Total</th>
                {Array.from({ length: maxTeams }).map((_, i) => (
                  <th key={i} className="col-team-cell">Team {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((entry, idx) => (
                <tr key={entry.person.id} className="standings-row">
                  <td className="col-rank">{idx + 1}</td>
                  <td className="col-person">
                    <span className="person-name">{entry.person.name}</span>
                  </td>
                  <td className="col-total">
                    <span className="total-points">{entry.total_points}</span>
                  </td>
                  {Array.from({ length: maxTeams }).map((_, i) => {
                    const team = entry.teams[i]
                    return (
                      <td key={i} className="col-team-cell">
                        {team ? (
                          <div className="standing-team">
                            <div className="standing-team-header">
                              {team.flag_url && (
                                <img className="mini-flag" src={team.flag_url} alt="" />
                              )}
                              <span className="standing-team-name">{team.name}</span>
                              <span className="standing-team-pts">{team.team_points}pts</span>
                            </div>
                            <span className="standing-team-pos">{team.position_display}</span>
                          </div>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
