import { json, readRoom } from "./storage.mjs";

export default async (request) => {
  const url = new URL(request.url);
  const code = String(url.searchParams.get("code") || "").toUpperCase();
  const room = await readRoom(code);
  if (!room) return json({ error: "Salon introuvable" }, 404);
  return json(room);
};
