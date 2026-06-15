import { useState, useEffect } from 'react'
import { fetchTeams, fetchGroups } from '../api'

export default function Standings() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchTeams(), fetchGroups()])
      .then(([teamsData, groupsData]) => {
        const tmap = {}
        teamsData.teams.forEach((t) => {
          tmap[t.id] = t.name_en
        })

        const allTeams = []
        groupsData.groups.forEach((g) => {
          g.teams.forEach((entry, idx) => {
            allTeams.push({
              ...entry,
              group: g.name,
              position: idx + 1,
              team_name: tmap[entry.team_id] || `Team #${entry.team_id}`,
              pts: parseInt(entry.pts),
              gd: parseInt(entry.gd),
              gf: parseInt(entry.gf),
              ga: parseInt(entry.ga),
              mp: parseInt(entry.mp),
              w: parseInt(entry.w),
              d: parseInt(entry.d),
              l: parseInt(entry.l),
            })
          })
        })

        allTeams.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

        const groupLabels = {}
        groupsData.groups.forEach((g) => {
          groupLabels[g.name] = g.name
        })

        setData({ teams: allTeams, groups: groupLabels })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="loading">Loading standings...</div></div>
  if (error) return <div className="page"><div className="error">{error}</div></div>
  if (!data || data.teams.length === 0) {
    return (
      <div className="page">
        <div className="empty">No standings data available yet.</div>
      </div>
    )
  }

  return (
    <div className="page standings-page">
      <div className="page-header">
        <h1>Standings</h1>
      </div>
      <div className="standings-table-wrapper">
        <table className="standings-table">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-team-wide">Team</th>
              <th className="col-num">Group</th>
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
            {data.teams.map((team, idx) => (
              <tr key={team.team_id} className="standings-row">
                <td className="col-rank">{idx + 1}</td>
                <td className="col-team-wide">
                  <span className="standing-team-name">{team.team_name}</span>
                </td>
                <td className="col-num">{team.group}</td>
                <td className="col-num">{team.mp}</td>
                <td className="col-num">{team.w}</td>
                <td className="col-num">{team.d}</td>
                <td className="col-num">{team.l}</td>
                <td className="col-num">{team.gf}</td>
                <td className="col-num">{team.ga}</td>
                <td className="col-num">{team.gd}</td>
                <td className="col-num pts">{team.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
