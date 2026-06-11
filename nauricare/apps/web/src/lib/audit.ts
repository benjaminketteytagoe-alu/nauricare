import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

interface AuditLogPayload {
  action: AuditAction;
  actorId: string;       
  targetId?: string;     
  details?: Record<string, any>;
  ipAddress?: string; 
}

/**
 * Commits a structured operational transaction record to the immutable database log ledger.
 */
export async function logAdministrativeAction({
  action,
  actorId,
  targetId,
  details,
  ipAddress,
}: AuditLogPayload) {
  try {
    return await prisma.auditLog.create({
      data: {
        action,
        actorId,
        targetId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
        ipAddress,
      },
    });
  } catch (error) {
    // Gracefully catch logging errors to ensure a logger failure never blocks core application performance
    console.error(`[SYSTEM AUDIT ERROR]: Failed to commit log for action ${action}:`, error);
  }
}
