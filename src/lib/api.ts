// src/lib/api.ts

export const API_BASE =
  // Vite
  (import.meta as any)?.env?.VITE_API_BASE ||
  // Next.js fallback if you ever switch
  (globalThis as any)?.process?.env?.NEXT_PUBLIC_API_BASE ||
  // Hard fallback (Render backend)
  "https://fir-mitra-backend-1.onrender.com";

export type TapasaRequest = {
  text: string;
  k?: number;
  lang?: "mr" | "en";
};

export type TapasaResponse = {
  missing_words?: string[];
  suggested_sections?: Array<{
    id?: number | string;
    score?: number;
    type?: string;
    section_no?: number | null;
    section_key?: string;
    title?: string | null;
    lang?: string;
    snippet?: string;
    [key: string]: any;
  }>;
  debug?: any;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 60000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function krupayaTapasa(req: TapasaRequest): Promise<TapasaResponse> {
  const url = `${String(API_BASE).replace(/\/$/, "")}/krupaya_tapasa`;

  const payload: TapasaRequest = {
    text: req.text,
    k: req.k ?? 7,
    lang: req.lang ?? "mr",
  };

  // Render cold-start: first request can stall. Retry once.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
        60000
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = (await res.json()) as TapasaResponse;

      // Strip huge fields from suggestions so UI stays fast/clean
      if (Array.isArray((data as any).suggested_sections)) {
        (data as any).suggested_sections = (data as any).suggested_sections.map((x: any) => {
          const { snippet, text, ...rest } = x || {};
          return rest;
        });
      }

      return data;
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(2000);
    }
  }

  throw new Error("Unreachable");
}