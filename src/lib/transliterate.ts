// src/lib/transliterate.ts
export async function transliterateToMarathi(input: string): Promise<string> {
  const text = (input || "").trim();
  if (!text) return "";

  const url =
    "https://inputtools.google.com/request?itc=mr-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify([text]),
  });

  const data = await res.json();

  // ["SUCCESS", [[input, [cand1, cand2...], ...]]]
  if (!Array.isArray(data) || data[0] !== "SUCCESS") return input;

  const cand = data?.[1]?.[0]?.[1]?.[0];
  return typeof cand === "string" && cand.trim() ? cand : input;
}