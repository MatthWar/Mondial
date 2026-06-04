import { roomsStore, writeRoom, json } from "./storage.mjs";

const API_URL = "https://api.football-data.org/v4/competitions/WC/matches";

export default async () => {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return json({ ok: false, message: "FOOTBALL_DATA_TOKEN manquant" }, 200);

  const matches = await fetchFinishedMatches(token);
  const store = roomsStore();
  const { blobs } = await store.list();
  const updatedRooms = [];

  for (const blob of blobs) {
    const room = await store.get(blob.key, { type: "json" });
    if (!room?.assignments) continue;
    const updated = applyMatches(room, matches);
    await writeRoom(updated);
    updatedRooms.push(updated.code);
  }

  return json({ ok: true, matches: matches.length, updatedRooms });
};

export const config = {
  schedule: "0 23 * * *"
};

async function fetchFinishedMatches(token) {
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch(`${API_URL}?dateFrom=2026-06-01&dateTo=${today}`, {
    headers: { "X-Auth-Token": token }
  });
  if (!response.ok) throw new Error(`football-data.org ${response.status}`);
  const data = await response.json();
  return (data.matches || []).filter((match) => match.status === "FINISHED");
}

function applyMatches(room, matches) {
  const scoreByTeam = new Map();
  const matchLog = [];

  for (const match of matches) {
    const home = match.homeTeam?.name;
    const away = match.awayTeam?.name;
    const homeScore = match.score?.fullTime?.home;
    const awayScore = match.score?.fullTime?.away;
    if (!home || !away || homeScore == null || awayScore == null) continue;

    const homePoints = homeScore > awayScore ? 3 : homeScore === awayScore ? 1 : 0;
    const awayPoints = awayScore > homeScore ? 3 : homeScore === awayScore ? 1 : 0;
    addScore(scoreByTeam, home, homePoints);
    addScore(scoreByTeam, away, awayPoints);
    matchLog.push({ home, away, homeScore, awayScore, utcDate: match.utcDate });
  }

  const assignments = room.assignments.map((player) => ({
    ...player,
    teams: player.teams.map((team) => ({
      ...team,
      points: scoreFor(team, scoreByTeam)
    }))
  }));

  return {
    ...room,
    assignments,
    matchLog,
    updatedAt: new Date().toISOString()
  };
}

function addScore(map, name, points) {
  const key = normalize(name);
  map.set(key, (map.get(key) || 0) + points);
}

function scoreFor(team, map) {
  const names = [team.name, ...(team.aliases || [])];
  for (const name of names) {
    const score = map.get(normalize(name));
    if (score != null) return score;
  }
  return 0;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
