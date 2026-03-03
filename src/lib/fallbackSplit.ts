/**
 * Local fallback for "Desglosar ideas" when Gemini fails (429 or any error).
 * Produces a single-idea outline in Spanish so the user can still Apply.
 */

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function firstSentence(str: string, maxChars: number): string {
  const trimmed = str.trim();
  if (!trimmed) return "Sin título";
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  const sentence = match ? match[0].trim() : trimmed;
  if (sentence.length <= maxChars) return sentence;
  return sentence.slice(0, maxChars).trim();
}

function firstWords(str: string, minWords: number, maxWords: number): string {
  const words = str.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Sin título";
  const take = Math.min(Math.max(minWords, Math.min(maxWords, words.length)), words.length);
  return words.slice(0, take).join(" ");
}

function deriveTitle(text: string): string {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return "Sin título";
  const bySentence = firstSentence(normalized, 60);
  if (bySentence.length >= 10) return bySentence;
  return firstWords(normalized, 6, 10);
}

function deriveSummary(text: string, maxChars: number): string {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return "Sin resumen.";
  const sentences = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
  let out = "";
  for (const s of sentences) {
    const next = out ? `${out} ${s.trim()}` : s.trim();
    if (next.length > maxChars) return out || next.slice(0, maxChars);
    out = next;
  }
  return out || normalized.slice(0, maxChars);
}

function deriveBullets(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return ["Sin puntos."];

  const byDot = normalized.split(/\s*\.\s*/).map((s) => s.trim()).filter(Boolean);
  const byBullet = normalized.split(/\s*[•\-]\s*|\n/).map((s) => s.trim()).filter(Boolean);

  let candidates: string[] = [];
  if (byDot.length > 1) {
    candidates = byDot.filter((s) => s.length > 3);
  }
  if (candidates.length < 3 && byBullet.length > 1) {
    candidates = byBullet.filter((s) => s.length > 3);
  }
  if (candidates.length === 0) {
    candidates = byDot.length >= 1 ? byDot : [normalized];
  }

  const limited = candidates.slice(0, 6);
  if (limited.length > 0) {
    return limited.map((s) => (s.length > 120 ? `${s.slice(0, 117)}…` : s));
  }

  const chunkSize = 80;
  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    chunks.push(normalized.slice(i, i + chunkSize));
  }
  return chunks.slice(0, 6);
}

/**
 * Returns plain text in Spanish with format:
 * TÍTULO GENERAL: <auto title>
 * IDEAS:
 * 1) TÍTULO: <auto title>
 *    RESUMEN: <1-3 lines summary>
 *    PUNTOS:
 *    - ...
 *    - ...
 */
export function fallbackSplitIdeas(text: string): string {
  const raw = (text ?? "").trim() || "Texto vacío.";
  const normalized = normalizeWhitespace(raw);

  const title = deriveTitle(normalized);
  const summary = deriveSummary(normalized, 220);
  const bullets = deriveBullets(normalized);

  const pointsBlock = bullets.map((b) => `   - ${b}`).join("\n");

  return `TÍTULO GENERAL: ${title}
IDEAS:
1) TÍTULO: ${title}
   RESUMEN: ${summary}
   PUNTOS:
${pointsBlock}
`;
}
