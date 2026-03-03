/**
 * Pluggable AI service (mock implementation).
 * Deterministic, no API keys. Can be swapped for remote endpoint via ENV later.
 */

export type ImproveOptions = {
  /** Optional; for future remote endpoint */
  signal?: AbortSignal;
};

export type MergeOptions = {
  signal?: AbortSignal;
};

export type ImproveResult = {
  resultText: string;
  title?: string;
  bullets?: string[];
};

export type MergeResult = {
  resultText: string;
  title?: string;
  bullets?: string[];
};

function capitalizeLine(line: string): string {
  const t = line.trim();
  if (!t) return line;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function hasListLikeContent(text: string): boolean {
  const lines = text.split(/\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return false;
  const bulletLike = /^[\s]*[-*•]\s+/.test(lines[0]) || /^\d+[.)]\s+/.test(lines[0]);
  if (bulletLike) return true;
  const sameStart = lines.every((l) => l.trim().length > 0 && l.length <= 80);
  return sameStart && lines.length >= 2;
}

function linesToBullets(lines: string[]): string[] {
  return lines
    .map((l) => l.replace(/^[\s]*[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .map((l) => capitalizeLine(l));
}

/**
 * Improve note text: fix casing, add title if missing, turn list-like content into bullets.
 */
export function improve(text: string, _opts?: ImproveOptions): ImproveResult {
  const raw = (text ?? "").trim();
  if (!raw) {
    return { resultText: "", title: undefined, bullets: undefined };
  }

  const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let title: string | undefined;
  let bodyLines: string[] = lines;

  const firstLine = lines[0] ?? "";
  const looksLikeTitle =
    firstLine.length <= 60 &&
    !firstLine.startsWith("-") &&
    !firstLine.startsWith("*") &&
    !/^\d+[.)]/.test(firstLine);

  if (looksLikeTitle && lines.length > 1) {
    title = capitalizeLine(firstLine);
    bodyLines = lines.slice(1);
  } else if (looksLikeTitle && lines.length === 1) {
    title = capitalizeLine(firstLine);
    bodyLines = [];
  }

  const useBullets = hasListLikeContent(bodyLines.join("\n"));
  let resultText: string;
  let bullets: string[] | undefined;

  if (useBullets && bodyLines.length > 0) {
    bullets = linesToBullets(bodyLines);
    resultText = title ? `${title}\n\n` : "";
    resultText += bullets.map((b) => `• ${b}`).join("\n");
  } else {
    const improvedBody = bodyLines.map((l) => capitalizeLine(l)).join("\n");
    resultText = title ? `${title}\n\n${improvedBody}` : improvedBody;
  }

  return { resultText, title, bullets };
}

/**
 * Merge two note texts into a single structured output: Title, Summary, Key Points, Next Steps.
 */
export function merge(
  textA: string,
  textB: string,
  _opts?: MergeOptions,
): MergeResult {
  const a = (textA ?? "").trim();
  const b = (textB ?? "").trim();

  const combined = [a, b].filter(Boolean).join("\n\n");
  if (!combined) {
    return { resultText: "", title: "Merged note", bullets: [] };
  }

  const lines = combined.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = linesToBullets(lines);
  const summary =
    bullets.length > 0
      ? bullets.slice(0, 3).join(". ")
      : combined.slice(0, 120) + (combined.length > 120 ? "…" : "");

  const resultText = [
    "Merged note",
    "",
    "Summary",
    summary,
    "",
    "Key points",
    ...bullets.slice(0, 5).map((b) => `• ${b}`),
    "",
    "Next steps",
    ...(bullets.length > 5 ? bullets.slice(5).map((b) => `• ${b}`) : ["• Review and refine"]),
  ].join("\n");

  return {
    resultText,
    title: "Merged note",
    bullets,
  };
}
