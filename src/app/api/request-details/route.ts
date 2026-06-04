import { NextRequest, NextResponse } from "next/server";

type LookupRequest = {
  actionToken?: string;
};

function safeJsonParse(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function POST(request: NextRequest) {
  const lookupUrl = process.env.POWER_AUTOMATE_ACTION_LOOKUP_URL;

  if (!lookupUrl) {
    return NextResponse.json(
      {
        success: false,
        message: "Server configuration is missing for request lookup."
      },
      { status: 500 }
    );
  }

  let body: LookupRequest;

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

  if (!body.actionToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing approval token."
      },
      { status: 400 }
    );
  }

  const paResponse = await fetch(lookupUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      actionToken: body.actionToken
    })
  });

  let paData: any = null;

  try {
    paData = await paResponse.json();
  } catch {
    paData = null;
  }

  if (!paResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        message: `Unable to load approval request details. Power Automate returned status ${paResponse.status}.`,
        details: paData
      },
      { status: 502 }
    );
  }

  const parsedRequest = safeJsonParse(paData?.request);
  const parsedPunches = safeJsonParse(paData?.punches);

  return NextResponse.json({
    success: Boolean(paData?.success),
    message: paData?.message,
    request: parsedRequest && typeof parsedRequest === "object" ? parsedRequest : null,
    punches: Array.isArray(parsedPunches) ? parsedPunches : []
  });
}