/**
 * Gemini direct (frontend) — estable y anti-429
 * - 1 request a la vez (cola)
 * - Respeta cooldown y Retry-After
 * - Retry SOLO para 429/503/504 (max 2)
 * - Timeout 20s
 * - Body EXACTO: { contents:[{ parts:[{ text }] }] }
 */

const GEMINI_API_KEY = "AIzaSyCGBk69RYRBc57fmqYn4FnMvcXdURD6tPw";
const MODEL = "gemini-3-flash-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const REQUEST_TIMEOUT_MS = 20000;
const MAX_PROMPT_CHARS = 7000;

// Evita pegarle demasiado seguido aunque haya cola (reduce 429)
const MIN_INTERVAL_MS = 900;

// Retry settings
const MAX_RETRIES = 2; // 1 intento + 2 reintentos
const RETRY_BACKOFF_MS = [1200, 2500];
const RETRY_JITTER_MS = 300;

// Algunos errores devuelven "retry in Xs"
const RETRY_IN_REGEX = /retry in ([0-9.]+)s/i;

let geminiCooldownUntil = 0;
let nextAllowedAt = 0;

export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
    public raw: string,
    public retryAfterSec?: number,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function trimPrompt(text: string): string {
  const t = (text ?? "").trim();
  if (t.length <= MAX_PROMPT_CHARS) return t;
  return t.slice(0, MAX_PROMPT_CHARS) + "\n\n[... texto recortado ...]";
}

function parseRetryIn(raw: string): number | undefined {
  const m = raw.match(RETRY_IN_REGEX);
  if (!m) return undefined;
  const sec = parseFloat(m[1]);
  return Number.isFinite(sec) ? sec : undefined;
}

function getCooldownMs(): number {
  const now = Date.now();
  if (now >= geminiCooldownUntil) return 0;
  return geminiCooldownUntil - now;
}

export function getGeminiCooldownRemaining(): number {
  const ms = getCooldownMs();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

export type GeminiRetryOpts = {
  maxOutputTokens?: number;
  onRetry?: (attempt: number, retryAfterSec?: number) => void;
  signal?: AbortSignal;
};

type QueuedJob = {
  prompt: string;
  opts: GeminiRetryOpts;
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
};

const queue: QueuedJob[] = [];
let processing = false;

/**
 * Respeta cooldown y también un mínimo intervalo entre requests.
 */
async function waitForThrottle(signal?: AbortSignal) {
  // 1) cooldown por 429
  const cooldownMs = getCooldownMs();
  if (cooldownMs > 0) {
    const sec = Math.ceil(cooldownMs / 1000);
    // Espera real (esto evita spamear 429)
    await sleep(cooldownMs);
    if (signal?.aborted) throw new GeminiError("Solicitud cancelada", 0, "", undefined);
  }

  // 2) mínimo intervalo
  const now = Date.now();
  const waitMs = Math.max(0, nextAllowedAt - now);
  if (waitMs > 0) {
    await sleep(waitMs);
    if (signal?.aborted) throw new GeminiError("Solicitud cancelada", 0, "", undefined);
  }

  nextAllowedAt = Date.now() + MIN_INTERVAL_MS;
}

/**
 * Una request real a Gemini (sin retries).
 */
async function doOneRequest(prompt: string, opts: GeminiRetryOpts): Promise<string> {
  const maxOutputTokens = opts.maxOutputTokens ?? 768;
  const trimmed = trimPrompt(prompt);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const userSignal = opts.signal;
  const onAbort = () => controller.abort();

  if (userSignal) {
    if (userSignal.aborted) {
      clearTimeout(timeoutId);
      throw new GeminiError("Solicitud cancelada", 0, "", undefined);
    }
    userSignal.addEventListener("abort", onAbort);
  }

  try {
    await waitForThrottle(userSignal);

    const body = {
      contents: [{ parts: [{ text: trimmed }] }], // <-- EXACTO como Postman
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens,
      },
    };

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await res.text();

    if (!res.ok) {
      const status = res.status;

      // Retry-After header (si existe)
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterSecHeader = retryAfterHeader ? parseFloat(retryAfterHeader) : undefined;

      // Mensaje del JSON (si viene)
      let msg = raw.slice(0, 200);
      try {
        const j = JSON.parse(raw) as { error?: { message?: string } };
        msg = j?.error?.message ?? msg;
      } catch {}

      // 429 => set cooldown real y reporta retryAfterSec
      if (status === 429) {
        const retryInSec =
          (Number.isFinite(retryAfterSecHeader) ? retryAfterSecHeader : undefined) ??
          parseRetryIn(raw) ??
          parseRetryIn(msg);

        // Si no viene, forzamos 12s (mejor que 5s)
        const waitSec = Math.max(8, Math.ceil((retryInSec ?? 12) + 1));
        geminiCooldownUntil = Date.now() + waitSec * 1000;

        throw new GeminiError(
          `Límite temporal de Gemini. Intenta de nuevo en ${waitSec}s.`,
          429,
          raw.slice(0, 500),
          waitSec,
        );
      }

      if (status === 503 || status === 504) {
        throw new GeminiError(
          "Servicio temporalmente no disponible. Reintenta.",
          status,
          raw.slice(0, 500),
          undefined,
        );
      }

      if (status === 403) {
        throw new GeminiError(
          "Sin permisos / API key restringida / API no habilitada.",
          status,
          raw.slice(0, 500),
          undefined,
        );
      }

      throw new GeminiError(msg || `HTTP ${status}`, status, raw.slice(0, 500), undefined);
    }

    // Parse respuesta
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new GeminiError("Respuesta JSON inválida", 0, raw.slice(0, 500));
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return String(text).trim();
  } catch (err) {
    if (err instanceof GeminiError) throw err;

    if (err instanceof Error && err.name === "AbortError") {
      throw new GeminiError("La IA tardó demasiado. Reintenta.", 0, "", undefined);
    }

    throw new GeminiError(err instanceof Error ? err.message : "Error desconocido", 0, "", undefined);
  } finally {
    clearTimeout(timeoutId);
    if (userSignal) userSignal.removeEventListener("abort", onAbort);
  }
}

/**
 * Request con retries SOLO para 429/503/504.
 * Importante: si cae 429, espera el cooldown antes de reintentar.
 */
async function doOneRequestWithRetries(prompt: string, opts: GeminiRetryOpts): Promise<string> {
  const onRetry = opts.onRetry ?? (() => {});
  let lastErr: GeminiError | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await doOneRequest(prompt, opts);
    } catch (err) {
      lastErr = err instanceof GeminiError ? err : undefined;

      const retryable =
        lastErr &&
        (lastErr.status === 429 || lastErr.status === 503 || lastErr.status === 504);

      if (!retryable || attempt >= MAX_RETRIES) throw err;

      // Si fue 429, doOneRequest ya dejó cooldownUntil.
      const cooldownMs = getCooldownMs();
      if (cooldownMs > 0) {
        const sec = Math.ceil(cooldownMs / 1000);
        onRetry(attempt + 1, sec);
        await sleep(cooldownMs);
        continue;
      }

      // Si no hay cooldown, backoff normal
      const base = RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
      const delayMs = base + Math.floor(Math.random() * (RETRY_JITTER_MS + 1));
      onRetry(attempt + 1, Math.ceil(delayMs / 1000));
      await sleep(delayMs);
    }
  }

  throw lastErr ?? new Error("Solicitud fallida");
}

function processQueue() {
  if (processing || queue.length === 0) return;
  const job = queue.shift()!;
  processing = true;

  doOneRequestWithRetries(job.prompt, job.opts)
    .then(job.resolve)
    .catch(job.reject)
    .finally(() => {
      processing = false;
      processQueue();
    });
}

export function geminiGenerateWithRetry(prompt: string, opts: GeminiRetryOpts = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    queue.push({ prompt, opts, resolve, reject });
    processQueue();
  });
}

export function isGeminiBusy(): boolean {
  return processing || queue.length > 0;
}

/** PROMPTS */
export function buildImprovePrompt(text: string): string {
  const t = (text ?? "").trim() || "(vacía)";
  return `Eres un asistente que mejora notas. Reescribe y enriquece el contenido para que sea más claro y accionable.
Mantén el significado.
Devuelve SOLO HTML válido (NO Markdown). Usa <strong>, <p>, <h2>/<h3>, <ul>/<ol>/<li>.
Si falta información, agrega al final <h3>Preguntas</h3> con 2-4 preguntas en <ol><li>...</li></ol>.

NOTA:
<<<${t}>>>`;
}

export function buildMergePrompt(a: string, b: string): string {
  const A = (a ?? "").trim() || "(vacía)";
  const B = (b ?? "").trim() || "(vacía)";
  return `Fusiona estas dos notas en UNA sola nota final.
Devuelve SOLO HTML válido (NO Markdown).

NOTA A:
<<<${A}>>>

NOTA B:
<<<${B}>>>`;
}

export function buildSplitIdeasPrompt(text: string): string {
  const t = (text ?? "").trim() || "(vacía)";
  return `Analiza la NOTA y sepárala en ideas distintas.
Devuelve SOLO HTML válido (NO Markdown).
Estructura:
<h2>Título general</h2>
<ol>
  <li>
    <h3>Idea 1</h3>
    <p>Resumen...</p>
    <ul><li>Punto</li></ul>
  </li>
</ol>
Si solo hay 1 idea, devuelve 1.

NOTA:
<<<${t}>>>`;
}