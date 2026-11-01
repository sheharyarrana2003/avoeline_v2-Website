"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { Modal } from "@/src/components/ui/Modal";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { BLOCK_TYPES, isBlockType, type BlockType } from "../../blocks/schemas";
import { BLOCK_REGISTRY } from "../../blocks/registry";
import {
  createBlockAction,
  deleteBlockAction,
  publishPageAction,
  reorderBlocksAction,
  restorePageRevisionAction,
  saveDraftBlockAction,
} from "../../actions/website.action";
import { AdminBlockEditor, type AdminBlockDraft } from "../AdminBlockEditor";

export type PagesCmsPage = {
  id: string;
  slug: string;
  title: string;
  status: string;
  published_at: string | null;
};

export type PagesCmsBlock = {
  id: string;
  page_id: string;
  type: string;
  sort: number;
  visible: boolean;
  draft: Record<string, unknown>;
  published: Record<string, unknown> | null;
};

export type PagesCmsRevision = {
  id: string;
  created_at: string;
  created_by: string | null;
};

export function PagesCmsClient({
  pages,
  initialPageId,
  blocks,
  revisions,
}: {
  pages: PagesCmsPage[];
  initialPageId: string;
  blocks: PagesCmsBlock[];
  revisions: PagesCmsRevision[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blocks[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [newType, setNewType] = useState<BlockType>("hero");
  const draftRef = useRef<AdminBlockDraft | null>(null);

  const page = pages.find((p) => p.id === initialPageId) ?? pages[0];
  const ordered = useMemo(() => [...blocks].sort((a, b) => a.sort - b.sort), [blocks]);
  const selected = ordered.find((b) => b.id === selectedBlockId) ?? ordered[0] ?? null;

  function refresh() {
    router.refresh();
  }

  function switchPage(pageId: string) {
    router.push(`/admin/website?tab=pages&page=${pageId}`);
  }

  function move(blockId: string, dir: -1 | 1) {
    const ids = ordered.map((b) => b.id);
    const idx = ids.indexOf(blockId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    const next = [...ids];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    startTransition(async () => {
      const res = await reorderBlocksAction({ pageId: page.id, orderedIds: next });
      if (!res.ok) setError(res.error.message);
      else {
        setError(null);
        refresh();
      }
    });
  }

  function toggleVisible(block: PagesCmsBlock) {
    startTransition(async () => {
      const res = await saveDraftBlockAction({
        blockId: block.id,
        draft: block.draft,
        visible: !block.visible,
        type: block.type,
      });
      if (!res.ok) setError(res.error.message);
      else {
        setError(null);
        refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelClass} htmlFor="cms-page">
            Page
          </label>
          <select
            id="cms-page"
            className={fieldClass}
            value={page?.id}
            onChange={(e) => switchPage(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.slug})
              </option>
            ))}
          </select>
        </div>
        {page ? (
          <StatusBadge
            status={page.status === "published" ? "approved" : "pending"}
            label={page.status === "published" ? "Published" : "Draft"}
          />
        ) : null}
        <button
          type="button"
          className={buttonClass("primary", "md")}
          disabled={pending || !page}
          onClick={() => setPublishOpen(true)}
        >
          Publish
        </button>
        <button
          type="button"
          className={buttonClass("secondary", "md")}
          disabled={!page}
          onClick={() => setRevisionsOpen(true)}
        >
          Revisions
        </button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3 rounded-2xl border border-line p-3">
          <p className={labelClass}>Blocks</p>
          <ul className="space-y-2">
            {ordered.map((block) => (
              <li
                key={block.id}
                className={`rounded-xl border p-2 ${
                  selected?.id === block.id ? "border-ink bg-muted" : "border-line"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left text-sm font-medium text-ink"
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  {isBlockType(block.type) ? BLOCK_REGISTRY[block.type].label : block.type}
                </button>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    disabled={pending}
                    onClick={() => move(block.id, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    disabled={pending}
                    onClick={() => move(block.id, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    disabled={pending}
                    onClick={() => toggleVisible(block)}
                  >
                    {block.visible ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost", "sm")}
                    onClick={() => setDeleteId(block.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 border-t border-line pt-3">
            <select
              className={fieldClass}
              value={newType}
              onChange={(e) => {
                if (isBlockType(e.target.value)) setNewType(e.target.value);
              }}
            >
              {BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BLOCK_REGISTRY[t].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={buttonClass("secondary", "md")}
              disabled={pending || !page}
              onClick={() =>
                startTransition(async () => {
                  const res = await createBlockAction({ pageId: page.id, type: newType });
                  if (!res.ok) setError(res.error.message);
                  else {
                    setError(null);
                    setSelectedBlockId(res.data.blockId);
                    refresh();
                  }
                })
              }
            >
              Add
            </button>
          </div>
        </div>

        <div>
          {selected && isBlockType(selected.type) ? (
            <AdminBlockEditor
              key={selected.id}
              initialDraft={{
                type: selected.type,
                data: selected.draft ?? {},
                visible: selected.visible,
              }}
              onChange={(draft) => {
                draftRef.current = draft;
              }}
              onSave={async () => {
                const draft = draftRef.current ?? {
                  type: selected.type as BlockType,
                  data: selected.draft,
                  visible: selected.visible,
                };
                const res = await saveDraftBlockAction({
                  blockId: selected.id,
                  draft: draft.data,
                  visible: draft.visible,
                  type: draft.type,
                });
                if (!res.ok) setError(res.error.message);
                else {
                  setError(null);
                  refresh();
                }
              }}
            />
          ) : (
            <p className="text-sm text-ink-soft">Select or add a block to edit.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={publishOpen}
        title="Publish page?"
        description="Draft blocks become live and a revision snapshot is stored."
        confirmLabel="Publish"
        busy={pending}
        onCancel={() => setPublishOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            const res = await publishPageAction({ pageId: page.id });
            setPublishOpen(false);
            if (!res.ok) setError(res.error.message);
            else {
              setError(null);
              refresh();
            }
          })
        }
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete block?"
        description="This removes the block from the page. Publish afterward if you want the live page updated."
        confirmLabel="Delete"
        tone="danger"
        busy={pending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteId) return;
            const res = await deleteBlockAction({ blockId: deleteId });
            setDeleteId(null);
            if (!res.ok) setError(res.error.message);
            else {
              setSelectedBlockId(null);
              setError(null);
              refresh();
            }
          })
        }
      />

      <Modal
        open={revisionsOpen}
        onClose={() => setRevisionsOpen(false)}
        title="Revision history"
        description="Restore applies the snapshot into drafts. Publish again to go live."
        maxWidth="lg"
      >
        <ul className="space-y-2">
          {revisions.length === 0 ? (
            <li className="text-sm text-ink-soft">No revisions yet.</li>
          ) : (
            revisions.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2"
              >
                <span className="text-sm text-ink">{new Date(r.created_at).toLocaleString()}</span>
                <button
                  type="button"
                  className={buttonClass("secondary", "sm")}
                  onClick={() => setRestoreId(r.id)}
                >
                  Restore to drafts
                </button>
              </li>
            ))
          )}
        </ul>
      </Modal>

      <ConfirmDialog
        open={Boolean(restoreId)}
        title="Restore revision?"
        description="Drafts will be replaced. Published content stays until you publish again."
        confirmLabel="Restore"
        busy={pending}
        onCancel={() => setRestoreId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!restoreId) return;
            const res = await restorePageRevisionAction({
              pageId: page.id,
              revisionId: restoreId,
            });
            setRestoreId(null);
            setRevisionsOpen(false);
            if (!res.ok) setError(res.error.message);
            else {
              setError(null);
              refresh();
            }
          })
        }
      />
    </div>
  );
}
