"use client";

import { useEffect, useRef } from "react";

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
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-1">
        <ToolbarBtn onClick={() => cmd("bold")} label="Bold" />
        <ToolbarBtn onClick={() => cmd("italic")} label="Italic" />
        <ToolbarBtn onClick={() => cmd("insertUnorderedList")} label="List" />
        <ToolbarBtn onClick={() => cmd("insertOrderedList")} label="Numbers" />
        <ToolbarBtn
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) cmd("createLink", url);
          }}
          label="Link"
        />
      </div>
      <div
        id={id}
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="min-h-32 w-full rounded-xl border border-line px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-line"
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        onBlur={() => onChange(ref.current?.innerHTML ?? "")}
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
