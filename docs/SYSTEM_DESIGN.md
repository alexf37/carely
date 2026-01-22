# Carely — AI Primary Care Consultation System

## System Design Document

### Overview

Carely is an AI system designed to conduct primary care consultations, triaging patients between those with mild symptoms who can receive self-care guidance and those with emergency symptoms who require immediate escalation to human care.

The system is built as a web application using Next.js, powered by OpenAI's GPT-5.2 with structured tool calling. Users authenticate with Better Auth and complete a required intake flow that seeds a persistent “history” store (allergies, chronic conditions, medications, lifestyle factors, etc.). Patients can also upload medical PDFs, which the backend validates and extracts into durable history facts that are injected into future appointments so the AI can make more informed decisions with less back-and-forth.

---

## 1. Primary Care Appointment Flow

A typical primary care appointment with Carely follows this flow:

```
┌──────────────────────────┐
│ Patient signs in          │
│ (Better Auth / Google)    │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Intake (required once)    │
│ Writes baseline history   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Create appointment        │
│ (Visit + Chat record)     │
└──────────┬───────────────┘
           │
           ▼
┌─────────────────┐
│  Patient Opens  │
│   Appointment   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Initial Greeting│ ─── UI greeting (non-LLM)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ First AI Message│ ─── Disclaimer: "I can provide guidance,
│ (questions first)│     but I cannot replace an in-person examination"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Chief Complaint │ ─── "What brings you in today?"
│   Gathering     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Symptom Triage  │────▶│ EMERGENCY PATH   │
│ (Severity Check)│     │ Chest pain,      │
└────────┬────────┘     │ breathing issues,│
         │              │ severe symptoms  │
         │              └────────┬─────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  MILD SYMPTOM   │     │ Immediate        │
│     PATH        │     │ Escalation       │
└────────┬────────┘     │ + Emergency      │
         │              │ Hotlines         │
         ▼              └──────────────────┘
┌─────────────────┐
│ Clarifying      │ ─── Timeline question: "When did this first
│ Questions       │     start, and has it been getting better,
└────────┬────────┘     worse, or staying the same?"
         │
         ▼
┌─────────────────┐
│ Concern Check   │ ─── "What concerns you most about this?"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Self-Care       │ ─── Exactly 3 numbered recommendations
│ Recommendations │     + "How does this sound to you?"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Follow-up       │ ─── "If this isn't improving in X days..."
│ Guidance        │     + Optional: Find nearby healthcare
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Schedule        │ ─── Calendar download, email now,
│ Follow-up       │     or scheduled reminder
└─────────────────┘
```

Outside of an appointment, Carely also supports **medical document upload** on the account page. Uploaded PDFs are validated as medical documents and then mined for durable history facts (allergies, chronic conditions, long-term medications, etc.), which become available as background context in future appointments.

---

## 2. Handling Mild vs. Emergency Scenarios

### Mild Symptoms (Fatigue, Headaches, Minor Issues)

For mild symptoms, the AI follows a structured consultation:

1. **Information Gathering**: Ask clarifying questions about symptoms, timeline, severity
2. **Rule Out Red Flags**: Explicitly check for severe symptoms that would indicate escalation
3. **Address Concerns**: Ask "What concerns you most about this?"
4. **Provide Guidance**: Deliver exactly 3 numbered self-care recommendations
5. **Set Expectations**: Provide specific follow-up timeframe ("If not improving in 3 days...")
6. **Offer Continuity**: Schedule follow-up via calendar or email reminder

**Example mild symptom response pattern:**

```
I understand you've been dealing with [symptom]. That sounds really uncomfortable.

To help me give you the best guidance:
- [Clarifying question about severity/frequency]
- [Question about associated symptoms]

When did this first start, and has it been getting better, worse, or staying the same?
```

After gathering information:

```
Based on what you've described, this sounds like [condition]. What concerns you most about this?

Here are my recommendations:
1. [First self-care step]
2. [Second self-care step]  
3. [Third self-care step]

If this isn't improving in [X days], please contact a healthcare provider.

How does this sound to you?
```

### Emergency Symptoms (Chest Pain, Difficulty Breathing)

Emergency symptoms trigger immediate escalation with no attempt at diagnosis or treatment:

1. **Immediate Recognition**: System identifies emergency indicators
2. **No Speculation**: AI does not discuss possible causes or diagnoses
3. **Clear Escalation Script**: "This is beyond what I can safely assess remotely"
4. **Emergency Resources**: Display relevant hotlines via the `displayEmergencyHotlines` tool
5. **No Additional Advice**: Conversation focuses solely on getting patient to emergency care

**Emergency response pattern:**

```
Based on what you've told me, these symptoms need immediate medical attention. This is beyond what I can safely assess remotely.

Please call 911 or go to your nearest emergency room right away.

[Emergency Hotline UI Component: 911]
```

---

## 3. Escalation Protocol

### When to Escalate

The system has two pathways: **mild symptoms** (self-care guidance) and **emergency symptoms** (immediate escalation). The AI uses judgment based on the symptoms described, erring on the side of caution.

**Triggers for Immediate Escalation:**

| Trigger | Action |
|---------|--------|
| Chest pain | Immediate escalation + 911 |
| Difficulty breathing | Immediate escalation + 911 |
| Severe symptoms | Immediate escalation + 911 |
| Joint injuries (sprains, twists) | Immediate escalation + 911 (requires physical examination) |
| Poisoning/overdose | Escalation + Poison Control |
| Suicidal ideation | Escalation + 988 Crisis Lifeline |
| Domestic violence | Escalation + DV Hotline |
| Combination of mild symptoms suggesting severity | Escalation after brief assessment |

**Note:** Joint injuries are treated as emergency symptoms because they require physical examination to assess properly—the AI cannot evaluate sprains, fractures, or soft tissue damage remotely.

**Mild Symptoms (Self-Care Path):**
- Fatigue, headaches, minor aches
- Cold symptoms, sore throat
- Minor digestive issues
- Skin irritations (may request photo)
- General wellness questions

For mild symptoms, the AI provides self-care guidance and includes a verbal follow-up recommendation: "If this isn't improving in [X days], please contact a healthcare provider."

### How Escalation Works

1. **Tool Invocation**: AI calls `displayEmergencyHotlines` with appropriate type(s)
2. **UI Rendering**: Emergency hotline cards appear with one-tap calling
3. **Multi-Resource Support**: Can display multiple hotlines (e.g., suicide + LGBTQ+ youth)
4. **No Further Engagement**: AI provides no additional medical advice after escalation

### Available Emergency Resources

| Type | Resource | Number |
|------|----------|--------|
| general | Emergency | 911 |
| poison | Poison Control | 1-800-222-1222 |
| suicide | Crisis Lifeline | 988 |
| domesticViolence | National DV Hotline | 1-800-799-7233 |
| sexualAssault | RAINN | 1-800-656-4673 |
| childAbuse | Childhelp | 1-800-422-4453 |
| substanceAbuse | SAMHSA | 1-800-662-4357 |
| veterans | Veterans Crisis Line | 988 (press 1) |
| lgbtqYouth | Trevor Project | 1-866-488-7386 |
| eatingDisorders | Eating Disorders Hotline | 1-800-931-2237 |

---

## 4. Patient Experience & Interaction Design

### Conversational Interface

The chat interface is designed for comfort and accessibility:

- **Voice Input**: Patients can speak instead of type (WebM audio → `/api/transcribe` → Groq-hosted Whisper `whisper-large-v3-turbo`)
- **File Attachments**: In-chat attachments support images and PDFs; separately, uploaded medical PDFs on the account page are persisted and mined for durable history
- **Streaming Responses**: AI responses appear word-by-word for natural feel
- **Timestamps**: Each message shows when it was sent
- **Thinking Indicators**: "Thinking..." states while AI processes

### Empathy Protocols

The system uses specific language patterns to maintain warmth:

| Situation | Required Response |
|-----------|-------------------|
| Patient expresses worry | "It's completely understandable that you're concerned about [specific symptom]" |
| Patient describes pain | "That sounds really uncomfortable" |
| Patient needs reassurance | "Let's work through this together" (never "don't worry") |
| Acknowledging concerns | "I understand" (never "I see" or "I hear") |

### Linguistic Constraints

- **No Medical Jargon**: "High blood pressure" not "hypertension"
- **Drug Names**: Both generic and brand: "ibuprofen (Advil)"
- **Lay Terms Only**: Explain everything as if to someone unfamiliar with medicine

### Interactive UI Components

Beyond chat messages, the system renders rich UI:

1. **Emergency Hotlines**: Clickable cards with one-tap calling, color-coded by type
2. **Follow-up Options**: Three-choice card (calendar download, email now, email reminder)
3. **Location Request**: Permission prompt for finding nearby healthcare
4. **Healthcare Facilities**: Searchable cards for clinics/hospitals/pharmacies with ratings, hours, contact info
5. **PDF Thumbnails**: Preview of uploaded medical documents

### Follow-up Care System

When the AI recommends a follow-up, patients choose from:

1. **Add to Calendar**: Downloads an .ics file with reminder alarm
2. **Email Now**: Sends follow-up details immediately to patient's email
3. **Remind Later**: Schedules email for the follow-up date (via workflow queue)

### Medical History Persistence

The system maintains a permanent medical history across appointments:

- **What's Recorded**: Chronic conditions, allergies, past surgeries, medications, family history
- **What's Not Recorded**: Temporary symptoms (today's headache, current sore throat)
- **How it's populated**: Intake onboarding, medical document upload extraction, and in-conversation `addToHistory` tool calls
- **Deduplication**: AI uses an LLM to detect redundant or contradicted facts
- **Context Injection**: History is provided to AI for informed responses without proactively mentioning it

### Intake (Baseline History Onboarding)

Carely requires users to complete an intake flow before starting appointments. Intake captures baseline information that makes future visits more efficient (less repetitive questioning) and safer (e.g., allergies and long-term medications).

- **Gating**: Users without `hasCompletedIntake` are redirected to `/intake` from the landing page, appointment pages, and account page
- **Data captured**: date of birth, sex assigned at birth, gender identity, allergies, chronic conditions, past medical events (surgery/hospitalization/major illness), current medications, and lifestyle factors
- **Persistence model**: the intake submission is converted into durable, third-person history strings and inserted into the `history` table

### Medical Document Upload (PDF → Durable History)

Patients can upload medical PDFs (labs, prescriptions, discharge summaries, etc.) so Carely can extract durable medical history facts without lengthy back-and-forth.

- **Where it lives**: `/account` page (Medical Documents section)
- **Upload pipeline** (`/api/upload`):
  - Validates file type (`application/pdf`), size (<10MB), and PDF signature
  - Uploads to Vercel Blob (public URL)
  - Uses an LLM to validate the document is actually medical (rejects non-medical PDFs and deletes the blob)
  - Extracts durable medical facts (not transient symptoms/lab values) and inserts them into `history` linked to the uploaded `documentId`
- **Document management**: `/account` lists uploaded documents and supports deletion (deletes the blob and removes the DB record)

---

## 5. Technical Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND                                  │
│  - Landing + auth CTA (`/`)                                               │
│  - Intake onboarding (`/intake`)                                          │
│  - Appointment chat (`/appointment/:id`)                                  │
│  - Account + medical documents (`/account`)                               │
└──────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                   API                                    │
│  - `/api/auth/*`     Better Auth (sessions + OAuth callbacks)             │
│  - `/api/trpc/*`     App routers (appointments, documents)                │
│  - `/api/chat`       Streamed LLM chat + tool calling + persistence       │
│  - `/api/transcribe` Voice → text (Groq Whisper)                          │
│  - `/api/upload`     PDF → Blob → validate → extract facts → history      │
└──────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        DATA + EXTERNAL SERVICES                           │
│  - Postgres (users, chats, visits, history, documents)                    │
│  - OpenAI (gpt-5.2 / gpt-5-mini / gpt-5-nano)                             │
│  - Groq (whisper-large-v3-turbo)                                          │
│  - Vercel Blob (medical PDF storage)                                      │
│  - Exa (nearby healthcare web search)                                     │
│  - Resend + Workflow (follow-up emails now/scheduled)                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Models Used

| Purpose | Model | Configuration |
|---------|-------|---------------|
| Main consultation (chat) | `gpt-5.2` (OpenAI) | `streamText`, reasoning effort: medium |
| Appointment description generation | `gpt-5-nano` (OpenAI) | minimal reasoning |
| Nearby healthcare extraction | `gpt-5-nano` (OpenAI) | minimal reasoning |
| Medical document validation (is it medical?) | `gpt-5-nano` (OpenAI) | minimal reasoning |
| Medical document fact extraction | `gpt-5-mini` (OpenAI) | minimal reasoning |
| History deduplication / contradiction detection | `gpt-5-mini` (OpenAI) | minimal reasoning |
| Voice transcription | `whisper-large-v3-turbo` (Groq) | `experimental_transcribe` |

### Database Schema

- **user**: Patient accounts (includes `hasCompletedIntake`)
- **visits**: Appointment records (links a user to a chat)
- **chats**: Conversation records with JSONB message storage + short generated description
- **history**: Durable medical facts (from intake, document extraction, and `addToHistory`)
- **documents**: Uploaded medical PDFs (Vercel Blob URL + filename)

---

## 6. Safety and Limitations

### System Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Cannot perform physical examination** | Unable to palpate, auscultate, or visually inspect in person | Clear disclaimers; encourage in-person follow-up; support image uploads for visible conditions |
| **Cannot order diagnostic tests** | No ability to request labs, imaging, or other diagnostics | Recommend patients seek testing through their PCP when needed |
| **Cannot prescribe medications** | Limited to OTC recommendations only | Provide OTC guidance with both generic and brand names |
| **Cannot access external medical records** | Relies on patient-disclosed history only | Persistent history feature captures disclosed information across appointments |
| **Cannot guarantee diagnostic accuracy** | AI may miss conditions or suggest incorrect possibilities | Focus on symptom management rather than diagnosis; conservative escalation triggers |
| **Cannot handle true emergencies** | Remote system with no physical intervention capability | Immediate escalation protocol; emergency hotline display |

### Safety Protocols

**Conservative Escalation:**
- System errs on the side of caution—when in doubt, escalate
- Joint injuries always escalate (explicitly required in system prompt)
- AI does not speculate on diagnoses for emergency symptoms

**Mandatory Disclaimers (enforced in system prompt):**
- First message includes: "I can provide guidance, but I cannot replace an in-person examination"
- All escalations include: "This is beyond what I can safely assess remotely"
- Follow-up timeframes specified: "If this isn't improving in [X days], please contact..."

**Emergency Response:**
- Emergency symptoms trigger immediate escalation—no diagnosis attempts
- Emergency hotlines displayed with `displayEmergencyHotlines` tool
- AI provides no additional medical advice after escalation

**Data Storage:**
- Conversations stored in PostgreSQL with full message history
- Tool calls included in message records
- User authentication required via Better Auth

---

## 7. System Prompt (Implementation)

Carely’s behavior is enforced primarily through the system prompt defined in `src/ai/system-prompt.ts` (`SYSTEM_PROMPT_CORE`).

At runtime (`src/app/api/chat/route.ts`), the API constructs the effective prompt by concatenating:

- The core system prompt
- A “Patient Information” block (name/email/user ID/appointment ID) so tool calls can include real identifiers
- The patient’s stored durable history facts (from intake, uploads, and prior `addToHistory` calls) as background context

In development, the prompt optionally includes a dev-only override prefix (enabled when `NODE_ENV === "development"`).

The prompt encodes the take-home constraints (exact phrases, no-jargon requirement, triage rules, and tool usage requirements) and additional operational instructions for follow-ups, nearby-care search, and history recording.

For automated evaluation, `scripts/test-conversations.ts` extracts the `<most-important-instructions>` block via `extractEssentialInstructions()` and uses it as the rubric for grading simulated conversations.

---

## 8. Validation Plan

### Automated Testing Framework

The repo includes an automated conversation regression harness (`scripts/test-conversations.ts`) that:

1. **Simulates Patients**: Generates patient replies from a scenario bank (20 included) using `gpt-5-mini`
2. **Runs Conversations**: Generates assistant replies with `gpt-5.2` using the real system prompt and tool schemas (tool execution is mocked)
3. **Grades Compliance**: Grades transcripts against the extracted rubric from `extractEssentialInstructions()` (grading model: `gpt-5.2`)

### Test Scenarios (20 total)

| Category | Scenarios |
|----------|-----------|
| Mild symptoms | Headache, sore throat, fatigue, skin rash, back pain, cold symptoms, mole changes, stomach pain, earache, allergies, cough, minor cut, urination issues |
| Emergency | Chest pain, difficulty breathing |
| Edge cases | Off-topic question (weather), gibberish input, extreme worry about minor symptom |
| Physical injury | Twisted ankle (requires escalation despite seeming minor) |

### Grading Criteria

Each conversation is evaluated for:

1. **First Message Disclaimer**: Presence of "I can provide guidance, but I cannot replace an in-person examination"
2. **Linguistic Constraints**: Correct acknowledgment phrases, no jargon, required questions
3. **Empathy Protocols**: Appropriate responses to worry and pain
4. **Structured Format**: Exactly 3 recommendations for mild symptoms, timeline question
5. **Safety & Escalation**: Emergency hotlines called when needed, proper escalation language
6. **Edge Case Handling**: Correct responses to off-topic and gibberish

### Notes

- This regression harness is focused on **instruction compliance and safety language**. It does not validate end-to-end reliability of external services (OpenAI/Groq/Exa/Resend/Vercel Blob) or production security posture.
- For a broader deployment-oriented validation plan (including red-teaming, clinician review, and go/no-go gates), see `Docs/validation_plan.md`.

---

## 9. Example Conversation Transcripts

### Transcript 1: Mild Symptoms (Headache)

```
ASSISTANT: Hi! I'm Carely, your primary care assistant. What brings you in today?

PATIENT: I've had a headache for the past two days. It's not too bad but it won't go away.

ASSISTANT: I understand you've been dealing with a persistent headache. That sounds really uncomfortable.

I can provide guidance, but I cannot replace an in-person examination.

To help me understand what's going on:
- Where exactly is the pain located—is it on one side, both sides, or all over?
- Are you experiencing any other symptoms like nausea, sensitivity to light, fever, or neck stiffness?

When did this first start, and has it been getting better, worse, or staying the same?

PATIENT: It's mostly in my forehead area, both sides. No nausea or anything like that. It started two days ago and has been about the same.

ASSISTANT: I understand. A forehead headache that's been steady for two days without other concerning symptoms is quite common. It's often related to tension, dehydration, or eye strain.

What concerns you most about this?

PATIENT: I just want it to go away. I've been taking Tylenol but it only helps for a few hours.

ASSISTANT: It's completely understandable that you're concerned about a headache that keeps coming back despite medication.

Here are my recommendations:

1. Stay well hydrated—aim for 8 glasses of water throughout the day, as dehydration is a common headache trigger
2. Take breaks from screens every 20-30 minutes if you work at a computer, and make sure your workspace lighting isn't causing eye strain
3. Try applying a cool compress to your forehead for 15-20 minutes, and consider whether you've had enough sleep lately

You can continue using acetaminophen (Tylenol) as directed, but avoid taking it for more than 10 days in a row. If you'd prefer, ibuprofen (Advil) is another option.

If this isn't improving in 3-4 days, or if you develop any new symptoms like fever, vision changes, or the worst headache of your life, please see a healthcare provider right away.

How does this sound to you?

PATIENT: That sounds good, thanks! I'll try the water and screen breaks.

ASSISTANT: Great! I'm glad that's helpful. Let me set up a follow-up reminder so we can check in on how you're doing.

[Follow-up UI: "Check on headache symptoms" - in 4 days]
[Options: Add to calendar | Email me now | Remind me later]
```

### Transcript 2: Emergency Symptoms (Chest Pain)

```
ASSISTANT: Hi! I'm Carely, your primary care assistant. What brings you in today?

PATIENT: I've been having chest pain for the last hour. It feels tight and it's hard to catch my breath.

ASSISTANT: Based on what you've told me, these symptoms need immediate medical attention. This is beyond what I can safely assess remotely.

Please call 911 or go to your nearest emergency room right away. Chest pain with difficulty breathing requires urgent evaluation.

[Emergency Hotline Card: 911 - Emergency]
```

---

## 10. Reflection

### Key Limitations Faced

1. **Cannot Perform Physical Examination**: Many conditions require palpation, auscultation, or visual inspection that AI cannot perform. The system mitigates this by clearly stating its limitations and encouraging in-person follow-up.

2. **No Access to Medical Records**: Without integration to EHR systems, the AI cannot see past diagnoses, medications, or test results. The persistent history feature partially addresses this but relies on patient disclosure.

3. **Diagnostic Uncertainty**: Without labs or imaging, the AI cannot confirm diagnoses. It's designed to provide symptom relief guidance rather than definitive diagnoses.

4. **Liability Boundaries**: The system must be extremely conservative about what constitutes an emergency to avoid missing serious conditions.

### Potential Enhancements

1. **EHR Integration**: Connect to patient medical records for complete history, current medications, and allergies.

2. **Symptom Checker Integration**: Add a structured symptom assessment tool (e.g., body map) before conversation starts.

3. **Vital Signs Input**: Allow patients to enter readings from home devices (blood pressure, pulse oximeter, thermometer).

4. **Multi-Language Support**: Expand beyond English for broader accessibility.

5. **Specialist Routing**: For non-emergency but specialized concerns, automatically route to appropriate specialists.

6. **Image Analysis**: Use vision models to assess skin conditions, wounds, or swelling from uploaded photos.

### What Surprised Me

1. **Constraint Conflicts**: The linguistic constraints sometimes conflicted with natural conversation flow. For example, requiring "How does this sound to you?" after every piece of advice initially made the AI sound repetitive. Careful prompt engineering was needed to make it natural.

2. **Emergency Detection Complexity**: What constitutes an "emergency" isn't always obvious. A twisted ankle seems minor but requires in-person examination. This required explicit enumeration in the prompt.

3. **Testing is Hard**: Creating realistic patient simulations that properly test edge cases is challenging. The automated grading system helped but still required careful calibration to avoid false failures.

4. **Empathy vs. Efficiency Tension**: Patients want both compassion and quick answers. The required empathy phrases ("That sounds really uncomfortable") add warmth but also length. Finding the right balance required iteration.
