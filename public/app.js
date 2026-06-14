import { defaultTeams } from "./data.js";

const state = {
  players: ["Equipe 1", "Equipe 2", "Equipe 3", "Equipe 4"],
  teams: structuredClone(defaultTeams),
  room: null,
  missingCode: "",
  loadingCode: "",
  notice: ""
};

const $ = (selector) => document.querySelector(selector);
const apiBase = "/api";

function cleanName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function balanceTeams(players, teams) {
  const activePlayers = players.map(cleanName).filter(Boolean);
  const activeTeams = teams
    .map((team) => ({ ...team, weight: clamp(Number(team.weight) || 1, 1, 100), points: 0 }))
    .filter((team) => cleanName(team.name));

  const perPlayer = Math.floor(activeTeams.length / activePlayers.length);
  const usableCount = perPlayer * activePlayers.length;
  const selectedTeams = activeTeams
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name))
    .slice(0, usableCount);
  const reserveTeams = activeTeams.slice(usableCount);

  const assignments = activePlayers.map((name) => ({ name, teams: [], startingScore: 0, score: 0 }));
  for (const team of selectedTeams) {
    const candidates = assignments.filter((player) => player.teams.length < perPlayer);
    candidates.sort((a, b) => a.startingScore - b.startingScore || a.teams.length - b.teams.length);
    candidates[0].teams.push(team);
    candidates[0].startingScore += team.weight;
  }

  improveBalance(assignments, perPlayer);
  assignments.forEach((player) => {
    player.startingScore = sum(player.teams, "weight");
    player.score = sum(player.teams, "points");
    player.teams.sort((a, b) => b.weight - a.weight);
  });

  return { assignments, reserveTeams, perPlayer };
}

function improveBalance(assignments, perPlayer) {
  let improved = true;
  let guard = 0;
  while (improved && guard < 300) {
    improved = false;
    guard += 1;
    assignments.sort((a, b) => b.startingScore - a.startingScore);
    const high = assignments[0];
    const low = assignments[assignments.length - 1];
    const currentGap = high.startingScore - low.startingScore;

    for (const highTeam of high.teams) {
      for (const lowTeam of low.teams) {
        const nextHigh = high.startingScore - highTeam.weight + lowTeam.weight;
        const nextLow = low.startingScore - lowTeam.weight + highTeam.weight;
        if (Math.abs(nextHigh - nextLow) < currentGap) {
          high.teams = high.teams.map((team) => (team.name === highTeam.name ? lowTeam : team));
          low.teams = low.teams.map((team) => (team.name === lowTeam.name ? highTeam : team));
          high.startingScore = nextHigh;
          low.startingScore = nextLow;
          improved = high.teams.length === perPlayer && low.teams.length === perPlayer;
          break;
        }
      }
      if (improved) break;
    }
  }
}

function sum(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function render() {
  const code = new URLSearchParams(location.search).get("salon");
  if (state.missingCode === code) {
    return renderMissingRoom(code);
  }
  if (code && !state.room) {
    if (state.loadingCode !== code) loadRoom(code);
    return renderShell("Chargement du salon...");
  }

  if (state.room) {
    renderRoom();
    return;
  }

  renderCreator();
}

function renderMissingRoom(code) {
  $("#app").innerHTML = `
    <section class="panel centered">
      <h1>Salon introuvable</h1>
      <p>Le code ${escapeHtml(code || "")} n'existe pas encore ou n'a pas ete cree sur ce site.</p>
      <button class="primary" id="newRoom">Creer un salon</button>
    </section>
  `;
  $("#newRoom").addEventListener("click", () => {
    state.missingCode = "";
    history.pushState({}, "", "/");
    renderCreator();
  });
}

function renderShell(message) {
  $("#app").innerHTML = `<section class="panel centered"><p>${message}</p></section>`;
}

function renderCreator() {
  const preview = balanceTeams(state.players, state.teams);
  $("#app").innerHTML = `
    <section class="hero">
      <div class="hero__content">
        <span class="eyebrow">Mondial en classe</span>
        <h1>Creer un salon et repartir les equipes equitablement.</h1>
        <p>Chaque joueur recoit le meme nombre d'equipes. L'application equilibre la somme des ponderations, puis suit les points du tournoi.</p>
        <div class="hero__actions">
          <button class="primary" id="createRoom">Valider le salon</button>
          <button class="ghost" id="shuffle">Recalculer</button>
        </div>
      </div>
    </section>

    <section class="workspace">
      <div class="toolbar">
        <div>
          <h2>Preparation</h2>
          <p>${state.teams.length} equipes, ${state.players.filter(Boolean).length} joueurs, ${preview.perPlayer || 0} equipes par joueur.</p>
        </div>
        <button class="iconText" id="addPlayer">+ Joueur</button>
      </div>

      <div class="split">
        <article class="panel">
          <h3>Joueurs</h3>
          <div class="list">${state.players.map(playerRow).join("")}</div>
        </article>

        <article class="panel">
          <h3>Equipes et ponderation</h3>
          <div class="teamsEditor">${state.teams.map(teamRow).join("")}</div>
        </article>
      </div>

      <article class="panel">
        <h3>Apercu de la repartition</h3>
        <div class="draftGrid">${preview.assignments.map(playerCard).join("")}</div>
      </article>
    </section>
  `;

  bindCreator();
}

function playerRow(name, index) {
  return `
    <label class="row">
      <span>Joueur ${index + 1}</span>
      <input data-player="${index}" value="${escapeHtml(name)}" aria-label="Nom du joueur ${index + 1}">
      <button class="small danger" data-remove-player="${index}" aria-label="Retirer">x</button>
    </label>
  `;
}

function teamRow(team, index) {
  return `
    <label class="teamRow">
      <input data-team-name="${index}" value="${escapeHtml(team.name)}" aria-label="Nom equipe">
      <input class="weight" data-team-weight="${index}" type="number" min="1" max="100" value="${team.weight}" aria-label="Ponderation">
    </label>
  `;
}

function playerCard(player, index) {
  return `
    <section class="playerCard">
      <div class="rank">${index + 1}</div>
      <div class="playerCard__head">
        <h4>${escapeHtml(player.name)}</h4>
        <strong>${player.startingScore}</strong>
      </div>
      <ul>${player.teams.map((team) => `<li><span>${escapeHtml(team.name)}</span><b>${team.weight}</b></li>`).join("")}</ul>
    </section>
  `;
}

function bindCreator() {
  $("#addPlayer").addEventListener("click", () => {
    state.players.push(`Equipe ${state.players.length + 1}`);
    renderCreator();
  });

  $("#shuffle").addEventListener("click", renderCreator);
  $("#createRoom").addEventListener("click", createRoom);

  document.querySelectorAll("[data-player]").forEach((input) => {
    input.addEventListener("input", (event) => {
      state.players[Number(event.target.dataset.player)] = event.target.value;
    });
  });

  document.querySelectorAll("[data-remove-player]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.players.length > 2) {
        state.players.splice(Number(button.dataset.removePlayer), 1);
        renderCreator();
      }
    });
  });

  document.querySelectorAll("[data-team-name]").forEach((input) => {
    input.addEventListener("input", (event) => {
      state.teams[Number(event.target.dataset.teamName)].name = event.target.value;
    });
  });

  document.querySelectorAll("[data-team-weight]").forEach((input) => {
    input.addEventListener("input", (event) => {
      state.teams[Number(event.target.dataset.teamWeight)].weight = clamp(Number(event.target.value), 1, 100);
    });
  });
}

async function createRoom() {
  const players = state.players.map(cleanName).filter(Boolean);
  if (players.length < 2) return flash("Ajoute au moins deux joueurs.");

  const draft = balanceTeams(players, state.teams);
  const room = {
    code: roomCode(),
    createdAt: new Date().toISOString(),
    updatedAt: null,
    perPlayer: draft.perPlayer,
    assignments: draft.assignments,
    reserveTeams: draft.reserveTeams,
    matchLog: []
  };

  state.room = await saveRoom(room);
  history.pushState({}, "", `?salon=${state.room.code}`);
  renderRoom();
}

async function saveRoom(room) {
  try {
    const response = await fetch(`${apiBase}/create-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(room)
    });
    if (!response.ok) throw new Error("Netlify function unavailable");
    return response.json();
  } catch {
    localStorage.setItem(`room:${room.code}`, JSON.stringify(room));
    return room;
  }
}

async function loadRoom(code) {
  state.loadingCode = code;
  try {
    const response = await fetch(`${apiBase}/get-room?code=${encodeURIComponent(code)}`);
    if (!response.ok) throw new Error("Salon introuvable");
    state.room = await response.json();
    state.missingCode = "";
  } catch {
    const localRoom = localStorage.getItem(`room:${code}`);
    state.room = localRoom ? JSON.parse(localRoom) : null;
    state.missingCode = state.room ? "" : code;
  }
  state.loadingCode = "";
  render();
}

function renderRoom() {
  const standings = state.room.assignments
    .map((player) => ({ ...player, score: sum(player.teams, "points"), startingScore: sum(player.teams, "weight") }))
    .sort((a, b) => b.score - a.score || b.startingScore - a.startingScore);
  const shareUrl = `${location.origin}${location.pathname}?salon=${state.room.code}`;

  $("#app").innerHTML = `
    <section class="scoreHeader">
      <div>
        <span class="eyebrow">Salon ${state.room.code}</span>
        <h1>Classement des joueurs</h1>
        <p>${state.room.perPlayer} equipes par joueur. Derniere mise a jour : ${formatDate(state.room.updatedAt)}.</p>
      </div>
      <div class="shareBox">
        <input readonly value="${shareUrl}" aria-label="Lien du salon">
        <button class="primary" id="copyLink">Copier le lien</button>
        <button id="refreshScores">Scores</button>
      </div>
    </section>

    <section class="workspace">
      <div class="podium">${standings.slice(0, 3).map(podiumCard).join("")}</div>
      <div class="draftGrid">${standings.map(scoreCard).join("")}</div>
      <article class="panel">
        <h3>Matchs pris en compte</h3>
        <div class="matchLog">${matchLog()}</div>
      </article>
    </section>
  `;

  $("#copyLink").addEventListener("click", async () => {
    await navigator.clipboard.writeText(shareUrl);
    flash("Lien copie.");
  });
  $("#refreshScores").addEventListener("click", refreshScores);
}

async function refreshScores() {
  flash("Mise a jour en cours...");
  try {
    await fetch(`${apiBase}/update-scores`);
    await loadRoom(state.room.code);
    flash("Scores mis a jour.");
  } catch {
    flash("La mise a jour sera disponible apres le deploiement Netlify.");
  }
}

function podiumCard(player, index) {
  return `
    <article class="podiumCard">
      <span>#${index + 1}</span>
      <h3>${escapeHtml(player.name)}</h3>
      <strong>${player.score} pts</strong>
    </article>
  `;
}

function scoreCard(player) {
  return `
    <section class="playerCard score">
      <div class="playerCard__head">
        <h4>${escapeHtml(player.name)}</h4>
        <strong>${player.score} pts</strong>
      </div>
      <ul>${player.teams.map((team) => `<li><span>${escapeHtml(team.name)}</span><b>${team.points || 0} pts</b><em>${team.weight}</em></li>`).join("")}</ul>
    </section>
  `;
}

function matchLog() {
  if (!state.room.matchLog?.length) return `<p>Aucun resultat final recupere pour le moment.</p>`;
  return state.room.matchLog
    .slice()
    .reverse()
    .map((match) => `<p>${escapeHtml(match.home)} ${match.homeScore}-${match.awayScore} ${escapeHtml(match.away)}</p>`)
    .join("");
}

function flash(message) {
  state.notice = message;
  $("#notice").textContent = message;
  setTimeout(() => {
    if (state.notice === message) $("#notice").textContent = "";
  }, 2600);
}

function formatDate(value) {
  if (!value) return "pas encore";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

window.addEventListener("popstate", () => {
  state.room = null;
  state.missingCode = "";
  state.loadingCode = "";
  render();
});

render();
