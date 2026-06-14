const BASE = '/api'

export async function fetchGames(date) {
  const res = await fetch(`${BASE}/games/?date=${date}`)
  if (!res.ok) throw new Error('Failed to fetch games')
  return res.json()
}

export async function fetchTeams() {
  const res = await fetch(`${BASE}/teams/`)
  if (!res.ok) throw new Error('Failed to fetch teams')
  return res.json()
}

export async function fetchStandings() {
  const res = await fetch(`${BASE}/standings/`)
  if (!res.ok) throw new Error('Failed to fetch standings')
  return res.json()
}
