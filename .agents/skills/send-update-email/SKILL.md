---
name: send-update-email
description: Send ad-hoc update or recap emails to specific addresses through the project's server-side email service. Use when the user asks to email an update, recap, announcement, or notification to one or more recipients outside of the normal weekly digest flow.
---

# Send Update Email

## Sending Safely

Use the server-side `sendEmail` helper in `artifacts/api-server/src/lib/emailService.ts` from an already-authorized backend execution path:

```ts
const result = await sendEmail({
  to: recipient,
  subject,
  html,
  text,
  fromName, // optional; otherwise the configured project default is used
});
if (!result.success) throw new Error(result.error || "Email send failed");
```

`sendEmail` prefers Resend when configured and falls back to Gmail SMTP; it owns provider selection and sender configuration. Do not bypass it with a raw Nodemailer script or hardcode a sender address/name. Never inspect, print, copy into chat, or log environment credential values.

There is no generic public ad-hoc email endpoint. Do not add an unauthenticated endpoint or repurpose the weekly digest sender for a one-off email. If there is no approved way to invoke `sendEmail` in a trusted server-side context, ask the project owner for the approved send path instead of extracting credentials or improvising a route.

Before sending, confirm the recipient(s), subject, and final body with the user when any of these are unspecified. A request to draft or prepare email is not authorization to send. After sending, report provider acceptance only after `sendEmail` returns `{ success: true }`; this does not guarantee inbox delivery. Surface failures rather than claiming success.

## Multiple Recipients

Send separately to each recipient unless the user explicitly requests a shared group message. This avoids exposing addresses and allows reporting per-recipient failures:

```js
const recipients = ["a@example.com", "b@example.com"];
for (const to of recipients) {
  const result = await sendEmail({ to, subject, html, text });
  if (!result.success) throw new Error(`Email send failed: ${result.error || "unknown error"}`);
}
```

Keep recipient addresses out of unnecessary logs and generated artifacts.

## Attachments

The server-side helper accepts attachment bytes; use this existing support instead of adding a separate sending route or exposing storage credentials:

```ts
const result = await sendEmail({
  to: recipient,
  subject,
  html,
  text,
  attachments: [{
    filename: "project-summary.pdf",
    content: verifiedPdfBytes, // Buffer obtained through the approved server-side path
    contentType: "application/pdf",
  }],
});
if (!result.success) throw new Error(result.error || "Email send failed");
```

Confirm the requested recipient and attachment, and validate the actual file bytes and format before sending. A filename or successful HTML download is not proof of a valid PDF. Gmail receives the attachment Buffer; the helper encodes it to base64 for Resend. Never add recipients while attaching a file, send an unrequested artifact, or log attachment contents. For code changes, the focused regression suite is `src/lib/emailService.attachments.test.ts`; documentation edits do not require sending a test email.

## Email Format Conventions

- Font: Georgia, serif — matches brand tone
- Max-width: 600px, centered
- Text color: #1a1a1a on white background
- Line-height: 1.7
- Use `<strong>` + emoji for section headers (e.g. `<strong>🎟️ Feature name:</strong>`)
- Sign off and sender display name should match the requested project/tenant; do not assume a single fixed brand name.
- Digest newsletters are a separate workflow: use the digest admin UI/API and its explicit test-vs-subscriber-send safeguards, not this ad-hoc template process.
- Newsletter editions use `sendNewsletterEmail`, which appends `— No Reply` to the display name and routes replies to the configured human contact while retaining the authenticated sending mailbox. Do not copy that newsletter-only policy into ad-hoc or carpool messages; preserve their requested sender and reply behavior.
