import { ReceiptReviewApp } from "../components/ReceiptReviewApp";
import { buildReceipt, serializeReceipt } from "../core/receipt";
import { verifyReceipt } from "../core/verifyReceipt";
import { fixtureB, sharedAuthority } from "../fixtures";
import { exactFixtureBytes } from "../ui/receiptView";
import { buildReceiptVerificationView } from "../ui/verificationView";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string | string[];
    sample?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const mode = query.mode;
  const sample = query.sample;
  const initialDemo =
    mode === "verify" && (sample === "valid" || sample === "altered")
      ? await buildVerifierDemo(sample)
      : undefined;
  return (
    <ReceiptReviewApp
      initialIntakeMode={mode === "verify" ? "verify" : "trace"}
      initialVerificationView={initialDemo?.view}
      initialVerificationSource={initialDemo?.source}
    />
  );
}

async function buildVerifierDemo(sample: "valid" | "altered") {
  const build = await buildReceipt(
    {
      rawBytes: exactFixtureBytes(fixtureB),
      authority: sharedAuthority,
    },
    { now: () => "2026-08-28T22:00:00.000Z" },
  );
  if (!build.ok) return undefined;
  const receipt = structuredClone(build.receipt);
  if (sample === "altered") {
    const finding = receipt.findings[0];
    if (!finding) return undefined;
    finding.description = "This deterministic finding text was altered after export.";
  }
  const serialized =
    sample === "valid"
      ? serializeReceipt(receipt)
      : JSON.stringify(receipt, null, 2);
  const report = await verifyReceipt(
    new TextEncoder().encode(`${serialized}\n`),
  );
  return {
    view: buildReceiptVerificationView(report),
    source:
      sample === "valid"
        ? "Valid synthetic receipt"
        : "Altered synthetic receipt",
  };
}
