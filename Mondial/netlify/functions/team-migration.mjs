const TEAM_REPLACEMENTS = [
  replacement("Italie", "Norvege", ["Norway"]),
  replacement("Nigeria", "Autriche", ["Austria"]),
  replacement("Serbie", "Tchequie", ["Czechia", "Czech Republic"]),
  replacement("Danemark", "Ecosse", ["Scotland"]),
  replacement("Pologne", "Bosnie-Herzegovine", ["Bosnia-Herzegovina", "Bosnia and Herzegovina"]),
  replacement("Ukraine", "Ouzbekistan", ["Uzbekistan"]),
  replacement("Perou", "Irak", ["Iraq"]),
  replacement("Chili", "RD Congo", ["DR Congo", "Congo DR"]),
  replacement("Cameroun", "Jordanie", ["Jordan"]),
  replacement("Costa Rica", "Cap-Vert", ["Cape Verde Islands", "Cape Verde", "Cabo Verde"]),
  replacement("Jamaique", "Haiti", ["Haiti"]),
  replacement("Bolivie", "Curacao", ["Curaçao", "Curacao"])
];

const replacementByName = new Map(
  TEAM_REPLACEMENTS.flatMap((item) => item.from.map((name) => [normalize(name), item.to]))
);

const aliasesByTeamName = new Map(
  TEAM_REPLACEMENTS.map((item) => [normalize(item.to.name), item.to.aliases])
);

export function migrateRoomTeams(room) {
  if (!room?.assignments) return { room, changed: false, replacements: [] };

  const replacements = [];
  const assignments = room.assignments.map((player) => ({
    ...player,
    teams: player.teams.map((team) => {
      const replacementTeam = replacementByName.get(normalize(team.name));
      if (!replacementTeam) {
        const aliases = aliasesByTeamName.get(normalize(team.name));
        if (!aliases || sameAliases(team.aliases, aliases)) return team;

        replacements.push({
          player: player.name,
          from: team.name,
          to: team.name,
          aliasesUpdated: true
        });

        return {
          ...team,
          aliases
        };
      }

      replacements.push({
        player: player.name,
        from: team.name,
        to: replacementTeam.name
      });

      return {
        ...team,
        name: replacementTeam.name,
        aliases: replacementTeam.aliases,
        migratedFrom: team.migratedFrom || team.name
      };
    })
  }));

  if (!replacements.length) return { room, changed: false, replacements: [] };

  return {
    changed: true,
    replacements,
    room: {
      ...room,
      assignments,
      teamMigration: {
        version: "2026-official-teams-v1",
        updatedAt: new Date().toISOString(),
        replacements
      }
    }
  };
}

function replacement(from, name, aliases) {
  return {
    from: [from],
    to: { name, aliases }
  };
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function sameAliases(current = [], next = []) {
  if (current.length !== next.length) return false;
  return current.every((alias, index) => alias === next[index]);
}
