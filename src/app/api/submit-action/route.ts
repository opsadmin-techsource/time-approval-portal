import { NextRequest, NextResponse } from "next/server";

type SubmitActionRequest = {
  actionToken?: string;
  requestedAction?: "Approve" | "Deny";
  denialReason?: string | null;
};

export async function POST(request: NextRequest) {
  const powerAutomateUrl = process.env.POWER_AUTOMATE_ACTION_RECEIVER_URL;

  if (!powerAutomateUrl) {
    return NextResponse.json(
      {
        success: false,
        message: "Server configuration is missing."
      },
      { status: 500 }
    );
  }

  let body: SubmitActionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body."
      },
      { status: 400 }
    );
  }

  if (!body.actionToken || !body.requestedAction) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing approval token or action."
      },
      { status: 400 }
    );
  }

  if (!["Approve", "Deny"].includes(body.requestedAction)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid action."
      },
      { status: 400 }
    );
  }

  if (
    body.requestedAction === "Deny" &&
    (!body.denialReason || body.denialReason.trim().length < 5)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "A denial reason is required."
      },
      { status: 400 }
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const submittedFromIp = forwardedFor?.split(",")[0]?.trim() ?? null;
  const submittedUserAgent = request.headers.get("user-agent");

  const paResponse = await fetch(powerAutomateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      actionToken: body.actionToken,
      requestedAction: body.requestedAction,
      denialReason: body.denialReason ?? null,
      submittedFromIp,
      submittedUserAgent
    })
  });

  let paData: unknown = null;

  try {
    paData = await paResponse.json();
  } catch {
    paData = null;
  }

  if (!paResponse.ok) {
  return NextResponse.json(
    {
      success: false,
      message: `Unable to submit time approval response. Power Automate returned status ${paResponse.status}.`,
      details: paData
    },
    { status: 502 }
  );
}

  return NextResponse.json({
    success: true,
    message: "Response received."
  });
}