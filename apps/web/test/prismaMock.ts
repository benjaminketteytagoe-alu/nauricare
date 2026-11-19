import { type Mock, vi } from "vitest";

// Loose on purpose: each test decides what a Prisma call resolves to.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Method = Mock<(...args: any[]) => any>;
export type PrismaMock = Record<string, Record<string, Method>> & { $transaction: (arg: unknown) => Promise<unknown> };

/**
 * A prisma stand-in for unit tests: every `prisma.<model>.<method>` is a
 * vi.fn() created on first use. `$transaction` runs callbacks against the
 * mock and resolves arrays of (already-called) operations. It is a plain
 * function, so vi.resetAllMocks() between tests leaves it working.
 *
 *   const prisma = createPrismaMock();
 *   vi.mock("@/lib/prisma", () => ({ prisma }));
 */
export function createPrismaMock(): PrismaMock {
  const models = new Map<string, Record<string, Method>>();
  const model = (name: string) => {
    if (!models.has(name)) {
      const methods: Record<string, Method> = {};
      models.set(
        name,
        new Proxy(methods, {
          get: (target, method: string) => (target[method] ??= vi.fn()),
        }),
      );
    }
    return models.get(name)!;
  };
  const $transaction = async (arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: unknown) => unknown)(mock) : Promise.all(arg as unknown[]);
  const mock = new Proxy({} as PrismaMock, {
    get: (_t, prop: string) => (prop === "$transaction" ? $transaction : model(prop)),
  });
  return mock;
}
