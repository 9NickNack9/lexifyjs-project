"use client";

import { FIELD_CLASS, formatDraftSavedDate } from "@/lib/requestWizard";

export function DraftHeaderActions({
  loadedDraft,
  draftActionLoading,
  onSaveChanges,
  onSaveAsNew,
  onLoadDraft,
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {loadedDraft ? (
        <button
          type="button"
          onClick={onSaveChanges}
          disabled={draftActionLoading}
          className="rounded-lg border border-[#11999e] px-4 py-2 text-sm font-semibold text-[#11999e] hover:bg-[#f3fbfb] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {draftActionLoading ? "Saving…" : "Save changes"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onSaveAsNew}
        disabled={draftActionLoading}
        className="rounded-lg border border-[#11999e] px-4 py-2 text-sm font-semibold text-[#11999e] hover:bg-[#f3fbfb] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      >
        Save as new draft
      </button>
      <button
        type="button"
        onClick={onLoadDraft}
        className="rounded-lg border border-[#11999e] px-4 py-2 text-sm font-semibold text-[#11999e] hover:bg-[#f3fbfb] cursor-pointer"
      >
        Load draft
      </button>
    </div>
  );
}

export function SaveDraftModal({
  open,
  title,
  error,
  loading,
  onChangeTitle,
  onClose,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">
          Name your LEXIFY Request draft
        </h2>
        <input
          type="text"
          className={FIELD_CLASS}
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Insert name"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSave();
            }
            if (e.key === "Escape") onClose();
          }}
        />
        {error ? (
          <p className="mt-2 text-sm font-medium text-red-600">{error}</p>
        ) : null}
        <p className="mt-2 text-xs text-gray-500">
          <strong>Note:</strong> Attachments are not saved with a draft, so add
          any attachments you may wish to include only when you are ready to
          submit the LEXIFY Request.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel save
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="cursor-pointer rounded-lg bg-[#11999e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d7e82] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LoadDraftModal({
  open,
  drafts,
  loading,
  actionLoading,
  emptyText,
  onClose,
  onLoad,
  onDelete,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-xl rounded bg-white p-6 shadow-lg">
        <button
          type="button"
          className="absolute right-3 top-3 cursor-pointer rounded bg-gray-700 px-3 py-1 hover:bg-gray-400"
          onClick={onClose}
        >
          Close
        </button>
        <h2 className="mb-4 text-xl font-semibold text-gray-700">
          Select a draft to load
        </h2>
        <div className="max-h-[400px] space-y-3 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-600">Loading drafts…</p>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-gray-600">{emptyText}</p>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center justify-between gap-3 rounded border p-3"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium text-gray-700">
                    {draft.title || "Untitled draft"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDraftSavedDate(draft)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onLoad(draft)}
                    disabled={actionLoading}
                    className="cursor-pointer rounded bg-[#11999e] px-3 py-1 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Load Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(draft.id)}
                    disabled={actionLoading}
                    className="cursor-pointer rounded bg-red-500 px-3 py-1 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete Draft
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
