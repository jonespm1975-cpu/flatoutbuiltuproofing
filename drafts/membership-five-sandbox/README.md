# £5 membership sandbox — unreleased draft

Use the existing £5 sandbox account, never live mode. The verified GBP 500 monthly price is price_1UfiBg3eiZFnd5l0Y7cs24MU; verified cancellation configuration is bpc_1UfiBq3eiZFnd5l0fu6AnFEE (end of period, no plan changes).

## Release gates
- Review and execute database-DRAFT.sql in an isolated database first; test duplicate claims with two connections, stale events, conflicting ownership and price, and sandbox entitlement isolation. Verify existing membership table constraints and test rollback.
- Deploy with distinct slugs membership-five-test-checkout, membership-five-test-webhook and membership-five-test-portal, not the original directory names. Preserve original functions. Set JWT enforcement for checkout/portal where compatible; webhook must verify Stripe signatures itself.
- Install MEMBERSHIP_FIVE_TEST_STRIPE_SECRET_KEY and MEMBERSHIP_FIVE_TEST_WEBHOOK_SECRET securely via Supabase dashboard; never commit credentials. Verify the key targets the correct sandbox. Set MEMBERSHIP_FIVE_TEST_PORTAL_CONFIGURATION to the verified sandbox configuration above.
- Keep MEMBERSHIP_FIVE_TEST_CHECKOUT_ENABLED, MEMBERSHIP_FIVE_TEST_FULFILMENT_ENABLED and MEMBERSHIP_FIVE_TEST_PORTAL_ENABLED false until their respective controlled tests. Register only the dedicated sandbox webhook with subscription created/updated/deleted and invoice paid/payment_failed events.
- Test using an authenticated test account and test card; verify exact price, signed callbacks, lifecycle, no live access and independently purchased course entitlement preservation. Test cancellation and failed renewal. Postmark membership confirmation integration is not implemented in these drafts; validate separately before release.
- Do not enable production billing or merge into main on the basis of this source review.

## Rollback
Disable the three new sandbox flags first; disable the dedicated sandbox webhook. Preserve original secrets and endpoints. Reconcile any test records before removing new database objects; do not delete existing subscriptions. No live charges or customer email sends authorised.

Status: four draft source files committed; source configuration reviewed only. No database migration, function deployment, real signed event or checkout test performed.
