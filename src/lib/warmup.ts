// src/lib/warmup.ts
import { API_BASE } from "./api";

export async function warmUpBackend() {
  const url = `${API_BASE.replace(/\/$/, "")}/health`;
  try {
    await fetch(url, { method: "GET", mode: "cors" });
  } catch {
    // ignore
  }
}