import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Fetch the full chronological message thread between the current user
// and the user identified by conversationId (their userId).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> | any }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { conversationId } = await params;

    if (!conversationId) {
      return new NextResponse("Missing conversationId", { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: conversationId },
          { senderId: conversationId, receiverId: session.user.id },
        ],
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark any unread messages from this partner as read now that the user
    // has opened the thread. Fire-and-forget — a read-status failure must
    // never surface as an error to the client.
    void prisma.message.updateMany({
      where: {
        senderId: conversationId,
        receiverId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[MESSAGE_THREAD_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
