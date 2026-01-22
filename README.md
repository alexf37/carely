# Carely — AI Primary Care Assistant (Web)

Carely is a **Next.js** proof-of-concept that simulates a primary care visit: it gathers a chief complaint, asks targeted questions, and either provides structured self-care guidance for **mild symptoms** or **escalates immediately** for emergency presentations.

This repo focuses on the *system* around the model (tools, UI, persistence, follow-ups, and validation), not just a prompt.

## What it does

- **Intake onboarding**: requires a short intake flow up front and stores baseline medical history in the database for future visits.
- **Primary-care style chat**: streaming responses with strict conversation constraints and empathy protocols.
- **Emergency escalation**: routes emergencies to a “call now” experience via `displayEmergencyHotlines` (and avoids post-escalation medical advice).
- **Voice input**: browser audio → `/api/transcribe` → Whisper via Groq.
- **Medical document uploads (PDF)**: upload a PDF, validate it’s medical, extract durable history, and persist it.
- **Follow-ups**: “add to calendar” or send follow-up emails (now or scheduled).
- **Nearby care discovery**: permission-first location flow → web search → extracted facility cards.
- **Persistent history**: durable facts (allergies, chronic conditions, meds, etc.) are stored and injected into future visits as background context.
- **Custom generative UI**: the chat renders interactive components for emergencies, follow-ups, and nearby-clinic search results (not just plain text).

## Documentation

- `Docs/SYSTEM_DESIGN.md`: system flow, safety constraints, tools, models, and architecture
- `Docs/validation_plan.md`: evaluation strategy and go/no-go criteria

## Repo map (handy entry points)

- **AI prompt**: `src/ai/system-prompt.ts`
- **Tooling**: `src/ai/tools.ts`
- **Chat API (streaming + persistence)**: `src/app/api/chat/route.ts`
- **Transcription API**: `src/app/api/transcribe/route.ts`
- **Upload API (PDF → history extraction)**: `src/app/api/upload/route.ts`
- **Conversation regression harness**: `scripts/test-conversations.ts`
- **DB schema**: `src/server/db/schema.ts`

## Quick start

### Prerequisites

- **Bun** (recommended runtime)
- **PostgreSQL** (local or hosted)
- API keys / tokens:
  - OpenAI (chat + grading + extraction)
  - Groq (voice transcription)
  - Exa (nearby care search)
  - Resend (follow-up emails)
  - Vercel Blob (PDF uploads)
- Google OAuth credentials (Better Auth social login)

### Local Postgres (optional quickstart)

If you don’t already have Postgres running locally, one quick option is Docker:

```bash
docker run --name carely-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=carely \
  -p 5432:5432 \
  -d postgres:16
```

Then set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/carely`.

### Setup

```bash
bun install
cp .env.example .env
```

Set your env vars (see below), then initialize your DB:

```bash
# For local dev (sync schema directly)
bun run db:push

# Or, if you prefer migrations:
# bun run db:migrate
```

Run the app:

```bash
bun dev
```

Then open `http://localhost:3000`, sign in, complete intake, and start an appointment.

### Auth (Google OAuth)

The default UI sign-in uses Google. For local dev, configure your Google OAuth redirect URI:

- `http://localhost:3000/api/auth/callback/google`

## Environment variables

Carely validates required server env vars at boot (see `src/env.js`). To bypass validation temporarily: set `SKIP_ENV_VALIDATION=1`.

| Variable | Required | Used for |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `OPENAI_API_KEY` | yes | Main chat model + graders/extractors |
| `GROQ_API_KEY` | yes | Whisper transcription (`/api/transcribe`) |
| `EXA_API_KEY` | yes | Nearby healthcare search + contents |
| `BLOB_READ_WRITE_TOKEN` | yes | Vercel Blob uploads (`/api/upload`) |
| `RESEND_API_KEY` | yes | Follow-up emails |
| `BETTER_AUTH_GOOGLE_CLIENT_ID` | yes | Google OAuth login |
| `BETTER_AUTH_GOOGLE_CLIENT_SECRET` | yes | Google OAuth login |
| `BETTER_AUTH_SECRET` | prod-only | Auth signing/crypto secret |
| `NEXT_PUBLIC_APP_URL` | optional | Base URL for links inside follow-up emails (not validated by `src/env.js`) |

Notes:

- Follow-up email links default to `https://carely.alexfoster.dev`. For local testing, set `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
- `src/email/index.ts` uses a fixed sender address; update it to an address verified in your Resend account if needed.

## Common scripts

```bash
# Dev / build
bun dev
bun run build
bun run start

# Code quality
bun run check
bun run typecheck

# Database (Drizzle)
bun run db:push
bun run db:migrate
bun run db:studio

# Automated conversation compliance tests
bun run test:conversations --count=20
```

## How the AI “behaves” (high level)

The assistant is guided by a system prompt that enforces:

- **Safety-first triage**: it asks about potentially severe symptoms first before addressing the main complaint.
- **A two-path triage**: mild symptoms → questions → *exactly three* self-care steps; emergencies → immediate escalation + hotlines.
- **Strict phrasing constraints** (acknowledgements, required questions, and a fixed “end-of-recommendations” phrase).
- **Tool-first UX** for actions like follow-ups, location search, hotlines, and history updates.

The prompt lives in `src/ai/system-prompt.ts` and is shared by the API and the test harness.

### Resolved contradiction: 3 recommendations timing

The system prompt originally had two contradictory instructions:

1. **Early instruction**: "Give exactly 3 self-care recommendations immediately when a patient mentions a mild symptom, before any questions are asked"
2. **Linguistic constraint**: "You must always ask 'What concerns you most about this?' before providing recommendations"

**Resolution**: The early instruction was modified so that the 3 recommendations come *after* gathering information, not before. The AI should first ask clarifying questions, rule out emergencies, and ask "What concerns you most about this?" — then provide exactly 3 self-care recommendations. This aligns with the linguistic constraints in the `<most-important-instructions>` section.

## Model choices

Carely uses **GPT-5.2** as the primary consultation model. Supporting “system” tasks (summarization/extraction/deduplication) use smaller models where appropriate, and transcription uses Groq-hosted Whisper.

Smaller “support” jobs use lighter models where it makes sense:

| Job | Model |
| --- | --- |
| Main consultation / chat | `gpt-5.2` |
| Appointment description (2–5 words) | `gpt-5-nano` |
| Nearby-care facility extraction | `gpt-5-nano` |
| History dedup / contradiction analysis | `gpt-5-mini` |
| PDF fact extraction | `gpt-5-mini` |
| Voice transcription | `whisper-large-v3-turbo` (Groq) |

## Try it (sample prompts)

- Mild symptom: “I’ve had a mild headache for 2 days.”
- Borderline/injury: “I twisted my ankle running yesterday.”
- Emergency: “I have chest pain and it’s hard to breathe.”
- Off-topic: “What’s the weather like today?”

## Testing & validation

Carely includes an automated regression harness that:

- simulates patient chats (fake patient model)
- runs the full assistant with tool calls enabled
- grades conversations for instruction compliance

Run it with:

```bash
bun run test:conversations --count=20
```

For the broader validation approach, see `Docs/validation_plan.md`.

## Safety & limitations

Carely is **not** a medical device and is **not** intended for real patient care. It may be wrong or incomplete.

Design choices that bias toward safety:

- conservative escalation rules (including “can’t safely assess remotely” language)
- explicit emergency UI with actionable hotline cards
- durable-history storage is limited to “history-worthy” facts (not transient visit symptoms)

### Engineering tradeoffs (this is a POC)

- The UI is somewhat underdeveloped due to time constraints.
- Some implementation details (persistence choices, error handling) are pragmatic rather than production-grade.

If you adapt this project for real-world use, you’ll need clinical oversight, privacy/security controls, and a formal safety/quality program.

## License

This is a proof-of-concept for educational and demonstration purposes.
