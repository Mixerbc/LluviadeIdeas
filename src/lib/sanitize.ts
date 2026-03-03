/**
 * Minimal HTML sanitization for note description (removes script and event handlers).
 */
export function sanitizeHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  const scripts = div.querySelectorAll("script");
  scripts.forEach((el) => el.remove());
  div.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      if (/^on/i.test(a.name)) el.removeAttribute(a.name);
    }
  });
  return div.innerHTML;
}

/** Strip HTML tags and return plain text. */
export function stripHtml(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? div.innerText ?? "").replace(/\s+/g, " ").trim();
}
