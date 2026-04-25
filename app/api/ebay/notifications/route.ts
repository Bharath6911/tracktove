import { createHmac } from "crypto";

// eBay Verification Token Endpoint
// Used for eBay Platform Notifications verification
// See: https://developer.ebay.com/develop/guides/integrating-notifications

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challengeCode = searchParams.get("challenge_code");

  if (!challengeCode) {
    console.log("❌ No challenge_code provided");
    return Response.json({ error: "challenge_code required" }, { status: 400 });
  }

  // Get verification token from environment
  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;

  if (!verificationToken) {
    console.error("❌ EBAY_VERIFICATION_TOKEN not set");
    return Response.json({ error: "Verification token not configured" }, { status: 500 });
  }

  try {
    // Create HMAC-SHA256 hash
    const hmac = createHmac("sha256", verificationToken)
      .update(challengeCode)
      .digest("base64");

    console.log("✅ eBay verification challenge responded");
    console.log("Challenge Code:", challengeCode);
    console.log("Token prefix:", verificationToken.substring(0, 20) + "...");
    console.log("HMAC Response:", hmac);

    return Response.json(
      { challengeResponse: hmac },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error creating HMAC:", error);
    return Response.json({ error: "Failed to create response" }, { status: 500 });
  }
}

// POST endpoint for receiving notifications
export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("eBay notification received:", {
      notificationType: body.metadata?.topic,
      timestamp: new Date().toISOString(),
    });

    // Handle different notification types
    const topic = body.metadata?.topic;

    if (topic === "MARKETPLACE_ACCOUNT_DELETION") {
      // User deleted their eBay account
      // Clean up user data if needed
      console.log("eBay user account deleted:", body);
    }

    return Response.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Error processing eBay notification:", error);
    return Response.json({ error: "Failed to process notification" }, { status: 500 });
  }
}
