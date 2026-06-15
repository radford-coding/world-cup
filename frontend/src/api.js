const BASE = 'https://worldcup26.ir'

export async function fetchGames() {
  const res = await fetch(`${BASE}/get/games`)
  if (!res.ok) throw new Error('Failed to fetch games')
  return res.json()
}

export async function fetchTeams() {
  const res = await fetch(`${BASE}/get/teams`)
  if (!res.ok) throw new Error('Failed to fetch teams')
  return res.json()
}

export async function fetchGroups() {
  const res = await fetch(`${BASE}/get/groups`)
  if (!res.ok) throw new Error('Failed to fetch groups')
  return res.json()
}

export async function fetchStadiums() {
  const res = await fetch(`${BASE}/get/stadiums`)
  if (!res.ok) throw new Error('Failed to fetch stadiums')
  return res.json()
}
