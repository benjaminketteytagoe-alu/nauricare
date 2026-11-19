import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaMock } from "../../../test/prismaMock";

vi.mock("@/lib/prisma", async () => ({ prisma: (await import("../../../test/prismaMock")).createPrismaMock() }));
const mock = (await import("@/lib/prisma")).prisma as unknown as PrismaMock;
const { knownPrivateInsurers } = await import("./insurers");

const rows = (...names: string[]) => names.map((otherProviderName) => ({ otherProviderName }));

describe("knownPrivateInsurers", () => {
  afterEach(() => vi.resetAllMocks());

  it("only lists names entered by at least two patients, in their most common spelling", async () => {
    mock.patientInsurance.findMany.mockResolvedValue(
      rows("Prime Life", "prime life", "Prime Life", "Solo Insurer", "Zeta Care", "zeta-care", "  "),
    );
    expect(await knownPrivateInsurers()).toEqual(["Prime Life", "Zeta Care"]);
  });
});
