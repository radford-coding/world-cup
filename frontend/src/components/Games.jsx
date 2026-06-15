import { useState, useEffect } from 'react'
import { fetchGames, fetchTeams, fetchStadiums } from '../api'
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

function parseLocalDate(dateStr) {
  const [datePart, timePart] = dateStr.split(' ')
  const [month, day, year] = datePart.split('/')
  return new Date(`${year}-${month}-${day}T${timePart}`)
}

function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sameDay(d1, d2) {
  return toLocalDateStr(d1) === toLocalDateStr(d2)
}

function formatTime(dateStr) {
  const d = parseLocalDate(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function statusLabel(timeElapsed) {
  if (timeElapsed === 'finished') return 'FT'
  if (timeElapsed === 'live') return 'LIVE'
  if (timeElapsed === 'secondhalf') return '2H'
  if (timeElapsed === 'firsthalf') return '1H'
  return ''
}

const presets = []
const today = new Date()
for (let i = -7; i <= 7; i++) {
  const d = new Date(today)
  d.setDate(d.getDate() + i)
  presets.push(d)
}

export default function Games() {
  const [selectedDate, setSelectedDate] = useState(today)
  const [games, setGames] = useState([])
  const [teamsMap, setTeamsMap] = useState({})
  const [stadiumsMap, setStadiumsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const dateStr = toLocalDateStr(selectedDate)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([fetchGames(), fetchTeams(), fetchStadiums()])
      .then(([gamesData, teamsData, stadiumsData]) => {
        const tmap = {}
        teamsData.teams.forEach((t) => {
          tmap[t.id] = {
            id: t.id,
            name: t.name_en,
            flag_url: t.flag,
            country_code: t.iso2,
          }
        })
        const smap = {}
        stadiumsData.stadiums.forEach((s) => {
          smap[s.id] = s.name_en
        })
        setTeamsMap(tmap)
        setStadiumsMap(smap)
        setGames(gamesData.games)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredGames = games.filter((g) => {
    return sameDay(parseLocalDate(g.local_date), selectedDate)
  })

  const sortedGames = [...filteredGames].sort((a, b) => {
    return parseLocalDate(a.local_date) - parseLocalDate(b.local_date)
  })

  const isToday = toLocalDateStr(today) === dateStr

  return (
    <div className="page games-page">
      <div className="page-header">
        <h1>Games</h1>
        <div className="date-selector">
          <button
            className="date-nav"
            onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() - 1)
              setSelectedDate(d)
            }}
          >
            &larr;
          </button>
          <div className="date-presets">
            {presets.map((d) => {
              const ds = toLocalDateStr(d)
              const label = ds === dateStr
                ? (isToday ? 'Today' : d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }))
                : d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
              const isActive = ds === dateStr
              return (
                <button
                  key={ds}
                  className={`date-chip${isActive ? ' active' : ''}`}
                  onClick={() => setSelectedDate(d)}
                >
                  {isActive && isToday ? 'Today' : label}
                </button>
              )
            })}
          </div>
          <button
            className="date-nav"
            onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() + 1)
              setSelectedDate(d)
            }}
          >
            &rarr;
          </button>
        </div>
        <input
          type="date"
          className="date-input"
          value={dateStr}
          onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
        />
      </div>

      {loading && <div className="loading">Loading games...</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && sortedGames.length === 0 && (
        <div className="empty">No games scheduled for this date.</div>
      )}

      <div className="games-list">
        {sortedGames.map((g) => {
          const homeTeam = teamsMap[g.home_team_id] || {
            name: g.home_team_label || g.home_team_name_en || `Team #${g.home_team_id}`,
          }
          const awayTeam = teamsMap[g.away_team_id] || {
            name: g.away_team_label || g.away_team_name_en || `Team #${g.away_team_id}`,
          }
          const status = g.time_elapsed === 'finished' ? 'finished' : 'scheduled'
          const stage = TYPE_LABELS[g.type] || g.type
          const venue = stadiumsMap[g.stadium_id]

          return (
            <div key={g.id} className={`game-card status-${status}`}>
              <div className="game-status-bar">
                {statusLabel(g.time_elapsed) && (
                  <span className={`game-status status-${status}`}>{statusLabel(g.time_elapsed)}</span>
                )}
                <span className="game-stage">{stage}</span>
              </div>
              <div className="game-matchup">
                <TeamWithPerson
                  team={homeTeam}
                  showScore
                  score={parseInt(g.home_score)}
                />
                <div className="game-vs">
                  <span className="vs">vs</span>
                </div>
                <TeamWithPerson
                  team={awayTeam}
                  showScore
                  score={parseInt(g.away_score)}
                />
              </div>
              <div className="game-meta">
                <span className="game-time">{formatTime(g.local_date)}</span>
                {venue && <span className="game-venue">{venue}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
