import { json, readRoom, writeRoom } from "./storage.mjs";

export default async (request) => {
  if (request.method === "OPTIONS") return json({});
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const room = await request.json();
  const code = String(room.code || "").toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) return json({ error: "Code salon invalide" }, 400);
  if (await readRoom(code)) return json({ error: "Ce code salon existe deja" }, 409);

  const cleanRoom = {
    ...room,
    code,
    createdAt: room.createdAt || new Date().toISOString(),
    updatedAt: null,
    matchLog: []
  };

  await writeRoom(cleanRoom);
  return json(cleanRoom);
};
