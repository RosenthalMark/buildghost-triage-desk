<p align="center">
  <img src="https://raw.githubusercontent.com/RosenthalMark/buildghost-triage-desk/main/assets/triage-desk-logo.png" alt="BuildGhost Triage Desk" width="480" />
</p>


# BuildGhost // Triage Desk

> Next-generation issue tracker, release governance, and engineering verification platform.

**Live Interactive Sandbox:** [buildghost.site/triage-desk/demo](https://buildghost.site/triage-desk/demo)  
**Ecosystem Portal:** [buildghost.site](https://buildghost.site)

---

## Architectural Overview & Problem Space

In modern engineering organizations, issue tracking and defect triage are fragmented across bloated ticketing backlogs, disconnected Slack threads, ad-hoc screen recordings, and ambiguous release signoffs. When high-priority failures occur, release leads and engineering architects lose critical cycle time chasing down:

1. Exact, deterministic reproduction steps across frontend surfaces and distributed backends.
2. Binary release-blocking status, blast-radius containment, and deployment hold states.
3. Explicit acceptance criteria required for verifiable, regression-free signoffs.
4. Real-time stakeholder and watcher alerting without noisy notification spam.

**BuildGhost Triage Desk** is engineered as a high-density operational command center. Designed as a foundational pillar of the upcoming **BuildGhost Cloud** ecosystem, it unifies issue tracking, defect reproduction, release-blocker quarantine, and automated verification gates into a single, high-velocity interface.

---

## Core QA & Systems Architecture

### 1. P0–P4 Severity State Machine & Blocker Containment
* **P0 Blocker:** Immediate release gate halt. Flags active deployment blockers with persistent quarantine status, blocking silent merges and production releases until explicit remediation criteria are satisfied.
* **P1 High:** High-impact functional regression across primary user flows with no acceptable workaround.
* **P2 Major / P3 Medium / P4 Minor:** Granular triage stratification ensuring engineering bandwidth is prioritized strictly by business impact and release risk.
* **Release Blocker Governance:** Enforces a strict blocker state machine requiring remediation notes and verification proof before release flags can be cleared.

### 2. Verification-First Acceptance Gates
* Every ticket maintains an inline **Acceptance Criteria Checklist**.
* Eliminates ambiguous "fixed-ish" resolutions by requiring verifiable proof criteria before tickets can transition out of `IN_PROGRESS` into `ARCHIVED`.

### 3. Cross-Platform Surface Segmentation
* Isolates defect blast radius across target delivery surfaces:
  * `Web` / `Mobile Web`
  * `iOS Safari` / `Android Chrome`
  * `API Gateway` / `Backend Workers`
  * `Billing & Webhooks`
  * `WebRTC Real-time Media`

### 4. Deterministic Steps to Reproduce (STR) & Evidence Engine
* Enforces structured reproduction steps with numbered, actionable sequences.
* Native media parser supporting Loom share links, YouTube, and direct video/screenshot attachments with automated preview rendering for rapid defect verification.

### 5. Event-Driven Watcher Notifications (Resend Pipeline)
* Automated stakeholder dispatch system powered by the **Resend API**.
* Release engineers and subscribed watchers receive immediate alerts when blocker flags toggle, remediation notes are posted, or acceptance criteria are checked off.
* Includes an **Email Safe Mode** sandbox to prevent runaway notifications during testing and evaluation.

### 6. Dual-Mode Architecture (Live Plane.so Sync vs. Zero-Friction Demo Sandbox)
* **Live Operations:** Binds bi-directionally to a **Plane.so** issue-tracking workspace via custom Vercel serverless proxy functions and webhook listeners.
* **Sandbox / Demo Mode:** Built with a fully client-side reactive state engine (`demoSeed.ts`) and LocalStorage persistence. Evaluators can simulate end-to-end defect lifecycles, file tickets, toggle blocker states, and test email dispatches without needing third-party API credentials.

---

## Strategic Roadmap: BuildGhost Cloud

Triage Desk serves as the operational baseline for a broader engineering suite under active development:

* **Release Trains & Bundling:** Grouping tickets, defect fixes, and stories into verified release milestones with deployment gates.
* **Epics & Product Initiatives:** High-level strategic roadmap orchestration with hierarchical task breakdown.
* **Integrated Specifications & Knowledge Base:** Linked technical specs and living documentation connected directly to active tickets and verification runs.
* **Agentic Automation:** Heuristic stack-trace clustering and automated defect reproduction assistance.

---

## Technical Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | React 18 / 19, TypeScript, Vite | Type-safe component architecture, dense operational UI |
| **Styling & Theme** | Modern CSS Custom Properties | Custom high-contrast cyber-ops design tokens and responsive grid layouts |
| **Backend & Middleware** | Vercel Serverless (Node.js Edge) | API proxy, CORS normalization, and webhook routing |
| **Issue Engine** | Plane.so REST API | Enterprise-grade issue tracking, project hierarchy, and state synchronization |
| **Transactional Email** | Resend API (`api.resend.com/emails`) | Automated watcher alerts, incident escalation, and dispatch logging |
| **Media Parsing** | Custom Video Embed Extractors | Direct parsing and playback for Loom, YouTube, and HTML5 video blobs |
| **State & Persistence** | Optimistic UI State + LocalStorage | Instant UI feedback with transparent fallback for offline and demo sandbox runs |

---

## Directory Structure

```text
buildghost-triage-desk/
├── api/
│   ├── plane.js              # Serverless API proxy for Plane.so issue gateway
│   ├── plane-webhook.js      # Webhook ingestion pipeline & Resend email dispatcher
│   └── plane/
│       └── [...path].js      # Dynamic route forwarder for deep Plane API calls
├── public/
│   └── assets/               # Branding assets, fallback media, and icons
├── src/
│   ├── lib/
│   │   └── demoSeed.ts       # Deterministic seed data and mock state engine
│   ├── styles/
│   │   └── triage-desk-app.css # Design tokens and responsive layout stylesheets
│   ├── App.tsx               # Dual-mode application wrapper
│   ├── main.tsx              # Application mount
│   └── TriageDeskPage.tsx    # Core issue tracker & triage command desk
├── .env.example              # Environment variable template
├── index.html                # Entry HTML shell
├── package.json              # Package manifest
├── tsconfig.json             # TypeScript configuration
├── vercel.json               # Route rewrites and serverless proxy mappings
├── LICENSE                   # Proprietary software license
└── README.md                 # System architecture specification
```

---

## Local Development & Setup

### Prerequisites
* Node.js 18+
* npm or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/RosenthalMark/buildghost-triage-desk.git
cd buildghost-triage-desk
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:

```env
# Plane.so Integration
PLANE_API_URL=https://app.plane.so/api/v1
PLANE_API_KEY=your_plane_api_key
PLANE_WORKSPACE=your_workspace_slug
PLANE_PROJECT_ID=your_project_uuid

# Resend Email Dispatch
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=noreply@buildghost.site
ADMIN_EMAIL=your_admin_email@example.com

# Safety Sandbox Mode (Strictly limits outbound emails to ADMIN_EMAIL when true)
EMAIL_SAFE_MODE=true
```

### 3. Run Development Server
```bash
npm install
npm run dev
```

The application will boot in unauthenticated interactive sandbox mode with seeded test cases, blocker scenarios, and simulated email dispatches.

---

## Quality Philosophy

> *"Software quality is not defined by how many tests run green in CI; it is defined by how rapidly a team can isolate, understand, and neutralize release risk before it reaches users."*

Triage Desk was constructed around the principle that QA must build systems, not bottlenecks. By pairing strict defect classification with frictionless reproduction proof and automated stakeholder alerts, quality becomes a transparent, shared release signal.

---

## License

Proprietary software. Copyright (c) 2026 Mark Rosenthal / BuildGhost. All rights reserved.  
Public availability is strictly for evaluation and portfolio demonstration purposes.
