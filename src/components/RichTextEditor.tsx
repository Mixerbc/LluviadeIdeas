import { useEffect, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBold,
  faItalic,
  faUnderline,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faListUl,
  faListOl,
  faLink,
  faUnlink,
} from "@fortawesome/free-solid-svg-icons";
import { UI } from "../lib/i18n";

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** When true, the editor fills available height (flex:1 min-h:0) and the editable area grows with min-height. */
  fillHeight?: boolean;
};

const LINK_PROTOCOL = /^https?:\/\//i;

function ensureUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return LINK_PROTOCOL.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  fillHeight = false,
}: RichTextEditorProps) {
  const [linkToast, setLinkToast] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-w-0 p-4 text-[14px] leading-[1.5] outline-none focus:outline-none",
        "data-placeholder": placeholder ?? UI.empty.notePlaceholder,
      },
      handleDOMEvents: {
        paste(view, event) {
          // Allow default paste
        },
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Sync external value into editor when it changes (e.g. open modal with different note).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalized = value || "<p></p>";
    if (current !== normalized) {
      editor.commands.setContent(normalized, false);
    }
  }, [editor, value]);

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);
  const setAlignLeft = useCallback(() => editor?.chain().focus().setTextAlign("left").run(), [editor]);
  const setAlignCenter = useCallback(() => editor?.chain().focus().setTextAlign("center").run(), [editor]);
  const setAlignRight = useCallback(() => editor?.chain().focus().setTextAlign("right").run(), [editor]);
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);

  const handleLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const { from, to } = editor.state.selection;
    const empty = from === to;
    if (empty) {
      setLinkToast(UI.richText.selectTextToLink);
      setTimeout(() => setLinkToast(null), 2500);
      return;
    }
    const url = window.prompt(UI.richText.pasteLinkPrompt, "https://");
    if (url == null) return;
    const href = ensureUrl(url);
    if (!href) return;
    editor.chain().focus().setLink({ href }).run();
  }, [editor]);

  const isBold = editor?.isActive("bold") ?? false;
  const isItalic = editor?.isActive("italic") ?? false;
  const isUnderline = editor?.isActive("underline") ?? false;
  const isAlignLeft = editor?.isActive({ textAlign: "left" }) ?? false;
  const isAlignCenter = editor?.isActive({ textAlign: "center" }) ?? false;
  const isAlignRight = editor?.isActive({ textAlign: "right" }) ?? false;
  const isBulletList = editor?.isActive("bulletList") ?? false;
  const isOrderedList = editor?.isActive("orderedList") ?? false;
  const isLink = editor?.isActive("link") ?? false;

  const btnBase =
    "inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 disabled:pointer-events-none transition-colors";
  const btnActive = "bg-gray-200 text-gray-900";

  const preventFocusLoss = (e: React.MouseEvent) => e.preventDefault();

  const rootClass = fillHeight
    ? "flex-1 min-h-0 flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-colors"
    : "flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-colors";
  const rootStyle = fillHeight ? undefined : { minHeight };

  if (!editor) {
    return (
      <div className={rootClass} style={rootStyle}>
        <div className="shrink-0 flex gap-1 border-b border-gray-200 bg-gray-50 p-1.5 flex-wrap">
          <span className="text-xs text-gray-400 px-2 py-2">Cargando…</span>
        </div>
        <div
          className={`flex-1 overflow-auto px-3 py-2 text-gray-400 text-sm ${fillHeight ? "min-h-[360px]" : ""}`}
          style={fillHeight ? undefined : { minHeight: minHeight - 48 }}
        />
      </div>
    );
  }

  return (
    <div className={rootClass} style={rootStyle}>
      {/* Toolbar: altura fija */}
      <div className="shrink-0 flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 p-1.5">
        <button
          type="button"
          className={`${btnBase} ${isBold ? btnActive : ""}`}
          onMouseDown={preventFocusLoss}
          onClick={toggleBold}
          title={UI.richText.bold}
        >
          <FontAwesomeIcon icon={faBold} className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={`${btnBase} ${isItalic ? btnActive : ""}`}
          onMouseDown={preventFocusLoss}
          onClick={toggleItalic}
          title={UI.richText.italic}
        >
          <FontAwesomeIcon icon={faItalic} className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={`${btnBase} ${isUnderline ? btnActive : ""}`}
          onMouseDown={preventFocusLoss}
          onClick={toggleUnderline}
          title={UI.richText.underline}
        >
          <FontAwesomeIcon icon={faUnderline} className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-0.5" aria-hidden />

        <button
          type="button"
          className={`${btnBase} ${isAlignLeft ? btnActive : ""}`}
          onMouseDown={preventFocusLoss}
          onClick={setAlignLeft}
          title={UI.richText.alignLeft}
        >
          <FontAwesomeIcon icon={faAlignLeft} className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={`${btnBase} ${isAlignCenter ? btnActive : ""}`}
          onMouseDown={preventFocusLoss}
          onClick={setAlignCenter}
          title={UI.richText.alignCenter}
        >
          <FontAwesomeIcon icon={faAlignCenter} className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={`${btnBase} ${isAlignRight ? btnActive : ""}`}
          onMouseDown={preventFocusLoss}
          onClick={setAlignRight}
          title={UI.richText.alignRight}
        >
          <FontAwesomeIcon icon={faAlignRight} className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-0.5" aria-hidden />

        <button
          type="button"
          className={`${btnBase} ${isBulletList ? btnActive : ""}`}
          onMouseDown={preventFocusLoss}
          onClick={toggleBulletList}
          title={UI.richText.bulletList}
        >
          <FontAwesomeIcon icon={faListUl} className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={`${btnBase} ${isOrderedList ? btnActive : ""}`}
          onMouseDown={preventFocusLoss}
          onClick={toggleOrderedList}
          title={UI.richText.orderedList}
        >
          <FontAwesomeIcon icon={faListOl} className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-0.5" aria-hidden />

        <button
          type="button"
          className={`${btnBase} ${isLink ? btnActive : ""}`}
          onMouseDown={preventFocusLoss}
          onClick={handleLink}
          title={isLink ? UI.richText.removeLink : UI.richText.link}
        >
          <FontAwesomeIcon icon={isLink ? faUnlink : faLink} className="w-4 h-4" />
        </button>
      </div>

      {linkToast && (
        <div className="shrink-0 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
          {linkToast}
        </div>
      )}

      {/* Editable area: flex-1, min-height 240px móvil / 360px desktop, scroll interno */}
      <div className="flex-1 min-h-[240px] sm:min-h-[360px] overflow-y-auto bg-white">
        <EditorContent editor={editor} />
      </div>

      {/* Estilos editor y listas */}
      <style>{`
        .ProseMirror {
          min-height: 320px;
          outline: none;
          padding: 12px;
        }
        .ProseMirror ul {
          list-style: disc;
          padding-left: 1.25rem;
        }
        .ProseMirror ol {
          list-style: decimal;
          padding-left: 1.25rem;
        }
        .ProseMirror li {
          margin: 4px 0;
        }
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
