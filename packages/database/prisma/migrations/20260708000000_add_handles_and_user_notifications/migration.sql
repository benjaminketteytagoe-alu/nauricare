-- Add unique handle field to User for @mention system
ALTER TABLE "User" ADD COLUMN "handle" TEXT;
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- Create UserNotificationType enum
CREATE TYPE "UserNotificationType" AS ENUM ('MENTION_POST', 'MENTION_COMMENT', 'FOLLOW');

-- Create UserNotification table
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "UserNotificationType" NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "UserNotification_recipientId_idx" ON "UserNotification"("recipientId");
CREATE INDEX "UserNotification_recipientId_isRead_idx" ON "UserNotification"("recipientId", "isRead");

-- Foreign keys
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
