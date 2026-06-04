"use client";

import { useState } from "react";

type ApprovalFormProps = {
  token: string;
};

export function ApprovalForm({ token }: ApprovalFormProps) {
  const [denialReason, setDenialReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submitAction(requestedAction: "Approve" | "Deny") {
    setResultMessage(null);
    setErrorMessage(null);

    if (requestedAction === "Deny" && denialReason.trim().length < 5) {
      setErrorMessage("Please enter a denial reason before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actionToken: token,
          requestedAction,
          denialReason: requestedAction === "Deny" ? denialReason : null
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to submit response.");
      }

      setResultMessage(
        requestedAction === "Approve"
          ? "Approval received. Thank you."
          : "Denial received. Thank you."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit response."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <label className="block font-semibold mb-2">
          Denial reason
        </label>

        <textarea
          className="w-full rounded-lg border p-3 min-h-28"
          placeholder="Only required if denying the time approval request."
          value={denialReason}
          onChange={(event) => setDenialReason(event.target.value)}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => submitAction("Approve")}
          className="rounded-lg px-5 py-3 font-semibold bg-green-600 text-white disabled:opacity-50"
        >
          Approve Time
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => submitAction("Deny")}
          className="rounded-lg px-5 py-3 font-semibold bg-red-600 text-white disabled:opacity-50"
        >
          Deny Time
        </button>
      </div>

      {resultMessage && (
        <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
          {resultMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          {errorMessage}
        </div>
      )}
    </div>
  );
}