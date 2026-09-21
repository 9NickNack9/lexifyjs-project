"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getComparableDraftData,
  snapshotDraftData,
  UNSAVED_LOADED_DRAFT_MESSAGE,
} from "@/lib/requestWizard";

export default function useRequestDrafts({
  requestType,
  pagePath,
  formData,
  setFormData,
  emptyText = "No saved drafts found.",
  applyDraftData,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loadedDraft, setLoadedDraft] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftActionLoading, setDraftActionLoading] = useState(false);
  const [showLoadDraftModal, setShowLoadDraftModal] = useState(false);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [draftTitleInput, setDraftTitleInput] = useState("");
  const [draftSaveError, setDraftSaveError] = useState("");

  const skipDraftStepResetRef = useRef(false);
  const draftSnapshotRef = useRef(null);
  const isLoadedDraftDirtyRef = useRef(false);
  const onDraftLoadedRef = useRef(null);

  const getDraftDataForSave = () => getComparableDraftData(formData);

  const applyLoadedDraft = (draft) => {
    setFormData((prev) => {
      const next = applyDraftData
        ? applyDraftData(prev, draft)
        : {
            ...prev,
            ...(draft.data || {}),
            requestTitle: draft.data?.requestTitle || draft.title || "",
            providerSource: draft.data?.providerSource || "criteria",
            legalPanelGroupId: draft.data?.legalPanelGroupId || "",
            backgroundFiles: [],
            supplierFiles: [],
            agree: false,
          };
      draftSnapshotRef.current = snapshotDraftData(next);
      isLoadedDraftDirtyRef.current = false;
      return next;
    });
    setLoadedDraft({
      id: String(draft.id),
      title: draft.title || draft.data?.requestTitle || "",
    });
    onDraftLoadedRef.current?.(skipDraftStepResetRef.current);
    skipDraftStepResetRef.current = false;
  };

  useEffect(() => {
    const draftId = searchParams.get("draftId");
    if (!draftId) return;

    const loadDraftFromUrl = async () => {
      try {
        const res = await fetch(`/api/request-drafts/${requestType}`, {
          method: "GET",
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error || "Failed to load draft.");
        }

        const draft = Array.isArray(json?.drafts)
          ? json.drafts.find((item) => String(item.id) === String(draftId))
          : null;

        if (!draft) {
          alert("The selected draft could not be found.");
          setLoadedDraft(null);
          return;
        }

        applyLoadedDraft(draft);
      } catch (error) {
        alert(error.message || "Failed to load draft.");
      }
    };

    loadDraftFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, requestType]);

  useEffect(() => {
    if (!loadedDraft || !draftSnapshotRef.current) {
      isLoadedDraftDirtyRef.current = false;
      return;
    }

    isLoadedDraftDirtyRef.current =
      snapshotDraftData(formData) !== draftSnapshotRef.current;
  }, [formData, loadedDraft]);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!isLoadedDraftDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onDocumentClick = (event) => {
      if (!isLoadedDraftDirtyRef.current) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const anchor = event.target.closest?.("a[href]");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      const confirmed = window.confirm(UNSAVED_LOADED_DRAFT_MESSAGE);
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      isLoadedDraftDirtyRef.current = false;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, []);

  const fetchDrafts = async () => {
    setDraftsLoading(true);
    try {
      const res = await fetch(`/api/request-drafts/${requestType}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load drafts.");
      }
      setDrafts(Array.isArray(json?.drafts) ? json.drafts : []);
    } catch (error) {
      alert(error.message || "Failed to load drafts.");
      setDrafts([]);
    } finally {
      setDraftsLoading(false);
    }
  };

  const openLoadDraftModal = () => {
    setShowLoadDraftModal(true);
    fetchDrafts();
  };

  const openSaveDraftModal = () => {
    setDraftTitleInput(String(formData.requestTitle || "").trim());
    setDraftSaveError("");
    setShowSaveDraftModal(true);
  };

  const closeSaveDraftModal = () => {
    if (draftActionLoading) return;
    setDraftSaveError("");
    setShowSaveDraftModal(false);
  };

  const postDraft = async ({ overwrite = false, title } = {}) => {
    const res = await fetch(`/api/request-drafts/${requestType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        data: getDraftDataForSave(),
        overwrite,
      }),
    });
    const json = await res.json().catch(() => null);
    return { res, json };
  };

  const handleSaveChanges = async () => {
    if (!loadedDraft?.title) return;

    const confirmed = confirm(
      `Save changes to the draft "${loadedDraft.title}"? This will overwrite the currently saved version.`,
    );
    if (!confirmed) return;

    setDraftActionLoading(true);
    try {
      const { res, json } = await postDraft({
        title: loadedDraft.title,
        overwrite: true,
      });
      if (!res.ok) {
        throw new Error(json?.error || "Failed to save changes.");
      }
      if (json?.draft?.id) {
        setLoadedDraft({
          id: String(json.draft.id),
          title: json.draft.title || loadedDraft.title,
        });
      }
      draftSnapshotRef.current = snapshotDraftData(formData);
      isLoadedDraftDirtyRef.current = false;
      alert("Draft changes saved successfully.");
    } catch (error) {
      alert(error.message || "Failed to save changes.");
    } finally {
      setDraftActionLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    const title = String(draftTitleInput || "").trim();
    if (!title) {
      setDraftSaveError(
        "Please enter a title for your LEXIFY Request before saving.",
      );
      return;
    }

    setDraftSaveError("");
    setDraftActionLoading(true);

    try {
      const { res, json } = await postDraft({ title, overwrite: false });

      if (res.status === 409) {
        setDraftSaveError(
          `A draft named "${title}" already exists. Please use another name for the draft.`,
        );
        return;
      }

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save draft.");
      }

      setFormData((prev) => ({ ...prev, requestTitle: title }));
      draftSnapshotRef.current = snapshotDraftData({
        ...formData,
        requestTitle: title,
      });
      isLoadedDraftDirtyRef.current = false;

      if (json?.draft?.id) {
        setLoadedDraft({
          id: String(json.draft.id),
          title: json.draft.title || title,
        });
        skipDraftStepResetRef.current = true;
        router.replace(
          `${pagePath}?draftId=${encodeURIComponent(json.draft.id)}`,
        );
      }

      setShowSaveDraftModal(false);
      alert(
        'Draft saved successfully. If you make further changes, use "Save changes" to update this draft.',
      );
    } catch (error) {
      alert(error.message || "Failed to save draft.");
    } finally {
      setDraftActionLoading(false);
    }
  };

  const handleLoadDraft = (draft) => {
    if (isLoadedDraftDirtyRef.current) {
      const confirmed = confirm(
        "You have unsaved changes to the loaded draft. If you load another draft, those changes will be lost.",
      );
      if (!confirmed) return;
      isLoadedDraftDirtyRef.current = false;
    }

    setShowLoadDraftModal(false);
    skipDraftStepResetRef.current = false;

    if (String(searchParams.get("draftId") || "") === String(draft.id)) {
      applyLoadedDraft(draft);
      return;
    }

    router.replace(`${pagePath}?draftId=${encodeURIComponent(draft.id)}`);
  };

  const handleDeleteDraft = async (draftId) => {
    const confirmed = confirm("Are you sure you want to delete this draft?");
    if (!confirmed) return;

    setDraftActionLoading(true);
    try {
      const res = await fetch(`/api/request-drafts/${requestType}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete draft.");
      }
      setDrafts(Array.isArray(json?.drafts) ? json.drafts : []);
      if (loadedDraft && String(loadedDraft.id) === String(draftId)) {
        draftSnapshotRef.current = null;
        isLoadedDraftDirtyRef.current = false;
        setLoadedDraft(null);
        router.replace(pagePath);
      }
    } catch (error) {
      alert(error.message || "Failed to delete draft.");
    } finally {
      setDraftActionLoading(false);
    }
  };

  const confirmLeave = () => {
    const confirmed = confirm(
      isLoadedDraftDirtyRef.current
        ? UNSAVED_LOADED_DRAFT_MESSAGE
        : "Are you sure you want to exit? All unsaved changes will be lost.",
    );
    if (!confirmed) return false;
    isLoadedDraftDirtyRef.current = false;
    return true;
  };

  const clearDraftGuard = () => {
    isLoadedDraftDirtyRef.current = false;
    draftSnapshotRef.current = null;
  };

  return {
    loadedDraft,
    drafts,
    draftsLoading,
    draftActionLoading,
    showLoadDraftModal,
    showSaveDraftModal,
    draftTitleInput,
    draftSaveError,
    emptyText,
    setDraftTitleInput,
    setDraftSaveError,
    setShowLoadDraftModal,
    openLoadDraftModal,
    openSaveDraftModal,
    closeSaveDraftModal,
    handleSaveChanges,
    handleSaveDraft,
    handleLoadDraft,
    handleDeleteDraft,
    confirmLeave,
    clearDraftGuard,
    skipDraftStepResetRef,
    isLoadedDraftDirtyRef,
    onDraftLoadedRef,
  };
}
