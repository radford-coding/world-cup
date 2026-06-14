import { useState, useEffect } from 'react'
import { fetchGames } from '../api'
import TeamWithPerson from './TeamWithPerson'

function toLocalDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function statusLabel(status) {
  if (status === 'live') return 'LIVE'
  if (status === 'finished') return 'FT'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const dateStr = toLocalDateStr(selectedDate)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchGames(dateStr)
      .then(setGames)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [dateStr])

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
      {!loading && !error && games.length === 0 && (
        <div className="empty">No games scheduled for this date.</div>
      )}

      <div className="games-list">
        {games.map((g) => (
          <div key={g.id} className={`game-card status-${g.status}`}>
            <div className="game-status-bar">
              {statusLabel(g.status) && (
                <span className={`game-status status-${g.status}`}>{statusLabel(g.status)}</span>
              )}
              <span className="game-stage">{g.stage || g.round}</span>
            </div>
            <div className="game-matchup">
              <TeamWithPerson
                team={g.home_team}
                showScore
                score={g.home_score}
              />
              <div className="game-vs">
                {g.status === 'scheduled' ? (
                  <span className="vs">vs</span>
                ) : (
                  <span className="vs">vs</span>
                )}
              </div>
              <TeamWithPerson
                team={g.away_team}
                showScore
                score={g.away_score}
              />
            </div>
            <div className="game-meta">
              <span className="game-time">{formatTime(g.date)}</span>
              {g.venue && <span className="game-venue">{g.venue}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
