## 4. Brief Reflection

### What were the key limitations you faced in this challenge?

- **Model reliability under hard constraints**: A core tension was balancing the model’s ability to manage context (intake + history + uploads + multi-turn conversation) with its ability to follow very strict instruction requirements (exact phrases, ordering rules, “exactly 3” recommendations, no jargon, escalation behavior). The more context and nuance you add, the easier it becomes for the model to miss a hard requirement; the stricter you make requirements, the harder it becomes to keep responses natural.

- **Streaming vs. pre-display guardrails**: I wanted responses to stream in as tokens are generated because it feels modern and conversational. That choice makes it difficult to “validate the final answer before anything is shown.” You can audit while streaming, but then you risk showing partial text and retracting it if a checker flags a violation—an experience I’ve personally found jarring.

- **Simplicity vs. defense-in-depth**: I didn’t pick my approach *because* it enables streaming; I picked it because it was “good enough” while staying simple. It behaved the way I wanted (stayed within guidelines, used the right tools, and felt coherent), and that simplicity made it much easier to build around quickly. The tradeoff is fewer layers of defense compared to a router/auditor/repair-loop architecture.

- **Time and scope constraints**: My limiting factor wasn’t the nominal 48-hour window as much as my schedule: in practice it was closer to two half-days. I shipped an end-to-end proof of concept, but I took shortcuts in robustness, edge cases, and UI/UX polish. I hold myself to a higher bar for product-quality UI than this achieves, but for a take-home prototype I focused on demonstrating the core system behaviors.

- **Testing and evaluation**: It’s inherently hard to test an agent whose “correctness” is qualitative and multi-turn. The feedback loop is slow: a meaningful scenario can take up to ~10 turns (plus tool calls), and rules can be interpreted in multiple reasonable ways. I did what I could with a lightweight harness and parallelization, but comprehensive validation takes time.

- **Persistence / data modeling complexity**: I underestimated how quickly “primary care history” explodes into many differently-shaped data types—medications, allergies, surgeries, hospitalizations, lifestyle, dietary needs, habits, family history, and more. For the take-home, I chose pragmatic persistence: chat as JSON blobs (which is often the most practical representation for transcripts), and an abstraction that made it easy to inject durable history into the LLM. The downside is that it limits non-generated UI: the primary way to update the “chart” is via conversation rather than structured edit screens.

### How would you enhance the system to address those limitations?

- **Add a production hardening pipeline**: In a production setting, I’d introduce a multi-stage flow (router → specialized generator(s) → deterministic validators + LLM auditor → repair loop). The key behavior is: **don’t show non-compliant output**. That typically means buffering until validation passes (or only starting to stream *after* the final response is validated), plus a conservative fallback when validation can’t be satisfied reliably.

- **Make the “chart” truly structured**: Keep chat transcripts as blobs, but model durable medical history as structured entities with explicit schemas (and clear provenance: patient-reported vs. document-derived). That unlocks real UI for review/editing and reduces reliance on “talk to edit,” which is limiting for clinicians and patients.

- **Evolve validation beyond “manual spot checks”**: Expand deterministic checks for hard constraints (exact phrases, escalation rules, “exactly 3 recommendations”, etc.), maintain a curated vignette bank for triage and common mild cases, and add targeted adversarial tests (prompt injection, instruction conflicts, long-context). Then complement this with production observability—because real usage is often the fastest way to discover what your offline tests missed.

- **Invest in UX polish and resilience**: With more time, I’d refine the UI into something calmer and more robust: better state handling, clearer tool-result presentation, graceful fallbacks on tool failures, and interaction design tuned for healthcare trust (where “delight” matters less than clarity and steadiness).

### What surprised you about building this system?

- **How quickly “streaming” becomes a safety/UX constraint**: I expected streaming to be “just a rendering detail,” but it meaningfully shapes what kinds of guardrails are viable without awkward retractions or confusing partial outputs.

- **How challenging persistence is in healthcare**: Even a narrow primary-care assistant touches a wide, longitudinal set of data with lots of shape variance. Modeling it properly is a substantial product and engineering commitment.

- **The pace of the agent tooling ecosystem**: I was struck by how fast tools and libraries evolve. Something I’d used recently (as of November) had already changed significantly within a couple months. The interesting part wasn’t just breaking changes—it was that interfaces are shifting because the way we build agentic systems is still evolving, and the ecosystem is actively converging on better primitives.
