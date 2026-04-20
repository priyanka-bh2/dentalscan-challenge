import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/notify
 * Triggered when a scan reaches "completed" status.
 * Persists a Notification record (read/unread) without blocking the response -
 * the DB write runs in the background so the scan upload never stalls.
 * Body: { scanId: string; status: string; userId?: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scanId, status, userId } = body;

    // Validate required fields
    if (!scanId || typeof scanId !== "string") {
      return NextResponse.json({ error: "scanId is required." }, { status: 422 });
    }

    // Only notify on completed — ignore other status transitions
    if (status !== "completed") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Async dispatch: do NOT await - keeps response fast 
    // Fire-and-forget so the scan upload path is never blocked by a slow DB write.
    void (async () => {
      try {
        // Idempotency guard: skip if a notification already exists for this scan
        const existing = await prisma.notification.findFirst({
          where: { userId: userId ?? "system", title: `Scan ${scanId} completed` },
        });
        if (existing) return;

        await prisma.notification.create({
          data: {
            userId: userId ?? "system",
            title: `Scan ${scanId} completed`,
            message:
              "Your dental scan has been finalized. Your clinician will review it shortly and join the Telehealth room.",
            read: false,
          },
        });

        // Simulated channel dispatch (Twilio / Telnyx stub)
        console.log(`[notify] SMS/email stub dispatched for scan ${scanId}`);
      } catch (bgErr) {
        // Non-fatal: notification is best-effort; log and continue
        console.error("[notify] background write failed:", bgErr);
      }
    })();

    return NextResponse.json({ ok: true, message: "Notification queued." });
  } catch (err) {
    console.error("Notification API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * GET /api/notify?userId=xxx
 * Returns all notifications for a user, most recent first.
 * Supports ?unreadOnly=true to filter to unread items.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  if (!userId) {
    return NextResponse.json({ error: "userId query param is required." }, { status: 422 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notifications });
}

/**
 * PATCH /api/notify
 * Marks one or more notifications as read.
 * Body: { ids: string[] }
 */
export async function PATCH(req: Request) {
  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array." }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { read: true },
    });

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (err) {
    console.error("Notification PATCH Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
