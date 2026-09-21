"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Clock, MessageCircle, Pencil, Send } from "lucide-react";
import DashboardPage from "../../../components/DashboardPage";
import { emptyCard, loadingCard } from "../../../components/tableUi";

const cardClass =
  "rounded-2xl bg-white p-6 text-gray-900 shadow-[0_8px_24px_rgba(17,153,158,0.12)] ring-1 ring-black/5";

const inputClass =
  "mt-2 w-full min-h-[110px] rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30";

export default function AdditionalQuestionsPage() {
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [request, setRequest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [editingQuestions, setEditingQuestions] = useState({}); // track which ones are in "edit" mode

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/requests/${id}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load request");
        setRequest(json);

        const aq = json?.details?.additionalQuestions;
        if (aq && typeof aq === "object" && !Array.isArray(aq)) {
          const initial = {};
          for (const [q, a] of Object.entries(aq)) {
            initial[q] = typeof a === "string" ? a : "";
          }
          setAnswers(initial);
        } else {
          setAnswers({});
        }
      } catch (e) {
        alert(e.message || "Failed to load request");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleChange = (question, value) => {
    setAnswers((prev) => ({
      ...prev,
      [question]: value,
    }));
  };

  const handleSubmitAnswer = async (question) => {
    const answer = (answers[question] || "").trim();
    if (!answer) {
      alert("Please write an answer before submitting.");
      return;
    }

    try {
      setSavingKey(question);
      const res = await fetch(
        `/api/requests/${id}/answer-additional-question`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, answer }),
        },
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(json?.error || "Failed to save answer.");
        return;
      }

      // Update request.details.additionalQuestions in local state
      setRequest((prev) => {
        if (!prev) return prev;
        const prevDetails = prev.details || {};
        const prevAQ =
          prevDetails.additionalQuestions &&
          typeof prevDetails.additionalQuestions === "object" &&
          !Array.isArray(prevDetails.additionalQuestions)
            ? prevDetails.additionalQuestions
            : {};
        return {
          ...prev,
          details: {
            ...prevDetails,
            additionalQuestions: {
              ...prevAQ,
              [question]: answer,
            },
          },
        };
      });

      // Exit edit mode for this question
      setEditingQuestions((prev) => ({
        ...prev,
        [question]: false,
      }));

      alert("Answer saved.");
    } catch (e) {
      alert("Unexpected error while saving answer.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleStartEdit = (question) => {
    setEditingQuestions((prev) => ({
      ...prev,
      [question]: true,
    }));
  };

  const aq = request?.details?.additionalQuestions;
  const isObj = aq && typeof aq === "object" && !Array.isArray(aq);
  const questions = isObj ? Object.keys(aq) : [];
  const aqMap = isObj ? aq : {};

  return (
    <DashboardPage
      title={`Additional Information Requests for ${request?.title || "LEXIFY Request"}`}
      backLabel="Back to My Dashboard"
      backHref="/archive/pending"
    >
      {loading ? (
        <div className={loadingCard}>Loading additional questions…</div>
      ) : questions.length === 0 ? (
        <div className={emptyCard}>
          No additional questions have been submitted for this request.
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[#0f7c80]">
            {questions.length} question{questions.length === 1 ? "" : "s"}
          </p>

          {questions.map((q) => {
            // Persisted answer from the request in DB
            const persistedRaw = aqMap[q];
            const persistedAnswer =
              typeof persistedRaw === "string" ? persistedRaw : "";

            const hasPersistedAnswer = persistedAnswer.trim() !== "";

            // Are we in edit mode? Unanswered questions are ALWAYS editing by default
            const isEditing =
              editingQuestions[q] === true || !hasPersistedAnswer;

            // What goes in the textarea (local, possibly unsaved, version)
            const currentAnswer =
              answers[q] !== undefined ? answers[q] : persistedAnswer;

            return (
              <div key={q} className={cardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle
                      className="h-5 w-5 text-[#11999e]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <h2 className="text-base font-bold text-gray-900">
                      Information Request
                    </h2>
                  </div>
                  {hasPersistedAnswer ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Answered
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-500">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      Awaiting response
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm text-gray-800 whitespace-pre-wrap">
                  {q}
                </p>

                {hasPersistedAnswer && !isEditing ? (
                  <>
                    <div className="mt-4 rounded-xl border-l-[3px] border-[#11999e] bg-[#e7f6f7] px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">
                        Your Response
                      </div>
                      <div className="mt-1 text-sm whitespace-pre-wrap text-gray-700">
                        {persistedAnswer}
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(q)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#11999e] bg-white px-4 py-2 text-sm font-medium text-[#11999e] transition-colors hover:bg-[#11999e]/10"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Edit Your Response
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="mt-4 block text-sm font-semibold text-gray-900">
                      Your Response
                    </label>
                    <textarea
                      className={inputClass}
                      value={currentAnswer}
                      onChange={(e) => handleChange(q, e.target.value)}
                      onKeyDown={(e) => {
                        // keep keystrokes local, avoid weird global shortcuts
                        e.stopPropagation();
                      }}
                      placeholder={
                        hasPersistedAnswer
                          ? "Edit your response"
                          : "Insert your response here"
                      }
                    />
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSubmitAnswer(q)}
                        disabled={savingKey === q}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#11999e] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0e8488] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {savingKey === q
                          ? hasPersistedAnswer
                            ? "Saving Response..."
                            : "Submitting Response..."
                          : hasPersistedAnswer
                            ? "Save Response"
                            : "Submit Response"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardPage>
  );
}
