import { useState, useEffect } from 'react'
import { fetchTeams } from '../api'
import TeamWithPerson from './TeamWithPerson'

export default function Teams() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchTeams()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="loading">Loading teams...</div></div>
  if (error) return <div className="page"><div className="error">{error}</div></div>
  if (!data) return null

  return (
    <div className="page teams-page">
      <div className="page-header">
        <h1>Teams</h1>
        <span className="stage-badge">{data.stage === 'group' ? 'Group Stage' : 'Knockout Stage'}</span>
      </div>

      {data.stage === 'group' ? (
        <GroupView groups={data.groups} />
      ) : (
        <KnockoutView rounds={data.rounds} />
      )}
    </div>
  )
}

function GroupView({ groups }) {
  return (
    <div className="groups-grid">
      {Object.entries(groups).map(([groupName, teams]) => (
        <div key={groupName} className="group-card">
          <h2 className="group-title">Group {groupName}</h2>
          <table className="group-table">
            <thead>
              <tr>
                <th className="col-pos">#</th>
                <th className="col-team">Team</th>
                <th className="col-num">P</th>
                <th className="col-num">W</th>
                <th className="col-num">D</th>
                <th className="col-num">L</th>
                <th className="col-num">GF</th>
                <th className="col-num">GA</th>
                <th className="col-num">GD</th>
                <th className="col-num">Pts</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className={`group-row ${team.group_position <= 2 ? 'qualifying' : ''}`}>
                  <td className="col-pos">{team.group_position}</td>
                  <td className="col-team">
                    <TeamWithPerson team={team} />
                  </td>
                  <td className="col-num">{team.played}</td>
                  <td className="col-num">{team.wins}</td>
                  <td className="col-num">{team.draws}</td>
                  <td className="col-num">{team.losses}</td>
                  <td className="col-num">{team.goals_for}</td>
                  <td className="col-num">{team.goals_against}</td>
                  <td className="col-num">{team.goal_diff}</td>
                  <td className="col-num pts">{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function KnockoutView({ rounds }) {
  const roundOrder = ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final']
  const orderedRounds = roundOrder.filter((r) => rounds[r])

  return (
    <div className="knockout-view">
      {orderedRounds.map((roundName) => {
        const games = rounds[roundName]
        const allSettled = games.every((g) => g.status === 'finished')
        return (
          <div key={roundName} className="knockout-round">
            <h2 className="round-title">
              {roundName}
              {allSettled && <span className="round-complete">Complete</span>}
            </h2>
            <div className="round-games">
              {games.map((g) => {
                const homeWin = g.status === 'finished' && g.home_score > g.away_score
                const awayWin = g.status === 'finished' && g.away_score > g.home_score
                const draw = g.status === 'finished' && g.home_score === g.away_score
                return (
                  <div key={g.id} className={`knockout-game ${g.status === 'finished' ? 'settled' : ''}`}>
                    <div className={`ko-team ${homeWin ? 'winner' : ''}`}>
                      <TeamWithPerson team={g.home_team} showScore score={g.home_score} />
                    </div>
                    <div className={`ko-team ${awayWin ? 'winner' : ''}`}>
                      <TeamWithPerson team={g.away_team} showScore score={g.away_score} />
                    </div>
                    {g.status === 'scheduled' && (
                      <div className="ko-time">
                        {new Date(g.date).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
