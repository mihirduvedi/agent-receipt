export const PRODUCT_NAME = "Agent Receipt";
export const RECEIPT_SCHEMA_VERSION = "agent-receipt.receipt.v1";

export const TRUST_STATEMENT =
  "Rules establish what happened relative to authority; Granite explains the verified result to a human.";

export function qualifyVerdict(verdict: string): string {
  return `${verdict} Based on the supplied trace and authority envelope.`;
}
