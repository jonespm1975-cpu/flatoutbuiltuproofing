# Six-priority release audit — 22 November 2026

**Scope:** 24 distinct £9.99 one-time specialist roofing lessons. **RELEASE STATUS: BLOCKED.** This is a verified read-only supplier/app audit and code/CI hardening, not a claim of manufacturer approval.

## 1. Critical technical lesson reviews — tracked
GitHub issue #12 records all nine critical-risk lessons and named evidence required. Source: `fulfilment/24-course-technical-qa-2026-11-22.md`.
- **Complete:** scope, priority, evidence requirement and tracker
- **Blocked:** no named competent reviewer, manufacturer-approved document revisions or sign-off

## 2. High-priority technical lesson reviews — tracked
GitHub issue #13 lists the other fifteen product-specific reviews.
- **Complete:** evidence tracker and technical-review request
- **Blocked:** no qualified assessment or approved supplier-specific diagrams/dimensions

## 3. Private lesson delivery — audited
Supabase `fhyhshakmvqwzdyannec` currently has three *private* buckets: `paid-course-media`, `member-gallery`, `sponsor-logos`. Existing MIME allowlists disallow JSON; no dedicated `paid-lessons-private` bucket exists.
- **Complete:** existing bucket inspection, draft SQL, gated Edge Function, draft denial tests
- **Blocked:** isolated environment, approved migration, verified technical content and private import; **nothing deployed**
- **Security:** unchanged as requested; no RLS changes or public paid-content hosting

## 4. Stripe course prices — audited
Read-only account `acct_1UT8NBKeIprRDTKx` has four active prices: £9.99 legacy/current one-time prices and £1.99/£5 monthly prices; **none of the 24 staged lesson IDs has a verified individual Price mapping**. The correct £5 monthly product remains separate.
- **Complete:** four-price live account audit; all 24 unconfigured courses rejected via staging validation
- **Blocked:** 24 unique one-time sandbox and 24 unique live price IDs with product mapping. Do not create live charges, prices or activate billing without dedicated checkout readiness review and authorisation.

## 5. Supabase fulfilment and email — audited
Project is ACTIVE_HEALTHY on PostgreSQL 17; no Supabase branches. The existing `stripe-test-webhook` v33 and `live-purchase-email-delivery-worker` v7 are hard-coded to `beginner-training-course`. There are **zero** purchase confirmations for other course IDs and **four** legacy beginner confirmations, counted read-only.
- **Complete:** accurate gating/entitlement plan; staged 24-course routing, signed fixtures and isolated 2-connection PostgreSQL tests
- **Blocked:** real sandbox endpoint, atomic real RPC, generic course-specific email worker, provider confirmation and actual entitlement readback
- Do NOT turn on live webhook, membership, email worker or purchase flags.

## 6. GitHub go-live guard — strengthened and tested
`fulfilment/release-gates.mjs` requires **24 exact valid course IDs**, independent signed qualified QA evidence for each, technical drawings and assessments, **48 unique Stripe Price IDs** (test + live), provider-confirmed sandbox email, atomic database evidence, per-course access tests, GB checkout eligibility, consent, private content, and explicit final owner go-live approval.
- `fulfilment/release-gates.test.mjs` asserts the **actual current catalogue fails closed** and a controlled test fixture only passes with complete evidence; it rejects missing sign-off, duplicate prices and absent email evidence.
- `sandbox-checkout-resolver.mjs` also rejects unknown catalogue IDs, preventing an apparently valid set of 24 arbitrary identifiers.

## Current interpretation
- **Six priorities reviewed and staged safely; production implementation is not complete.**
- **Zero of 24 new courses is ready for purchase.**
- Draft pull request #11 must remain unmerged while content/checkout flags are disabled.
- Approved homepage and £5 membership setting unaffected.

## Review sources
- Supabase read-only project status, storage buckets, Edge Function versions and table counts, 22 Nov 2026
- Stripe read-only Price list, 22 Nov 2026
- GitHub draft PR #11 and technical QA review
- [Supabase private Storage guidance](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Stripe signed payment webhooks](https://docs.stripe.com/webhooks)
