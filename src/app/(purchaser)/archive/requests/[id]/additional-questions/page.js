"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AdditionalQuestionsPage() {
  const params = useParams();
  const router = useRouter();
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
        }
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

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white border rounded p-4 text-black">
          Loading additional questions…
        </div>
      </div>
    );
  }

  const aq = request?.details?.additionalQuestions;
  const isObj = aq && typeof aq === "object" && !Array.isArray(aq);
  const questions = isObj ? Object.keys(aq) : [];
  const aqMap = isObj ? aq : {};

  return (
    <div className="min-h-screen p-8 flex flex-col gap-6">
      {/* small, non-full-width back button */}
      <div className="mb-2 w-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex w-auto max-w-fit px-2 py-1 text-sm rounded bg-gray-700 text-white cursor-pointer"
        >
          ← Back to My Dashboard
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-2">
        Additional Information Requests for {request?.title || "LEXIFY Request"}
      </h1>

      {questions.length === 0 ? (
        <div className="bg-white border rounded p-4 text-black">
          No additional questions have been submitted for this request.
        </div>
      ) : (
        <div className="space-y-6">
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
              <div
                key={q}
                className="bg-white border rounded p-4 text-black flex flex-col gap-2"
              >
                <div className="font-semibold">Information Request</div>
                <div className="mb-2 whitespace-pre-wrap">{q}</div>

                <label className="font-semibold">Your Response</label>

                {/* Already answered & not editing: show read-only answer + Edit button */}
                {hasPersistedAnswer && !isEditing ? (
                  <>
                    <div className="mb-2 whitespace-pre-wrap">
                      {persistedAnswer}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(q)}
                      className="px-3 py-1 text-sm bg-gray-300 rounded cursor-pointer"
                    >
                      Edit Your Response
                    </button>
                  </>
                ) : (
                  // Unanswered OR editing: show textarea + submit/save button
                  <>
                    <textarea
                      className="w-full border rounded p-2 min-h-[80px]"
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

                    <div>
                      <button
                        type="button"
                        onClick={() => handleSubmitAnswer(q)}
                        disabled={savingKey === q}
                        className="px-4 py-2 bg-[#11999e] text-white rounded disabled:opacity-50 cursor-pointer"
                      >
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
    </div>
  );
}
