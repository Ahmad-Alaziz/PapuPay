import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

type Entry = {
  action: string;
  actorId?: string | null;
  organizationId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
};

/** Records a change. Pass a transaction client to keep it atomic with the change itself. */
export function audit(entry: Entry, client: Prisma.TransactionClient = db) {
  return client.auditLog.create({ data: entry });
}
