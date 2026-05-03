import { nanoid } from "nanoid";

const STORAGE_KEY = "pixelboard-client-id";

export function getClientId() {
  if (typeof window === "undefined") return "server-render";

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const id = nanoid(24);
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
