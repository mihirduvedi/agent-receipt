import { z } from "zod";
import { deterministicFallback } from "./deterministicFallback";
import type { GraniteFactBundle } from "./factBundle";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GraniteCallSuccess = {
  ok: true;
  text: string;
  modelId: string;
  apiVersion: string;
};

export type GraniteCallResult =
  | GraniteCallSuccess
  | {
      ok: false;
      reason:
        | "missing_credentials"
        | "iam_error"
        | "timeout"
        | "http_error"
        | "network_error";
    };

export type GraniteCallOptions = {
  repairErrors?: string[];
  signal?: AbortSignal;
};

export type GraniteCaller = (
  bundle: GraniteFactBundle,
  options?: GraniteCallOptions,
) => Promise<GraniteCallResult>;

// ─── Response schemas ─────────────────────────────────────────────────────────

const IamResponseSchema = z
  .object({ access_token: z.string().min(1) })
  .passthrough();

const WatsonxResponseSchema = z
  .object({
    results: z
      .array(z.object({ generated_text: z.string() }))
      .min(1),
  })
  .passthrough();

// ─── Prompt builder ───────────────────────────────────────────────────────────

const OUTPUT_CONTRACT = `Return exactly one JSON object with this shape:
{
  "headline": { "text": "...", "eventIds": ["evt-..."], "findingIds": ["finding-..."] },
  "outcome": { "text": "... Based on the supplied trace and authority envelope.", "eventIds": ["evt-..."] },
  "notableActions": [
    { "text": "...", "eventIds": ["evt-..."], "findingIds": ["finding-..."] }
  ],
  "limitations": [
    { "text": "...", "eventIds": ["evt-..."] }
  ]
}
Do not add keys. Copy the deterministic fallback headline for verdictCode exactly into headline.text and copy verdictQualifier exactly into outcome.text. For notableActions, select and reorder zero or more bundle findings, but copy each as "label: description" with that finding's exact eventIds and findingId; do not paraphrase it. Keep limitation text and eventIds in exactly the same order and count as the bundle limitations. Use domain identifiers exactly as written in cited evidence. Every headline, outcome, and notable action needs a valid evidence citation.`;

function buildPrompt(
  bundle: GraniteFactBundle,
  repairErrors?: string[],
): string {
  const bundleJson = JSON.stringify(bundle);
  const requiredHeadline = deterministicFallback(bundle).headline.text;
  const projectionRequirements =
    `Required headline.text: ${JSON.stringify(requiredHeadline)}\n` +
    `Required outcome.text: ${JSON.stringify(bundle.verdictQualifier)}\n`;

  if (repairErrors && repairErrors.length > 0) {
    return (
      "Your previous response had the following validation errors:\n" +
      repairErrors.map((e) => `- ${e}`).join("\n") +
      "\n\nPlease produce a corrected response.\n" +
      OUTPUT_CONTRACT +
      "\n" +
      projectionRequirements +
      "The fact bundle is:\n" +
      bundleJson
    );
  }

  return (
    "Generate receipt copy JSON for an AI operations manager.\n" +
    OUTPUT_CONTRACT +
    "\n" +
    projectionRequirements +
    "The fact bundle is:\n" +
    bundleJson
  );
}

// ─── IAM token exchange ───────────────────────────────────────────────────────

function forwardAbort(
  source: AbortSignal | undefined,
  destination: AbortController,
): () => void {
  if (!source) return () => undefined;
  if (source.aborted) {
    destination.abort();
    return () => undefined;
  }

  const abort = () => destination.abort();
  source.addEventListener("abort", abort, { once: true });
  return () => source.removeEventListener("abort", abort);
}

async function exchangeIamToken(
  apiKey: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const stopForwardingAbort = forwardAbort(signal, controller);

  try {
    const response = await fetch(
      "https://iam.cloud.ibm.com/identity/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ibm:params:oauth:grant-type:apikey",
          apikey: apiKey,
        }).toString(),
        signal: controller.signal,
        redirect: "error",
      },
    );

    if (!response.ok) {
      return null;
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return null;
    }

    const parsed = IamResponseSchema.safeParse(json);
    if (!parsed.success) return null;

    return parsed.data.access_token;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    stopForwardingAbort();
  }
}

// ─── Main client ──────────────────────────────────────────────────────────────

export async function callGranite(
  bundle: GraniteFactBundle,
  options?: GraniteCallOptions,
): Promise<GraniteCallResult> {
  // Step 1: parse GRANITE_MODE alone with .catch("fallback")
  const mode = z
    .enum(["fallback", "live"])
    .catch("fallback")
    .parse(process.env["GRANITE_MODE"]);

  if (mode !== "live") {
    return { ok: false, reason: "missing_credentials" };
  }

  // Step 2: parse live credentials
  const LiveConfigSchema = z.object({
    WATSONX_API_KEY: z.string().min(1),
    WATSONX_URL: z.string().url().startsWith("https://"),
    WATSONX_PROJECT_ID: z.string().min(1),
    WATSONX_MODEL_ID: z.string().min(1),
  });

  const configResult = LiveConfigSchema.safeParse(process.env);
  if (!configResult.success) {
    return { ok: false, reason: "missing_credentials" };
  }

  const {
    WATSONX_API_KEY,
    WATSONX_URL,
    WATSONX_PROJECT_ID,
    WATSONX_MODEL_ID,
  } = configResult.data;

  // Step 3: IAM token exchange
  const accessToken = await exchangeIamToken(WATSONX_API_KEY, options?.signal);
  if (!accessToken) {
    return { ok: false, reason: "iam_error" };
  }

  // Step 4: watsonx inference call
  const prompt = buildPrompt(bundle, options?.repairErrors);
  const requestBody = {
    model_id: WATSONX_MODEL_ID,
    project_id: WATSONX_PROJECT_ID,
    input: prompt,
    parameters: {
      decoding_method: "greedy",
      temperature: 0,
      max_new_tokens: 1024,
    },
  };

  const apiVersion = "2024-03-14";
  const baseUrl = WATSONX_URL.replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const stopForwardingAbort = forwardAbort(options?.signal, controller);

  try {
    const response = await fetch(
      `${baseUrl}/ml/v1/text/generation?version=${apiVersion}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        redirect: "error",
      },
    );

    if (!response.ok) {
      return { ok: false, reason: "http_error" };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { ok: false, reason: "http_error" };
    }

    const parsed = WatsonxResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, reason: "http_error" };
    }

    const text = parsed.data.results[0].generated_text;
    return { ok: true, text, modelId: WATSONX_MODEL_ID, apiVersion };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "network_error" };
  } finally {
    clearTimeout(timer);
    stopForwardingAbort();
  }
}
