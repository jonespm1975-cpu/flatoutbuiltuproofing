#!/usr/bin/env python3
"""Unauthenticated, read-only HTTP smoke test. Never uses or prints secrets."""
import json
import urllib.error
import urllib.request

URL = "https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/purchase-email-retry-worker"

def check(method, expected):
    request = urllib.request.Request(URL, method=method)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            code = response.status
            payload = json.loads(response.read(1024).decode())
    except urllib.error.HTTPError as error:
        code = error.code
        payload = json.loads(error.read(1024).decode())
    assert code == expected, f"{method}: expected {expected}, got {code}"
    assert "queue_records" not in payload and "lease_token" not in payload, "Private data leaked"
    print(f"PASS {method}: HTTP {code} (no private queue data)")

check("GET", 405)
check("POST", 401)
print("Unauthenticated HTTP smoke tests passed. Authenticated monitoring not tested.")
