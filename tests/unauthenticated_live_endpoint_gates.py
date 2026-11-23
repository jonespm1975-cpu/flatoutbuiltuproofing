"""Safe HTTP probes: no auth tokens, no Stripe sessions, no email, no customer mutation."""
import json
import urllib.request
import urllib.error

BASE="https://fhyhshakmvqwzdyannec.supabase.co/functions/v1/"
def probe(slug,method="POST",content=None,origin=False):
    data=json.dumps(content or {}).encode() if method=="POST" else None
    headers={"Content-Type":"application/json"}
    if origin:
        headers["Origin"]="https://flatoutbuiltuproofing.co.uk"
    request=urllib.request.Request(BASE+slug,data=data,headers=headers,method=method)
    try:
        with urllib.request.urlopen(request,timeout=15) as response:
            status=response.status
    except urllib.error.HTTPError as response:
        status=response.code
    print(f"SAFE_GATE {slug} {method} status={status}",flush=True)
    return status

def expect(name,actual,allowed):
    if actual not in allowed:
        raise AssertionError(f"{name}: HTTP {actual} not in {sorted(allowed)}")
    print(f"PASS {name}: {actual}",flush=True)

# Correct website origin but no login bearer. The checkout handler must stop
# before attempting to create a session. 401 means flag active; 503 means hold.
checkout=probe("stripe-live-checkout",content={
  "immediate_access_consent":True,
  "cancellation_acknowledgement":True,
  "terms_accepted":True
},origin=True)
expect("checkout no-bearer cannot create Stripe session",checkout,{401,403,503})
if checkout==401:
    print("IMPORTANT: checkout flag appears enabled; unauthenticated access was safely rejected.")
elif checkout==503:
    print("CHECKOUT HOLD: code/config returned unavailable before authentication.")
else:
    print("CHECKOUT HOLD: request blocked before Stripe.")
expect("unsigned webhook rejected",probe("stripe-webhook"),{400,401,403})
expect("retired email sender has no live send path",probe("live-purchase-email-delivery-worker"),{410})
expect("private course content requires sign-in",probe("paid-lesson-content",method="GET"),{401,403})
expect("purchase confirmations require sign-in",probe("my-purchase-confirmations",method="GET"),{401,403})
expect("sponsor upload without invitation rejected",probe("sponsor-logo-intake"),{400,403})
print("ALL UNAUTHENTICATED LIVE ENDPOINT GATES PASS; NO PAYMENTS OR EMAIL SENT")
