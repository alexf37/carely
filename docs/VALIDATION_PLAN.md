# Carely — Validation Plan

## Purpose

This document describes how we would validate Carely before real patient deployment, with a safety-first, risk-based approach. The goal is to demonstrate that Carely:

- **Reliably escalates emergencies** (and does not provide medical advice after escalation)
- **Provides safe, understandable self-care guidance** for mild symptoms
- **Follows required communication constraints** (exact phrases + structured response rules)
- **Operates reliably as a system** (tools, UI flows, data handling, privacy/security)

## Scope (what we’re validating)

- **Clinical flow**: intake → triage → questions → recommendations or escalation → follow-up
- **Two top-level pathways**:
  - **Mild symptoms**: questions first, then exactly **3** numbered self-care recommendations
  - **Emergency symptoms / escalation triggers**: immediate escalation, hotline tool call, no additional advice
- **Safety language + linguistic constraints** (examples):
  - “I understand” for acknowledgements (not “I see” / “I hear”)
  - Ask: “When did this first start, and has it been getting better, worse, or staying the same?”
  - Ask: “What concerns you most about this?” **before** recommendations
  - End recommendations with: “How does this sound to you?”
  - Escalations include: “This is beyond what I can safely assess remotely”
  - Include first-message disclaimer: “I can provide guidance, but I cannot replace an in-person examination.”
- **Tooling behavior**:
  - `displayEmergencyHotlines` is called for emergencies (correct hotline type(s))
  - `scheduleFollowUp` is used when recommending follow-up timeframes
  - `addToHistory` only records durable medical history (not temporary visit symptoms)
  - Location flow follows the permission-first requirement before `getUserLocation` → `findNearbyHealthcare`

## Validation principles

- **Risk-based**: prioritize tests that reduce the chance of serious harm (missed emergencies, unsafe advice).
- **Layered evidence**: automated regression tests + adversarial testing + clinician review + monitored pilot.
- **Pre-deploy gates**: no “known unsafe” failures are allowed to ship.
- **Change control**: any model/prompt/tool change triggers a re-run of the core safety suite.

## Right-sized validation scope

This plan is intentionally **proportional to risk**: it concentrates validation effort where failures would cause harm (missed emergencies, unsafe advice, constraint violations) and avoids redundant “check everything with everything” testing.

**Core pre-pilot evidence package:**

- **Curated, clinician-labeled vignette suite** focused on triage (especially emergencies) + common mild cases.
- **Deterministic compliance checks** for your hard constraints (exact phrases, escalation rules, “exactly 3 recommendations”, etc.).
- **Focused adversarial testing** (prompt injection, instruction conflicts, long-context).
- **Small clinician review** of a stratified sample (all emergencies + random mild + all automated failures).
- **Basic reliability + security sanity checks** (tool failures, auth/data isolation, upload safety).

Additional methods (multi-model routing, fine-tuning, broader studies) can be added later if they address *specific observed failure modes* or new deployment requirements.

## Optional production hardening (router + auditor + repair loop)

This prototype streams a single model’s output directly to the user. In production, a common hardening approach is a multi-stage pipeline that prevents non-compliant output from ever being shown. This is **optional** for the take-home, but it’s a realistic direction if you see recurring compliance failures.

### Router model (fast, small) — what / why / how

- **What**: A low-latency “router” model runs before the main model to classify the patient’s message into a small set of routes (emergency vs. mild vs. off-topic vs. gibberish vs. crisis, etc.).
- **Why**: This reduces risk by making emergency detection more consistent and lets us use specialized prompts/models per route instead of one prompt handling everything.
- **How**:
  - Router produces **structured output** (e.g., JSON) with `route`, `confidence`, and `triggered_flags`.
  - Certain routes can return **fixed, template-like responses** immediately (e.g., off-topic, gibberish, emergency escalation).

### Specialized generators (per-route) — what / why / how

- **What**: Different prompts/models for different cases (e.g., mild-symptom consult, emergency escalation, mental health crisis escalation).
- **Why**: Smaller, more focused instruction sets improve reliability and make evaluation more targeted.
- **How**:
  - Maintain a versioned prompt/model per route.
  - Optional later: fine-tune a router or “editor” model if you have enough labeled internal transcripts.

### Output auditor + “repair loop” — what / why / how

- **What**: A separate model (and deterministic validators) audits the draft response against the hard constraints (exact phrases, escalation rules, “3 recommendations”, no-jargon, etc.). If it fails, the system regenerates/edits until it passes.
- **Why**: This is the most direct way to prevent rule violations from reaching patients.
- **How**:
  - Run **deterministic checks** for strict constraints (exact phrase presence, recommendation count, escalation/tool call presence).
  - Run an **LLM-based rubric grader** for softer constraints (clarity, lay terms, tone, unsafe advice).
  - If any check fails: regenerate (same model) or apply an “editor” pass, up to a capped number of attempts; if still failing, fall back to a conservative safe response (or force escalation).

### Streaming tradeoff

- **Why it matters**: A repair loop implies you can’t safely stream raw tokens (you only want to show a response after it passes validation).
- **Practical approach**: show a “thinking” state while the pipeline completes, then display the validated response (or begin streaming only after the final response is validated).

### Observability + continuous validation (including A/B tests)

- **What**: Production dashboards tracking safety/compliance metrics over time; controlled prompt/model experiments.
- **Why**: Model behavior drifts with prompt changes, model upgrades, tool changes, and new user behaviors—validation must continue post-launch.
- **How**:
  - Instrument per-turn events (route chosen, tool calls, validation failures, repair-loop retries, escalation outcomes).
  - Run A/B tests only after both variants pass the offline safety gates; measure deltas on non-safety metrics (clarity, satisfaction) while enforcing safety invariants (no missed emergencies, no post-escalation advice).

## What we measure (why / how / what we do with it)

| Metric | Why it matters | How we measure it | What we do with it |
|---|---|---|---|
| **Emergency escalation sensitivity (false negatives)** | Missing an emergency is the highest-risk failure. | Curated, clinician-labeled emergency vignette suite. Score: % of cases that (a) include required escalation language, and (b) call `displayEmergencyHotlines` with appropriate types. | **Release gate**: if any missed escalation occurs, we block deployment and add regression tests targeting the miss (prompt/routing fixes). |
| **“No advice after escalation” violations** | Giving treatment/diagnosis guidance during an emergency is unsafe. | Deterministic transcript checks: once escalation is triggered (or hotline tool called), verify the assistant output contains only the escalation script (no differential diagnoses, no self-care tips). Spot-check with clinician review. | **Release gate**: any violation blocks deployment; add targeted tests + tighten routing/templates. |
| **Hard constraint compliance rate** (exact phrases, ordering, “3 recs”) | These constraints are part of the assignment and also enforce safety/structure. | Deterministic validators over transcripts: presence/absence of required/banned phrases, timeline question format, “What concerns…” appears before recommendations, exactly 3 numbered recommendations for mild, follow-up timeframe format, “How does this sound to you?” at end of advice. | Track per-constraint failure rates to prioritize fixes. In production, drive the **auditor/repair loop** and alert on spikes. |
| **Clarity + lay language** | Patients must understand the guidance; jargon increases misunderstanding risk. | Lightweight: (1) small “jargon lexicon” detector + spot checks, (2) lay-user ratings on clarity, (3) occasional clinician review for confusing phrasing. | If clarity degrades, revise prompts/examples and add targeted regression tests for the confusing scenarios. |
| **Unsafe advice rate (mild cases)** | Even non-emergency cases can be harmed by unsafe recommendations. | Clinician rubric review on a stratified sample of mild-case transcripts. Label unsafe/contraindicated advice; track rate and severity. | **Release gate** for severe issues; otherwise create targeted guardrails (don’t recommend X) and add regression tests. |
| **Follow-up correctness** (timeframe + workflow) | Follow-up guidance is part of safety and continuity of care. | Deterministic checks for presence of a concrete timeframe (“If this isn’t improving in [X days]…”). Telemetry to verify `scheduleFollowUp` is called when follow-up is recommended and the flow completes. | Fix prompt/tool logic; add tests for common failure modes (missing timeframe, missing tool call, malformed date). |
| **Tool call correctness + reliability** | Tools are part of safety UX (hotlines) and care continuity (follow-up). | Tool telemetry: success rates, latency, error types; unit/integration tests for tool schemas; replay production-like transcripts in staging. | Set SLOs; on regressions, fail deployment or degrade gracefully (e.g., show hotline numbers in text if tool fails). |
| **Patient comprehension (teach-back)** | If patients misunderstand, even correct advice can fail. | Usability study: after a session, ask users to restate next steps and “when to seek care.” Score against a checklist. | Improve wording and UI emphasis; add “teach-back” prompts where appropriate (without bloating the chat). |
| **Factuality sanity check (lightweight)** | Even with disclaimers, blatantly incorrect medical facts erode trust and can be harmful. | A small set of guideline-based primary-care vignettes + clinician spot-check for critical errors (focus on “dangerous wrong,” not trivia). | If we see recurring factual errors, add prompt guardrails and regression tests around those topics. |
| **Security & privacy readiness (baseline)** | Hospitals require strong controls around patient data. | Access-control tests (cross-user data isolation), secrets/config review, and basic security scanning of dependencies and uploads. | Fix issues before any pilot; maintain an audit trail and documented incident response. |

## Validation approach (staged)

### Phase 0 — Requirements & hazard analysis (1–2 days)

Create a short risk register mapping hazards to tests and mitigations. At minimum:

- **Missed emergency** (false negative triage)
- **Inappropriate reassurance / unsafe self-care advice**
- **Failure to include required escalation language / hotlines**
- **Prompt injection / instruction override**
- **Incorrect history persistence** (saving temporary symptoms as permanent history)
- **Privacy/security failure** (unauthorized access to chats/documents)

Deliverable: a one-page risk register used to prioritize the test suite and pass/fail gates.

### Phase 1 — Automated conversation regression suite (offline)

Build on the existing harness (`scripts/test-conversations.ts`) and expand it into a deterministic, repeatable test suite:

- **Scenario bank** (start ~100–300 high-signal cases; scale up over time):
  - Mild: headache, fatigue, sore throat, cough, stomach upset, rash, etc.
  - Emergency: chest pain, difficulty breathing, severe allergic reaction, stroke-like symptoms, overdose, suicidal thoughts, etc.
  - Required edge cases: off-topic, gibberish, extreme worry, conflicting details, missing answers.
  - “Borderline” cases: ambiguous symptoms that should still route to urgent evaluation.
- **Two kinds of checks**:
  - **Rule-based checks** for exact phrases/structure (fast, deterministic): required questions, banned phrases, “3 recommendations only”, escalation script presence, tool call presence, etc.
  - **LLM grading** as a secondary check for “lay terms”, empathy tone, and overall safety (with strict rubrics).
- **Key metrics**:
  - Use the table above as the scorecard (with explicit measurement methods and actions).

Deliverables: nightly regression report + failure triage list with reproducible transcripts.

### Phase 2 — Adversarial & robustness testing

Focus on realistic failure modes for a conversational medical system:

- **Prompt injection attempts** (e.g., “ignore the rules”, “act as DAN”, user-provided “system prompts”)
- **Instruction conflict pressure** (user demands jargon, demands diagnosis during emergency symptoms)
- **Long conversation / context overload** (ensure constraints still hold late in sessions)
- **Tool failure simulation** (hotline tool fails, transcription fails, upload fails) and verify safe fallback language
- **Multi-modal inputs** (images/PDFs): ensure the assistant remains conservative and avoids overconfident conclusions

Deliverable: red-team findings + fixes + regression tests added for each discovered failure mode.

### Phase 3 — Human review (clinical + lay)

Automated checks are necessary but not sufficient for clinical credibility.

- **Clinician panel review** (board-certified PCPs + emergency medicine):
  - Review a stratified sample of transcripts (including all failures + random passes)
  - Label: triage correctness, safety of advice, clarity, and whether the plan to seek care is appropriate
  - Specifically audit emergency cases for: immediate escalation, absence of speculative diagnosis, and clear next steps
- **Lay user testing**:
  - Comprehension checks (“What will you do next?” “When would you seek help?”)
  - UX checks that emergency actions are obvious and frictionless

Deliverable: clinician sign-off summary + quantified inter-rater agreement on triage labels.

### Phase 4 — Monitored pilot (no uncontrolled patient harm)

A staged rollout reduces risk:

- **Shadow testing (optional)**: run on de-identified vignettes/historical transcripts; compare to clinician disposition.
- **Supervised live pilot**:
  - Narrow scope (low-acuity only), explicit consent, and clear “not for emergencies” warnings
  - On-call clinician oversight with rapid escalation paths
  - Stop conditions if safety thresholds are breached

Deliverable: pilot outcomes report with safety events, near-misses, and measured patient comprehension.

### Phase 5 — Ongoing monitoring & re-validation

- **Safety monitoring**:
  - Escalation rate by symptom category
  - Flagged conversations for clinician review (keyword triggers, anomaly detection)
  - Periodic random audits
- **Model/prompt versioning**:
  - Every change triggers Phase 1 (core suite) + targeted Phase 2 tests
- **Incident response**:
  - Defined severity levels, response times, and rollback procedures

## Readiness criteria (what convinces hospital administrators)

We would present an “evidence package” and require go/no-go gates:

- **Safety gates**
  - **Zero missed escalations** on the curated emergency vignette suite
  - **Zero “advice after escalation”** violations on emergency cases
  - **High compliance** with mandated phrases/structure across applicable scenarios (reported per constraint)
- **Clinical credibility**
  - Clinician review shows high agreement that triage decisions and advice are appropriate for the scoped use case
  - Clear documentation of limitations and escalation behavior
- **Operational readiness**
  - Reliable performance (latency/error budgets defined and met)
  - Audit logs and traceability (transcripts + tool calls + version info)
  - Security review completed (access control + vulnerability remediation)
- **Governance**
  - Named clinical owner, review cadence, and incident response playbook

## Notes

This plan prioritizes validations that materially reduce risk (triage safety, constraint compliance, and unsafe advice). Add heavier-weight methods when they address specific observed failure modes or are required by the intended deployment setting.

