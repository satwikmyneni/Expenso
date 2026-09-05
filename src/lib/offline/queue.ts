import { openDB } from "idb";

export interface SyncOperation {
  id: string;
  userId: string;
  entity: "transaction";
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  error?: string;
}

const db = () => openDB("expenso-offline", 1, {
  upgrade(database) {
    if (!database.objectStoreNames.contains("sync-queue")) database.createObjectStore("sync-queue", { keyPath: "id" });
  },
});

export async function enqueue(operation: Omit<SyncOperation, "attempts">) {
  return (await db()).put("sync-queue", { ...operation, attempts: 0 });
}

export async function pendingOperations(userId?: string): Promise<SyncOperation[]> {
  const operations = await (await db()).getAll("sync-queue") as SyncOperation[];
  return userId ? operations.filter((operation) => operation.userId === userId) : operations;
}

export async function removeOperation(id: string) { return (await db()).delete("sync-queue", id); }

export async function failOperation(operation: SyncOperation, error: string) {
  return (await db()).put("sync-queue", { ...operation, attempts: operation.attempts + 1, error });
}
