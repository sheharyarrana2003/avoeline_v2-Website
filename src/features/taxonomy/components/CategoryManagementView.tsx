"use client";

import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Sliders,
  CheckSquare,
  Power,
  Layers,
  Calendar,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type {
  CategoryFieldSetDoc,
  ChecklistTemplateDoc,
  EventFormatDoc,
  SuperCategoryDoc,
} from "../categoryEngine.types";
import {
  addCategoryItemAction,
  renameCategoryItemAction,
  toggleCategoryActiveAction,
} from "../actions/categoryEngine.action";
import { FieldSetEditorModal } from "./FieldSetEditorModal";
import { ChecklistTemplateModal } from "./ChecklistTemplateModal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { useRouter } from "next/navigation";

interface CategoryManagementViewProps {
  superCategories: SuperCategoryDoc[];
  eventFormats: EventFormatDoc[];
  fieldSets: CategoryFieldSetDoc[];
  checklistTemplates: ChecklistTemplateDoc[];
}

export const CategoryManagementView: React.FC<CategoryManagementViewProps> = ({
  superCategories,
  eventFormats,
  fieldSets,
  checklistTemplates,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"superCategories" | "eventFormats">(
    "superCategories"
  );

  // Modals state
  const [addingType, setAddingType] = useState<"superCategory" | "eventFormat" | null>(null);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Rename state
  const [renamingItem, setRenamingItem] = useState<{
    type: "superCategory" | "eventFormat";
    id: string;
    name: string;
    description?: string;
  } | null>(null);
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Field set modal state
  const [activeFieldSetCategory, setActiveFieldSetCategory] = useState<SuperCategoryDoc | null>(
    null
  );

  // Checklist modal state
  const [activeChecklistCategory, setActiveChecklistCategory] = useState<SuperCategoryDoc | null>(
    null
  );

  // Toggling status state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingType) return;
    setAddError(null);
    setAddLoading(true);

    try {
      const res = await addCategoryItemAction(addingType, addName, addDesc);
      if (res.success) {
        setAddingType(null);
        setAddName("");
        setAddDesc("");
        router.refresh();
      } else {
        setAddError(res.error || "Failed to add category.");
      }
    } catch (err: any) {
      setAddError(err?.message || "An unexpected error occurred.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem) return;
    setRenameError(null);
    setRenameLoading(true);

    try {
      const res = await renameCategoryItemAction(
        renamingItem.type,
        renamingItem.id,
        renamingItem.name,
        renamingItem.description
      );
      if (res.success) {
        setRenamingItem(null);
        router.refresh();
      } else {
        setRenameError(res.error || "Failed to rename.");
      }
    } catch (err: any) {
      setRenameError(err?.message || "An unexpected error occurred.");
    } finally {
      setRenameLoading(false);
    }
  };

  const handleToggleActive = async (
    type: "superCategory" | "eventFormat",
    id: string,
    currentActive: boolean
  ) => {
    setTogglingId(id);
    try {
      const res = await toggleCategoryActiveAction(type, id, !currentActive);
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="inline-flex rounded-xl p-1 bg-muted">
          <button
            type="button"
            onClick={() => setActiveTab("superCategories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "superCategories"
                ? "bg-paper text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Super Categories</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-muted text-ink font-semibold">
              {superCategories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("eventFormats")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "eventFormats"
                ? "bg-paper text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Event Formats</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-muted text-ink font-semibold">
              {eventFormats.length}
            </span>
          </button>
        </div>

        <div>
          {activeTab === "superCategories" ? (
            <button
              type="button"
              onClick={() => {
                setAddingType("superCategory");
                setAddName("");
                setAddDesc("");
                setAddError(null);
              }}
              className={buttonClass("primary", "md")}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Super Category
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAddingType("eventFormat");
                setAddName("");
                setAddDesc("");
                setAddError(null);
              }}
              className={buttonClass("primary", "md")}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Event Format
            </button>
          )}
        </div>
      </div>

      {/* Info Callout */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-line bg-muted text-ink text-xs leading-relaxed">
        <Sparkles className="w-4 h-4 text-ink shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-ink">
            Fully Data-Driven Taxonomy:
          </span>{" "}
          Active items immediately appear on the event creation form. Deactivating an item removes it
          from future event creation dropdowns without breaking any existing events that reference it.
        </div>
      </div>

      {/* TABLE 1: Super Categories */}
      {activeTab === "superCategories" && (
        <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted border-b border-line text-ink-soft text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Category Name</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Custom Fields</th>
                  <th className="px-6 py-3.5">Checklist Templates</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {superCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-ink-soft">
                      No super categories found. Click &quot;Add Super Category&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  superCategories.map((cat) => {
                    const fieldSet = fieldSets.find(
                      (fs) => fs.superCategoryId === cat.id || fs.id === cat.id
                    );
                    const fieldsCount = fieldSet?.fields?.length || 0;
                    const templatesCount = checklistTemplates.filter(
                      (t) => t.superCategoryId === cat.id
                    ).length;

                    return (
                      <tr
                        key={cat.id}
                        className={`transition-colors ${
                          !cat.active
                            ? "bg-muted opacity-75"
                            : "hover:hover:bg-muted"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-ink">
                            {cat.name}
                          </div>
                          {cat.description && (
                            <div className="text-xs text-ink-soft line-clamp-1 mt-0.5">
                              {cat.description}
                            </div>
                          )}
                          <div className="text-[11px] text-ink-soft font-mono mt-0.5">
                            ID: {cat.id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            status={cat.active ? "active" : "inactive"}
                            label={cat.active ? "Active" : "Inactive"}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => setActiveFieldSetCategory(cat)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-line bg-muted text-ink hover:border-ink transition"
                          >
                            <Sliders className="w-3 h-3 text-ink-soft" />
                            <span>
                              {fieldsCount > 0
                                ? `${fieldsCount} field${fieldsCount === 1 ? "" : "s"}`
                                : "Attach fields"}
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => setActiveChecklistCategory(cat)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-line bg-muted text-ink hover:border-emerald-400 transition"
                          >
                            <CheckSquare className="w-3 h-3 text-emerald-500" />
                            <span>
                              {templatesCount > 0
                                ? `${templatesCount} checklist${templatesCount === 1 ? "" : "s"}`
                                : "Set checklist"}
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setRenamingItem({
                                  type: "superCategory",
                                  id: cat.id,
                                  name: cat.name,
                                  description: cat.description,
                                })
                              }
                              className="p-1.5 text-ink-soft hover:text-ink rounded-lg hover:bg-muted transition"
                              title="Rename / Edit details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={togglingId === cat.id}
                              onClick={() =>
                                handleToggleActive("superCategory", cat.id, cat.active)
                              }
                              className={`p-1.5 rounded-lg transition ${
                                cat.active
                                  ? "text-ink-soft hover:bg-danger-soft hover:text-danger"
                                  : "text-ink-soft hover:bg-success-soft hover:text-success"
                              }`}
                              title={cat.active ? "Deactivate" : "Activate"}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE 2: Event Formats */}
      {activeTab === "eventFormats" && (
        <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted border-b border-line text-ink-soft text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Format Name</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Identifier</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {eventFormats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-ink-soft">
                      No event formats found. Click &quot;Add Event Format&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  eventFormats.map((fmt) => (
                    <tr
                      key={fmt.id}
                      className={`transition-colors ${
                        !fmt.active
                          ? "bg-muted opacity-75"
                          : "hover:hover:bg-muted"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink">
                          {fmt.name}
                        </div>
                        {fmt.description && (
                          <div className="text-xs text-ink-soft line-clamp-1 mt-0.5">
                            {fmt.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={fmt.active ? "active" : "inactive"}
                          label={fmt.active ? "Active" : "Inactive"}
                        />
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-ink-soft">
                        {fmt.id}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setRenamingItem({
                                type: "eventFormat",
                                id: fmt.id,
                                name: fmt.name,
                                description: fmt.description,
                              })
                            }
                            className="p-1.5 text-ink-soft hover:text-ink rounded-lg hover:bg-muted transition"
                            title="Rename / Edit details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={togglingId === fmt.id}
                            onClick={() =>
                              handleToggleActive("eventFormat", fmt.id, fmt.active)
                            }
                            className={`p-1.5 rounded-lg transition ${
                              fmt.active
                                ? "text-ink-soft hover:bg-danger-soft hover:text-danger"
                                : "text-ink-soft hover:bg-success-soft hover:text-success"
                            }`}
                            title={fmt.active ? "Deactivate" : "Activate"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-paper border border-line rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleAddSubmit}>
              <div className="px-6 py-4 border-b border-line">
                <h3 className="text-base font-semibold text-ink">
                  Add New{" "}
                  {addingType === "superCategory" ? "Super Category" : "Event Format"}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                {addError && (
                  <div className="p-3 rounded-lg text-xs border border-danger-line bg-danger-soft text-danger">
                    {addError}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Name *</label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder={
                      addingType === "superCategory"
                        ? "e.g. AI & Machine Learning, Culinary"
                        : "e.g. In-Person Conference, Virtual Hackathon"
                    }
                    className={fieldClass}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelClass}>Description (Optional)</label>
                  <textarea
                    value={addDesc}
                    onChange={(e) => setAddDesc(e.target.value)}
                    rows={3}
                    placeholder="Short description of this category..."
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line bg-muted">
                <button
                  type="button"
                  onClick={() => setAddingType(null)}
                  disabled={addLoading}
                  className={buttonClass("ghost", "sm")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className={buttonClass("primary", "sm")}
                >
                  {addLoading ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-paper border border-line rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleRenameSubmit}>
              <div className="px-6 py-4 border-b border-line">
                <h3 className="text-base font-semibold text-ink">
                  Rename / Edit Category
                </h3>
              </div>

              <div className="p-6 space-y-4">
                {renameError && (
                  <div className="p-3 rounded-lg text-xs border border-danger-line bg-danger-soft text-danger">
                    {renameError}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Name *</label>
                  <input
                    type="text"
                    required
                    value={renamingItem.name}
                    onChange={(e) =>
                      setRenamingItem({ ...renamingItem, name: e.target.value })
                    }
                    className={fieldClass}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelClass}>Description (Optional)</label>
                  <textarea
                    value={renamingItem.description || ""}
                    onChange={(e) =>
                      setRenamingItem({ ...renamingItem, description: e.target.value })
                    }
                    rows={3}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line bg-muted">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  disabled={renameLoading}
                  className={buttonClass("ghost", "sm")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renameLoading}
                  className={buttonClass("primary", "sm")}
                >
                  {renameLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Field Set Editor Modal */}
      {activeFieldSetCategory && (
        <FieldSetEditorModal
          superCategory={activeFieldSetCategory}
          initialFields={
            fieldSets.find(
              (fs) =>
                fs.superCategoryId === activeFieldSetCategory.id ||
                fs.id === activeFieldSetCategory.id
            )?.fields || []
          }
          onClose={() => setActiveFieldSetCategory(null)}
          onSaved={() => {
            setActiveFieldSetCategory(null);
            router.refresh();
          }}
        />
      )}

      {/* Checklist Template Modal */}
      {activeChecklistCategory && (
        <ChecklistTemplateModal
          superCategory={activeChecklistCategory}
          eventFormats={eventFormats}
          existingTemplates={checklistTemplates}
          onClose={() => setActiveChecklistCategory(null)}
          onSaved={() => {
            setActiveChecklistCategory(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
};
