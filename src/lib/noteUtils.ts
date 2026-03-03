import type { Note } from "../store/notesStore";
import { normalizeNote } from "../store/notesStore";
import { stripHtml } from "./sanitize";

/** Return plain text body of a note (description only), for AI improve/split/merge. */
export function getNotePlainContent(note: Note | undefined): string {
  if (!note) return "";
  const n = normalizeNote(note);
  return stripHtml(n.descriptionHtml);
}
