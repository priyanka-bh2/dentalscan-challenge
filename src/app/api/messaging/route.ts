import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/messaging?threadId=xxx
 * Returns all messages for a thread, ordered oldest-first.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");

  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      sender: true,
      createdAt: true,
      threadId: true,
    },
  });

  return NextResponse.json({ messages });
}

/**
 * POST /api/messaging
 * Sends a new message. Creates the Thread if it doesn't exist yet.
 * Uses a transaction so Thread + Message are always consistent.
 * Body: { patientId?: string; threadId?: string; content: string; sender: "patient" | "dentist" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { threadId, patientId, content, sender } = body;

    // Validate
    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required." }, { status: 422 });
    }
    if (!sender || !["patient", "dentist"].includes(sender)) {
      return NextResponse.json({ error: "sender must be 'patient' or 'dentist'." }, { status: 422 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "Message too long (max 2000 chars)." }, { status: 422 });
    }
    if (!threadId && !patientId) {
      return NextResponse.json({ error: "Provide either threadId or patientId." }, { status: 422 });
    }

    // Transaction: upsert Thread - create Message atomically
    const message = await prisma.$transaction(async (tx) => {
      let thread;

      if (threadId) {
        // Use existing thread
        thread = await tx.thread.findUnique({ where: { id: threadId } });
        if (!thread) {
          return null; // will 404 below
        }
        // Bump updatedAt
        await tx.thread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
      } else {
        // Create a new thread for this patient
        thread = await tx.thread.create({
          data: { patientId: patientId! },
        });
      }

      return tx.message.create({
        data: {
          threadId: thread.id,
          content: content.trim(),
          sender,
        },
        select: {
          id: true,
          content: true,
          sender: true,
          createdAt: true,
          threadId: true,
        },
      });
    });

    if (!message) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (err) {
    console.error("Messaging API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
