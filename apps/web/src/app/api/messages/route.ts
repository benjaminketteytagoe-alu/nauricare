import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Return the latest message from every distinct conversation for the current user.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    // Fetch recent messages in both directions. 200 is a safe cap for V1 —
    // deduplication below reduces this to one entry per unique partner.
    const allMessages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Keep only the first (most recent) message per unique conversation partner.
    const seen = new Set<string>();
    const conversations = allMessages
      .filter((msg) => {
        const partnerId =
          msg.senderId === session.user.id ? msg.receiverId : msg.senderId;
        if (seen.has(partnerId)) return false;
        seen.add(partnerId);
        return true;
      })
      .map((msg) => {
        const partner =
          msg.senderId === session.user.id ? msg.receiver : msg.sender;
        return {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerEmail: partner.email,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          // Messages the current user sent are inherently read from their perspective.
          isRead: msg.senderId === session.user.id ? true : msg.isRead,
        };
      });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("[MESSAGES_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// POST: Send a message to another user.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { receiverId, content } = await req.json();

    if (!receiverId || !content?.trim()) {
      return new NextResponse("receiverId and content are required", { status: 400 });
    }

    if (receiverId === session.user.id) {
      return new NextResponse("Cannot send a message to yourself", { status: 400 });
    }

    // Security gate: sender and receiver must share at least one Appointment.
    // Prisma's nested relation filters traverse Patient/PractitionerProfile
    // so we never need to know which role is which here.
    const sharedAppointment = await prisma.appointment.findFirst({
      where: {
        OR: [
          {
            patient: { userId: session.user.id },
            practitioner: { userId: receiverId },
          },
          {
            patient: { userId: receiverId },
            practitioner: { userId: session.user.id },
          },
        ],
      },
    });

    if (!sharedAppointment) {
      return new NextResponse(
        "Forbidden: a verified clinical relationship is required to send messages",
        { status: 403 }
      );
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[MESSAGES_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
