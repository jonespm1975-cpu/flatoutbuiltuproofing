# Flat Out Built-Up Roofing — first app starter

This is a responsive Progressive Web App (PWA) starter for iPhone and Android. It includes your supplied gold/black logo, free learning notes, a proposed £19.99 course, safety links, a local-only owner preview, PWA manifest/service worker, legal draft files and a Stripe Checkout server scaffold.

## Important current limitations

- The website/PWA interface works as a front-end preview. The buy button intentionally says checkout is not connected until the backend is deployed.
- The owner dashboard is a **local preview only**. Logo changes are stored in this browser on this device. It is not a secure admin system and does not manage a live website.
- No customer payments, ad network or sponsor payments are active. The revenue figures are placeholders, not real account data.
- The Stripe server is only a starter scaffold. It does not include a database, customer accounts, access control, fulfilment, admin authentication, transaction reports or payout controls. Add these before taking payments.
- Legal files are drafts, not legal advice or a guarantee of compliance. Have them reviewed for your business and implementation.
- Course content is introductory. Roofing work must follow current HSE guidance, site-specific risk assessments and the relevant manufacturer's instructions. This app is not endorsed by CITB or CSCS.

## Preview on a computer

Open `index.html` in a browser. PWA install/offline features generally require HTTPS or localhost; use a hosting preview for best results.

## Publish to your existing GitHub Pages website

1. Unzip this package.
2. Upload the contents of the `flatout_app` folder to the root of your `flatoutbuiltuproofing` GitHub repository, keeping `index.html` at the repository root. Upload `assets`, `legal`, `styles.css`, `app.js`, `manifest.webmanifest` and `sw.js` too.
3. Commit the changes to `main` and wait for the Pages deployment to finish.
4. Open `https://flatoutbuiltuproofing.co.uk` and refresh. Test the free lessons and mobile layout.
5. The website currently uses a logo file at `assets/logo-original.jpeg`. To change the permanent logo, replace that file with your chosen image using the same filename, or update all references and the manifest.

## Install on iPhone

After the app is published over HTTPS, open it in Safari. Tap Share → Add to Home Screen → Add. If you use Chrome on iOS, open in Safari for the most predictable install flow.

## Install on Android

Open the HTTPS site in Chrome, use the browser menu and choose Install app or Add to Home screen when offered.

## Configure Stripe test checkout (technical setup required)

1. Use a secure server host that supports Node.js. GitHub Pages alone cannot run `server.js` because it only serves static files.
2. On the server, install Node.js, upload `server.js` and `package.json`, and run `npm install`.
3. Copy `.env.example` to `.env`. Set a Stripe test secret key, webhook signing secret and the public HTTPS site URL. Never commit `.env` or share keys in email/chat.
4. Run `npm start`. Set up the Stripe webhook endpoint at `https://YOUR-SERVER-HOST/webhook` for `checkout.session.completed` and copy its signing secret into `.env`.
5. Add a secure front-end call to `/create-checkout-session` that targets your server. Configure CORS/reverse proxy, authentication and security controls as appropriate. The provided UI intentionally does not call this endpoint yet.
6. Before live mode: add a database with unique event IDs, account/login security, verified payment fulfilment, course access control, refund workflows, reporting and monitoring. Test failures, duplicate webhooks, refunds and chargebacks. Use the payment provider's dashboard for payout account setup and verified payout information.

Do not launch live payments until the full flow is tested and legal, tax, privacy and consumer requirements are reviewed.

## Ads and sponsorships

The starter has no ad SDK. Start with direct, clearly labelled sponsor placements after you have audience reach and signed agreements. For an advertising network, review its eligibility, privacy/consent, tracking and platform policies before adding its code. Avoid intrusive ads that interfere with learning or safety content.

## Recommended build order

1. Publish and test the PWA.
2. Finalise the actual course syllabus and lesson videos.
3. Commission/review the legal documents.
4. Add secure accounts and a database.
5. Integrate and test Stripe checkout, webhooks, refunds and access entitlement.
6. Build authenticated owner administration and reliable transaction reporting.
7. Add sponsorships or a compliant advertising network.
8. Consider native App Store / Google Play releases only if they provide a clear benefit; digital course payments may be subject to store billing rules.
