import { json, readRoom, writeRoom } from "./storage.mjs";
import { migrateRoomTeams } from "./team-migration.mjs";

export default async (request) => {
  const url = new URL(request.url);
  const code = String(url.searchParams.get("code") || "").toUpperCase();
  const room = await readRoom(code);
  if (!room) return json({ error: "Salon introuvable" }, 404);
  const migration = migrateRoomTeams(room);
  if (migration.changed) await writeRoom(migration.room);
  return json(migration.room);
};
