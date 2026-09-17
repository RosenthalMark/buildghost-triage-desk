import type { TriageIssue } from '../TriageDeskPage';

export const DEMO_LOCAL_STORAGE_KEY = 'buildghost_demo_tickets_v4';

export const DEMO_SEED_ISSUES: TriageIssue[] = [
  {
    id: 'DEMO-101',
    sequence_id: 101,
    name: "DEMO — How This Triage Desk Works (Try It — It's a Sandbox)",
    description_text:
      'Welcome to the BuildGhost Triage Desk. I built this in ~4 hrs from scratch — Plane API proxy, Vercel, Resend, localStorage identity.\nThis demo ticket explains my QA brain. Everything you do here is local-only and resets on refresh.',
    priority: 'medium', // P2 Major
    state: 'OPEN',
    affected_platforms: ['Web'],
    blocker_active: false,
    blocker_text: '',
    blocker_resolved_text: '',
    acceptance_criteria: [
      {
        id: 'demo-ac-1',
        text: 'This checklist is the quality gate. All boxes must be checked to close. This is how I prevent "fixed-ish" tickets.',
        done: false,
      },
      {
        id: 'demo-ac-2',
        text: 'Example: Evidence attached (screenshot / Loom / logs)',
        done: false,
      },
      {
        id: 'demo-ac-3',
        text: 'Example: Fix verified on Web + Mobile + no regression in existing flow',
        done: false,
      },
    ],
    steps_to_reproduce: [
      "This field is where you describe HOW to reproduce the bug. Keep it short, numbered, and actionable. No \"it doesn't work\".",
      'Example: Go to /triage-desk/demo -> click + Add Issue -> fill Steps.',
      "Try uploading a screenshot — drag & drop or Cmd+V — that's your evidence.",
    ],
    remediation:
      'Automated Playwright regression suite + K6 concurrency fence deployed in CI/CD pipeline to guarantee release safety.',
    links: [
      {
        id: 'demo-link-1',
        url: 'https://markrosenthal.site',
        label: 'Mark Rosenthal Portfolio & Case Study',
      },
      {
        id: 'demo-link-2',
        url: 'https://buildghost.site',
        label: 'BuildGhost Live Platform',
      },
    ],
    attachments: [
      {
        id: 'demo-att-vid-1',
        name: 'BuildGhost Triage Desk — Video Walkthrough',
        type: 'video',
        url: '/triage-desk/assets/triage.mp4',
        thumbnail_url: '/triage-desk/assets/TRIAGE.png',
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'Mark Rosenthal',
      },
      {
        id: 'demo-att-img-2',
        name: 'BuildGhost Triage Desk — Console Architecture Logo',
        type: 'image',
        url: '/triage-desk/assets/TRIAGE.png',
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'Mark Rosenthal',
      },
    ],
    creator_name: 'Mark Rosenthal',
    creator_email: 'buildghost.dev@gmail.com',
    watchers: ['qa-lead@buildghost.site'],
    comments: [
      {
        id: 'demo-c-sys-0',
        author: 'BuildGhost System // Demo-Desk',
        text: 'Sandbox instance initialized. Demo mode active: local storage only, zero external API traffic, live emails mocked.',
        timestamp: new Date().toISOString(),
        is_system: true,
      },
      {
        id: 'demo-c-1',
        author: 'Mark Rosenthal',
        author_email: 'buildghost.dev@gmail.com',
        text: 'Welcome! Try creating an issue, toggling a P0 Blocker, uploading a screenshot with Cmd+V, or posting a note with @QA or @DevOps.',
        timestamp: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
