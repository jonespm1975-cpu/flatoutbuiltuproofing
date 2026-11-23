# Requested Tasks 102–140 — execution and release-status ledger
Date 2026-11-13 UTC. Scope: safe read-only verification plus two isolated draft content files. User requested tasks 102–110 and 112–140; task 111 omitted.

## Completed this pass (specific deliverables, not entire task)
- Drafted courses/tapered-insulation.html (Task 114) and lessons/tools-safety.html (Task 115) on audit branch only. Original educational content; no live publication, media, technical sign-off or payment gating. These tasks remain PARTIAL.
- Static inspected main-branch members.html, privacy.html, refunds.html, manager.html, gallery.html, sponsors.html, community.html, site.css. All seven HTML files have mobile viewport tags. Privacy, refunds and manager pages explicitly contain DRAFT/owner review wording; legal sign-off and operational reporting remain outstanding.
- Main branch cscs.html and health-safety.html exist; presence does not establish completeness, originality, accuracy or compliance.
- Earlier 13 Nov read-only checks: sandbox Stripe/Supabase subscription status active, cancel_at_period_end=true, correct 199p price and matching period end. Email receipt marked sent but retry queue provider ID absent, attempts=0; worker dry-run. Supabase RPC permissions deny anon/authenticated service-only writes; leaked-password protection disabled. Historical 400/422 webhook delivery responses still not obtained.

## Status by requested task
102 BLOCKED — Resend delivery ID/provider evidence unavailable.
103 PARTIAL — RPC signature/grants verified; real candidate deployment/integration not tested.
104 PARTIAL — webhook source and event timing inspected; exact failed delivery response missing.
105 PARTIAL — isolated concurrency and mock tests passed previously; no provider E2E.
106 PARTIAL — existing course_access rows; purchase-to-entitlement E2E not exercised.
107 PARTIAL — RLS policies and anonymous RPC denial; unauthenticated protected endpoint E2E not exercised.
108 PARTIAL — current sandbox membership and cancellation aligned; renewal/failure/expiry scenarios untested.
109 PENDING — account signup, recovery and real session tests require controlled test identity.
110 HOLD — deployment/rollback release gate not cleared.
112 PARTIAL — lesson imagery/video references statically reviewed, rendering untested.
113 PARTIAL — public free lesson and JWT-protected endpoint observed; paid/free E2E untested.
114 PARTIAL — original unpublished tapered-insulation draft created; images/videos/review/payment gating outstanding.
115 PARTIAL — original unpublished beginner tools/safety draft created; images/videos/competent review outstanding.
116 PARTIAL — cscs.html and health-safety.html exist; comprehensive curriculum review not completed.
117 PARTIAL — gallery.html, sponsors.html and community.html exist; submission, moderation, abuse controls and backend flows untested.
118 PARTIAL — privacy.html and refunds.html visibly marked draft; terms.html also marked draft in prior inspection; no legal sign-off.
119 PARTIAL — viewport tags found; physical iOS/Android testing not performed.
120 HOLD — depends on content, legal, access, mobile and security acceptance.
121 BLOCKED — same historical Resend provider evidence as Task 102.
122 PARTIAL — manager.html exists and is marked draft; reporting reconciliation not verified.
123 PARTIAL — sandbox £9.99/£1.99 price evidence; live pricing/tax/cancellation display E2E untested.
124 PARTIAL — security advisor leaked-password warning and five RLS-no-policy informational findings; no security settings changed.
125 HOLD — launch approval withheld.
126–140 UNDEFINED — no task descriptions supplied and none established in existing 100–125 task register. Do not invent completion criteria or claim these tasks done. Ask user for definitions or create a separately proposed backlog for approval.

## Safety / next gates
No emails, payments, checkout sessions, secret changes, webhook replays, SQL mutations, subscription/cancellation or entitlement changes, live billing changes, homepage changes, Supabase plan changes, merges or deployments.
The two new files are in the isolated audit branch only. To finish: provider webhook delivery response bodies; Resend message history; test identity for Auth E2E; UK technical and legal review; mobile rendering; security advisor remediation if supported; final controlled acceptance and deployment approval.
