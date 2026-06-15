import { useState, useEffect } from 'react'
import { fetchTeams, fetchGroups, fetchGames } from '../api'
import TeamWithPerson from './TeamWithPerson'

const TYPE_LABELS = {
  group: 'Group Stage',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  third: 'Third Place',
  final: 'Final',
}

const ROUND_ORDER = ['r32', 'r16', 'qf', 'sf', 'third', 'final']

export default function Teams() {
  const [teamsMap, setTeamsMap] = useState({})
  const [groups, setGroups] = useState(null)
  const [knockoutGames, setKnockoutGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('groups')

  const stage = groups ? 'group' : null

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchTeams(), fetchGroups(), fetchGames()])
      .then(([teamsData, groupsData, gamesData]) => {
        const tmap = {}
        teamsData.teams.forEach((t) => {
          tmap[t.id] = {
            id: t.id,
            name: t.name_en,
            flag_url: t.flag,
            country_code: t.iso2,
          }
        })
        setTeamsMap(tmap)

        const grouped = {}
        groupsData.groups.forEach((g) => {
          grouped[g.name] = g.teams.map((entry, idx) => {
            const teamInfo = tmap[entry.team_id] || { name: `Team #${entry.team_id}` }
            return {
              id: entry.team_id,
              name: teamInfo.name,
              flag_url: teamInfo.flag_url,
              country_code: teamInfo.country_code,
              group_position: idx + 1,
              played: parseInt(entry.mp),
              wins: parseInt(entry.w),
              draws: parseInt(entry.d),
              losses: parseInt(entry.l),
              goals_for: parseInt(entry.gf),
              goals_against: parseInt(entry.ga),
              goal_diff: parseInt(entry.gd),
              points: parseInt(entry.pts),
            }
          })
        })
        setGroups(grouped)

        const knockouts = gamesData.games.filter((g) => g.type !== 'group')
        setKnockoutGames(knockouts)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="loading">Loading teams...</div></div>
  if (error) return <div className="page"><div className="error">{error}</div></div>
  if (!groups) return null

  return (
    <div className="page teams-page">
      <div className="page-header">
        <h1>Teams</h1>
        <div className="team-tabs">
          <button className={`tab-btn${tab === 'groups' ? ' active' : ''}`} onClick={() => setTab('groups')}>Groups</button>
          <button className={`tab-btn${tab === 'knockout' ? ' active' : ''}`} onClick={() => setTab('knockout')}>Knockout</button>
        </div>
      </div>

      {tab === 'groups' && <GroupView groups={groups} />}
      {tab === 'knockout' && <KnockoutView games={knockoutGames} teamsMap={teamsMap} />}
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

function KnockoutView({ games, teamsMap }) {
  const rounds = {}
  games.forEach((g) => {
    if (!rounds[g.type]) rounds[g.type] = []
    rounds[g.type].push(g)
  })

  const orderedRounds = ROUND_ORDER.filter((r) => rounds[r])

  if (orderedRounds.length === 0) {
    return <div className="empty">No knockout games available yet.</div>
  }

  return (
    <div className="knockout-view">
      {orderedRounds.map((roundType) => {
        const roundGames = rounds[roundType]
        const roundName = TYPE_LABELS[roundType] || roundType
        const allSettled = roundGames.every((g) => g.time_elapsed === 'finished')

        return (
          <div key={roundType} className="knockout-round">
            <h2 className="round-title">
              {roundName}
              {allSettled && <span className="round-complete">Complete</span>}
            </h2>
            <div className="round-games">
              {roundGames.map((g) => {
                const homeTeam = teamsMap[g.home_team_id] || {
                  name: g.home_team_label || g.home_team_name_en || 'TBD',
                }
                const awayTeam = teamsMap[g.away_team_id] || {
                  name: g.away_team_label || g.away_team_name_en || 'TBD',
                }
                const homeScore = parseInt(g.home_score)
                const awayScore = parseInt(g.away_score)
                const finished = g.time_elapsed === 'finished'
                const homeWin = finished && homeScore > awayScore
                const awayWin = finished && awayScore > homeScore

                return (
                  <div key={g.id} className={`knockout-game ${finished ? 'settled' : ''}`}>
                    <div className={`ko-team ${homeWin ? 'winner' : ''}`}>
                      <TeamWithPerson team={homeTeam} showScore score={homeScore} />
                    </div>
                    <div className={`ko-team ${awayWin ? 'winner' : ''}`}>
                      <TeamWithPerson team={awayTeam} showScore score={awayScore} />
                    </div>
                    {g.time_elapsed !== 'finished' && (
                      <div className="ko-time">
                        {new Date(g.local_date).toLocaleDateString('en', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
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
