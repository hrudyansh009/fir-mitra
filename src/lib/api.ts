// src/lib/api.ts

// src/lib/api.ts
export const API_BASE =
  // Vite only (browser-safe)
  ((import.meta as any)?.env?.VITE_API_BASE_URL as string) ||
  // Hard fallback (Render)
  "https://fir-mitra-backend-1.onrender.com";

export type TapasaRequest = {
  text: string;
  k?: number;
  lang?: "mr" | "en";
};

export type TapasaResponse = {
  missing_words: string[];
  suggested_sections: Array<{
    id?: number | string;
    score?: number;
    type?: string;
    section_no?: number;
    section_key?: string;
    title?: string | null;
    lang?: string;
    [key: string]: any;
  }>;
  debug?: any;
};

export type GenerateFirRequest = {
  incident: string;
  lang?: "mr" | "en";
  format_id?: string;
  sections?: string[];
  fields?: Record<string, any>;
};

export type GenerateFirResponse = {
  draft: string;
  filled_fields: any;
  missing_fields: string[];
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 60000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function cleanBase(base: string) {
  return (base || "").replace(/\/$/, "");
}

/**
 * /krupaya_tapasa
 * Render free tier cold-starts. Strategy:
 * - try once
 * - if timeout/network -> wait 2s -> retry once
 */
export async function krupayaTapasa(req: TapasaRequest): Promise<TapasaResponse> {
  const url = `${cleanBase(API_BASE)}/krupaya_tapasa`;

  const payload: TapasaRequest = {
    text: req.text,
    k: req.k ?? 7,
    lang: req.lang ?? "mr",
  };

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

      // Strip noisy fields if backend ever sends them
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

/**
 * /generate_fir
 */
export async function generateFir(req: GenerateFirRequest): Promise<GenerateFirResponse> {
  const url = `${cleanBase(API_BASE)}/generate_fir`;

  const payload: GenerateFirRequest = {
    incident: req.incident,
    lang: req.lang ?? "mr",
    format_id: req.format_id ?? "FIR",
    sections: req.sections ?? [],
    fields: req.fields ?? {},
  };

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

  return (await res.json()) as GenerateFirResponse;
}