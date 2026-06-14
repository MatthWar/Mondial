import { roomsStore, writeRoom, json } from "./storage.mjs";
import { migrateRoomTeams } from "./team-migration.mjs";

export default async () => {
  const store = roomsStore();
  const { blobs } = await store.list();
  const migratedRooms = [];

  for (const blob of blobs) {
    const room = await store.get(blob.key, { type: "json" });
    const migration = migrateRoomTeams(room);
    if (!migration.changed) continue;

    await writeRoom(migration.room);
    migratedRooms.push({
      code: migration.room.code,
      replacements: migration.replacements.length
    });
  }

  return json({ ok: true, migratedRooms });
};
