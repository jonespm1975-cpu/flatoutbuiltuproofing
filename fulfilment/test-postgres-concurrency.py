"""Real two-connection PostgreSQL CI test. Disposable database only; no Supabase or Stripe calls."""
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import psycopg

DB = os.environ["CI_POSTGRES_URL"]
COURSES = [f"{category}-{i:02d}" for category in
           ("built-up", "tile-slate", "metal-sheet", "liquid-applied")
           for i in range(1, 7)]
USER = uuid.UUID("11111111-1111-4111-8111-111111111111")
OTHER = uuid.UUID("22222222-2222-4222-8222-222222222222")


def record(session, user, course, barrier=None):
    # Each invocation creates an independent PostgreSQL backend connection.
    with psycopg.connect(DB, autocommit=True, connect_timeout=10) as conn:
        if barrier:
            barrier.wait(timeout=15)
        return conn.execute(
            "select ci_fulfilment.record_paid_sandbox_order(%s,%s,%s)",
            (session, user, course),
        ).fetchone()[0]


def counts():
    with psycopg.connect(DB) as conn:
        return conn.execute("""SELECT
            (SELECT count(*) FROM ci_fulfilment.receipts),
            (SELECT count(*) FROM ci_fulfilment.entitlements),
            (SELECT count(*) FROM ci_fulfilment.outbox)""").fetchone()


def race(session, user, course):
    barrier = Barrier(2)
    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(record, session, user, course, barrier)
        f2 = executor.submit(record, session, user, course, barrier)
        results = {f1.result(timeout=25), f2.result(timeout=25)}
    assert results == {"inserted", "already_recorded"}, (session, results)


def expect_rejected(session, user, course):
    try:
        record(session, user, course)
    except psycopg.Error:
        return
    raise AssertionError(f"Unexpectedly accepted {session} {course}")


assert len(COURSES) == 24 and len(set(COURSES)) == 24
for i, course in enumerate(COURSES):
    race(f"cs_test_concurrent_{i}", USER, course)
    assert counts() == (i + 1, i + 1, i + 1), (course, counts())

# Existing receipt cannot be reassigned to another user or course.
expect_rejected("cs_test_concurrent_0", OTHER, COURSES[0])
expect_rejected("cs_test_concurrent_0", USER, COURSES[1])
assert counts() == (24, 24, 24)

# Already-owned course with a different paid Checkout Session must be rejected,
# without leaving an orphan receipt or outbox entry.
expect_rejected("cs_test_different_session", USER, COURSES[0])
assert counts() == (24, 24, 24)

# Second user can independently buy a course already purchased by first user.
assert record("cs_test_second_buyer", OTHER, COURSES[0]) == "inserted"
assert counts() == (25, 25, 25)

# Unknown or live sessions must never pass.
expect_rejected("cs_live_bad", USER, COURSES[0])
expect_rejected("cs_test_unknown", USER, "not-a-course")
assert counts() == (25, 25, 25)

print("PASS: 24 genuine PostgreSQL two-connection races; one receipt, one"
      " entitlement and one outbox item each. Conflicts and course isolation passed.")
