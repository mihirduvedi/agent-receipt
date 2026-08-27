import { describe, expect, it } from "vitest";

import {
  auditAssetLicenses,
  auditPackageLicenses,
  scanTextForReleaseFindings,
} from "@/release/audit";

describe("release audit", () => {
  it("detects high-signal secrets, personal paths, and personal email addresses", () => {
    const text = [
      ["WATSONX_API_KEY", "live-credential-value"].join("="),
      ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
      ["ghp", "abcdefghijklmnopqrstuvwxyzABCDEFGHIJ"].join("_"),
      ["", "Users", "reviewer", "private", "trace.json"].join("/"),
      ["reviewer", "company.com"].join("@"),
    ].join("\n");

    const result = scanTextForReleaseFindings("config.txt", text);

    expect(result.findings.map((item) => item.code)).toEqual([
      "REL-SECRET-001",
      "REL-SECRET-001",
      "REL-SECRET-001",
      "REL-PATH-001",
      "REL-PRIVACY-001",
    ]);
  });

  it("permits empty placeholders, synthetic email domains, and exact Next.js build-root metadata", () => {
    const buildRoot = ["", "home", "runner", "work", "agent-receipt", "agent-receipt"].join("/");
    const text = JSON.stringify({
      appDir: buildRoot,
      support: "alice@example.com",
      WATSONX_API_KEY: "",
      exampleAwsAccessKey: "AKIAIOSFODNN7EXAMPLE",
    });

    const result = scanTextForReleaseFindings(
      ".next/required-server-files.json",
      text,
      { allowedBuildRoot: buildRoot },
    );

    expect(result.findings).toEqual([]);
    expect(result.allowedBuildRootReferences).toBe(1);
  });

  it("does not consume the next .env line as the value of an empty secret placeholder", () => {
    const text = [
      "WATSONX_API_KEY=",
      "WATSONX_URL=https://us-south.ml.cloud.ibm.com",
    ].join("\n");

    expect(scanTextForReleaseFindings(".env.example", text).findings).toEqual([]);
    expect(
      scanTextForReleaseFindings(
        ".env",
        ["WATSONX_API_KEY", "live-test-secret"].join("="),
      ).findings.map((item) => item.code),
    ).toEqual(["REL-SECRET-001"]);
  });

  it("can omit dependency-author emails when scanning compiled vendor output", () => {
    const vendorEmail = ["dependency-author", "package.dev"].join("@");

    expect(
      scanTextForReleaseFindings(".next/server/vendor.js.map", vendorEmail, {
        scanEmailAddresses: false,
      }).findings,
    ).toEqual([]);
  });

  it("does not permit a different personal path inside Next.js framework metadata", () => {
    const personalPath = ["", "Users", "someone", "private-project"].join("/");
    const result = scanTextForReleaseFindings(
      ".next/required-server-files.json",
      JSON.stringify({ repoRoot: personalPath }),
      { allowedBuildRoot: "/tmp/build-root" },
    );

    expect(result.findings).toEqual([
      {
        code: "REL-PATH-001",
        file: ".next/required-server-files.json",
        detail: "A user-home absolute path is present.",
      },
    ]);
  });

  it("reports dependency entries without declared license metadata", () => {
    const result = auditPackageLicenses({
      packages: {
        "": { name: "agent-receipt" },
        "node_modules/licensed": { license: "MIT" },
        "node_modules/unlicensed": {},
      },
    });

    expect(result).toEqual({
      packageEntries: 2,
      missingLicenses: ["unlicensed"],
    });
  });

  it("requires every app-owned media asset to appear in the asset-license manifest", () => {
    const result = auditAssetLicenses(
      [
        "README.md",
        "docs/screenshots/review.jpg",
        "public/diagram.svg",
        "src/app/icon.png",
        "src/app/page.tsx",
      ],
      [
        "# Asset licenses",
        "",
        "- `docs/screenshots/review.jpg` — project-owned.",
        "- `public/diagram.svg` — project-owned.",
      ].join("\n"),
    );

    expect(result).toEqual({
      appAssets: [
        "docs/screenshots/review.jpg",
        "public/diagram.svg",
        "src/app/icon.png",
      ],
      unlicensedAssets: ["src/app/icon.png"],
    });
  });
});
