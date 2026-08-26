import { PRODUCT_NAME, TRUST_STATEMENT } from "@/core/product";

const foundationItems = [
  "Build-ready six-day product requirements",
  "Node 24 GitHub Codespaces environment",
  "IBM Bob development rules and assistance log",
  "Lint, typecheck, test, build, and CI verification",
];

const nextSlice = [
  "Canonical and authority-envelope Zod schemas",
  "Native trace adapter and raw-event accounting",
  "Expected and overreaching golden fixtures",
  "Exact-byte SHA-256 integrity metadata",
];

export default function Home() {
  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">IBM AI Builders Challenge · Build foundation</p>
        <h1 id="page-title">{PRODUCT_NAME}</h1>
        <p className="lede">
          A human-accountability layer that reconciles what an AI agent was allowed to do with
          what its supplied trace shows it actually did.
        </p>
        <blockquote>{TRUST_STATEMENT}</blockquote>
      </section>

      <section className="grid" aria-label="Project status">
        <article>
          <p className="section-label">Ready now</p>
          <h2>The build has a floor.</h2>
          <ul>
            {foundationItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="accent-card">
          <p className="section-label">August 26</p>
          <h2>First implementation slice</h2>
          <ul>
            {nextSlice.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="notice" aria-labelledby="boundary-title">
        <div>
          <p className="section-label">Honest boundary</p>
          <h2 id="boundary-title">Review aid, not certification.</h2>
        </div>
        <p>
          This shell does not yet analyze traces. The approved PRD defines the behavior that the
          six-day implementation must earn through deterministic rules, evidence links, and tests.
        </p>
      </section>
    </main>
  );
}
