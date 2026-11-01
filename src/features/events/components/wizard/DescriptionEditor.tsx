"use client";

import { useEffect, useRef } from "react";
import { sanitizeDescriptionHtml } from "@/src/lib/sanitizeHtml";

const FORE_PRESETS = ["#111111", "#b91c1c", "#1d4ed8", "#15803d", "#a16207"];
const HIGHLIGHT_PRESETS = ["#fef08a", "#bbf7d0", "#fecaca", "#bfdbfe", "#e9d5ff"];

export function DescriptionEditor({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !ref.current) return;
    ref.current.innerHTML = value || "";
    seeded.current = true;
  }, [value]);

  function cmd(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  }

  function applyColor(command: "foreColor" | "hiliteColor" | "backColor", value: string) {
    const color = value.trim();
    if (!color) return;
    cmd(command, color);
  }

  function promptColor(command: "foreColor" | "hiliteColor" | "backColor", label: string) {
    const raw = window.prompt(label, "#000000");
    if (!raw) return;
    applyColor(command, raw);
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-1">
        <ToolbarBtn onClick={() => cmd("bold")} label="Bold" />
        <ToolbarBtn onClick={() => cmd("italic")} label="Italic" />
        <ToolbarBtn onClick={() => cmd("underline")} label="Underline" />
        <ToolbarBtn onClick={() => cmd("insertUnorderedList")} label="List" />
        <ToolbarBtn onClick={() => cmd("insertOrderedList")} label="Numbers" />
        <ToolbarBtn
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) cmd("createLink", url);
          }}
          label="Link"
        />
        <ToolbarBtn onClick={() => promptColor("foreColor", "Text color (hex)")} label="Color" />
        {FORE_PRESETS.map((c) => (
          <ColorSwatch
            key={`fg-${c}`}
            color={c}
            title={`Text ${c}`}
            onClick={() => applyColor("foreColor", c)}
          />
        ))}
        <ToolbarBtn
          onClick={() => {
            // Prefer hiliteColor; fall back to backColor for broader browser support.
            const raw = window.prompt("Highlight color (hex)", "#fef08a");
            if (!raw) return;
            ref.current?.focus();
            const ok = document.execCommand("hiliteColor", false, raw.trim());
            if (!ok) document.execCommand("backColor", false, raw.trim());
            onChange(ref.current?.innerHTML ?? "");
          }}
          label="Highlight"
        />
        {HIGHLIGHT_PRESETS.map((c) => (
          <ColorSwatch
            key={`bg-${c}`}
            color={c}
            title={`Highlight ${c}`}
            onClick={() => {
              ref.current?.focus();
              const ok = document.execCommand("hiliteColor", false, c);
              if (!ok) document.execCommand("backColor", false, c);
              onChange(ref.current?.innerHTML ?? "");
            }}
          />
        ))}
      </div>
      <div
        id={id}
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="min-h-32 w-full rounded-xl border border-line px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-line [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:list-item"
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        onBlur={() => {
          const safe = sanitizeDescriptionHtml(ref.current?.innerHTML ?? "");
          if (ref.current && ref.current.innerHTML !== safe) ref.current.innerHTML = safe;
          onChange(safe);
        }}
      />
    </div>
  );
}

function ToolbarBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-line bg-paper px-2 py-1 text-2xs font-medium uppercase text-ink-soft hover:bg-muted"
    >
      {label}
    </button>
  );
}

function ColorSwatch({
  color,
  title,
  onClick,
}: {
  color: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="h-6 w-6 rounded border border-line"
      style={{ backgroundColor: color }}
    />
  );
}
