import { getStore } from "@netlify/blobs";

export const roomsStore = () => getStore("mondial-rooms");

export async function readRoom(code) {
  if (!code) return null;
  return roomsStore().get(code.toUpperCase(), { type: "json" });
}

export async function writeRoom(room) {
  await roomsStore().setJSON(room.code.toUpperCase(), room);
  return room;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    }
  });
}
