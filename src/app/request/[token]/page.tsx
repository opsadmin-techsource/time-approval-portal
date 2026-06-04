"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ApprovalRequestDetails = {
  TimeApprovalActionRequestID?: number;
  ActionToken?: string;
  EmpIdentifier?: string;
  ContractorName?: string;
  CompanyName?: string;
  WeekEnding?: string;
  ApproverEmail?: string;
  ApproverName?: string;
  RequestedAction?: string;
  RequestStatus?: string;
  RegularHours?: number;
  OvertimeHours?: number;
  WorkedApprovalHours?: number;
  NonWorkedHours?: number;
  TotalPaidHours?: number;
  TokenCreatedAtUtc?: string;
  TokenExpiresAtUtc?: string;
  SubmittedAtUtc?: string | null;
  ProcessStartedAtUtc?: string | null;
  ProcessCompletedAtUtc?: string | null;
  DenialReason?: string | null;
  CanSubmit?: boolean;
  AvailabilityMessage?: string;
};

type PunchRow = {
  EmpIdentifier?: string;
  WorkDate?: string;
  ClockInDisplay?: string | null;
  ClockOutDisplay?: string | null;
  PunchHours?: number | null;
  DailyWorkedHours?: number | null;
  InTimeSlicePreID?: number | null;
  OutTimeSlicePreID?: number | null;
};

type LookupResponse = {
  success: boolean;
  message?: string;
  request?: ApprovalRequestDetails | null;
  punches?: PunchRow[];
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null) return "0.00";
  return Number(value).toFixed(2);
}

function isFirstPunchForDate(punches: PunchRow[], punch: PunchRow, index: number) {
  if (index === 0) return true;

  const previousPunch = punches[index - 1];

  return previousPunch?.WorkDate !== punch.WorkDate;
}

export default function ApprovalRequestPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [details, setDetails] = useState<ApprovalRequestDetails | null>(null);
  const [punches, setPunches] = useState<PunchRow[]>([]);
  const [denialReason, setDenialReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetails() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/request-details", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            actionToken: token
          })
        });

        const data: LookupResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load approval request.");
        }

        setDetails(data.request ?? null);
        setPunches(Array.isArray(data.punches) ? data.punches : []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load approval request."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDetails();
  }, [token]);

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

      setDetails((current) =>
        current
          ? {
              ...current,
              CanSubmit: false,
              RequestStatus: "Queued",
              RequestedAction: requestedAction,
              AvailabilityMessage: "Your response has been submitted."
            }
          : current
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

  const canSubmit = Boolean(details?.CanSubmit) && !resultMessage;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        backgroundColor: "#f1f5f9",
        color: "#0f172a"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "18px",
          padding: "32px",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)"
        }}
      >
        <h1
          style={{
            fontSize: "30px",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: "12px"
          }}
        >
          Review Time Approval
        </h1>

        {isLoading && (
          <div
            style={{
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px"
            }}
          >
            Loading approval request...
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              marginBottom: "20px",
              border: "1px solid #fca5a5",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              borderRadius: "12px",
              padding: "16px",
              fontWeight: 700
            }}
          >
            {errorMessage}
          </div>
        )}

        {!isLoading && details && (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                marginBottom: "24px"
              }}
            >
              <div style={cardStyle}>
                <div style={labelStyle}>Contractor</div>
                <div style={valueStyle}>{details.ContractorName}</div>
              </div>

              <div style={cardStyle}>
                <div style={labelStyle}>Week Ending</div>
                <div style={valueStyle}>{formatDate(details.WeekEnding)}</div>
              </div>

              <div style={cardStyle}>
                <div style={labelStyle}>Approval Status</div>
                <div style={valueStyle}>{details.RequestStatus}</div>
              </div>

              <div style={cardStyle}>
                <div style={labelStyle}>Worked Hours for Approval</div>
                <div style={valueStyle}>
                  {formatNumber(details.WorkedApprovalHours)}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={labelStyle}>Non-Worked / PTO Hours</div>
                <div style={valueStyle}>
                  {formatNumber(details.NonWorkedHours)}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={labelStyle}>Total Paid Hours</div>
                <div style={valueStyle}>
                  {formatNumber(details.TotalPaidHours)}
                </div>
              </div>
            </section>

            <div
              style={{
                border: "1px solid #cbd5e1",
                backgroundColor: details.CanSubmit ? "#ecfdf5" : "#fef2f2",
                color: details.CanSubmit ? "#065f46" : "#991b1b",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "24px",
                fontWeight: 700
              }}
            >
              {details.AvailabilityMessage}
            </div>

            <h2
              style={{
                fontSize: "22px",
                fontWeight: 800,
                marginBottom: "10px"
              }}
            >
              Daily Punch Detail
            </h2>

            <div
              style={{
                overflowX: "auto",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                marginBottom: "24px"
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px"
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Clock In</th>
                    <th style={thStyle}>Clock Out</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>
                      Daily Worked Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {punches.length === 0 ? (
                    <tr>
                      <td style={tdStyle} colSpan={4}>
                        No punch detail was found for this approval request.
                      </td>
                    </tr>
                  ) : (
                    punches.map((punch, index) => {
                      const showDailySummary = isFirstPunchForDate(punches, punch, index);

                      return (
                        <tr key={`${punch.WorkDate}-${index}`}>
                          <td style={tdStyle}>
                            {showDailySummary ? formatDate(punch.WorkDate) : ""}
                          </td>

                          <td style={tdStyle}>{punch.ClockInDisplay || ""}</td>

                          <td style={tdStyle}>{punch.ClockOutDisplay || ""}</td>

                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>
                            {showDailySummary ? formatNumber(punch.DailyWorkedHours) : ""}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: "8px"
                }}
              >
                Denial reason
              </label>

              <textarea
                style={{
                  width: "100%",
                  minHeight: "120px",
                  border: "1px solid #94a3b8",
                  borderRadius: "12px",
                  padding: "12px",
                  color: "#0f172a",
                  backgroundColor: canSubmit ? "#ffffff" : "#f1f5f9",
                  fontSize: "15px"
                }}
                placeholder="Only required if denying the time approval request."
                value={denialReason}
                disabled={!canSubmit || isSubmitting}
                onChange={(event) => setDenialReason(event.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap"
              }}
            >
              <button
                type="button"
                disabled={!canSubmit || isSubmitting}
                onClick={() => submitAction("Approve")}
                style={{
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px 24px",
                  fontWeight: 800,
                  fontSize: "16px",
                  cursor: !canSubmit || isSubmitting ? "not-allowed" : "pointer",
                  opacity: !canSubmit || isSubmitting ? 0.6 : 1
                }}
              >
                Approve Worked Time
              </button>

              <button
                type="button"
                disabled={!canSubmit || isSubmitting}
                onClick={() => submitAction("Deny")}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px 24px",
                  fontWeight: 800,
                  fontSize: "16px",
                  cursor: !canSubmit || isSubmitting ? "not-allowed" : "pointer",
                  opacity: !canSubmit || isSubmitting ? 0.6 : 1
                }}
              >
                Deny Time
              </button>
            </div>
          </>
        )}

        {resultMessage && (
          <div
            style={{
              marginTop: "24px",
              border: "1px solid #6ee7b7",
              backgroundColor: "#ecfdf5",
              color: "#065f46",
              borderRadius: "12px",
              padding: "16px",
              fontWeight: 700
            }}
          >
            {resultMessage}
          </div>
        )}
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  padding: "14px"
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#475569",
  marginBottom: "4px"
};

const valueStyle: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: 800,
  color: "#0f172a"
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px",
  borderBottom: "1px solid #cbd5e1",
  fontWeight: 800
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top"
};