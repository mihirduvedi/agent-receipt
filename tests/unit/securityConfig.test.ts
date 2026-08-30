import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config.js";

describe("public response hardening", () => {
  it("removes framework disclosure and applies conservative browser headers", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);

    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find((rule) => rule.source === "/:path*");
    const headers = new Map(
      globalRule?.headers.map((header) => [header.key, header.value]),
    );

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Permissions-Policy")).toContain("microphone=()");
    expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
  });

  it("prevents the model-bound route response from being stored", async () => {
    const rules = await nextConfig.headers?.();
    const apiRule = rules?.find((rule) => rule.source === "/api/:path*");
    const cacheControl = apiRule?.headers.find(
      (header) => header.key === "Cache-Control",
    );

    expect(cacheControl?.value).toBe("private, no-store, max-age=0");
  });
});
