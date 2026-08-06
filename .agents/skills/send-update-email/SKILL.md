---
name: send-update-email
description: Send ad-hoc update or recap emails to specific addresses using the project's Gmail credentials. Use when the user asks to email an update, recap, announcement, or notification to one or more recipients outside of the normal weekly digest flow.
---

# Send Update Email

## Credentials

The project sends email via Gmail using these env vars (already set as Replit Secrets):
- `GMAIL_USER` = `aiimplementationclubaustin@gmail.com` (the sending account)
- `GMAIL_APP_PASSWORD` = app password for that account

The sender display name should be `"Raj @ Event Carpooling"`.

## How to Send

Use `nodemailer` from the `artifacts/api-server` package (already installed). Run via `node --input-type=module` from inside `artifacts/api-server/` so the package is resolved:

```bash
cd artifacts/api-server && node --input-type=module << 'EOF'
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

await transporter.sendMail({
  from: `"Raj @ Event Carpooling" <${process.env.GMAIL_USER}>`,
  to: "recipient@example.com",        // or array for multiple
  subject: "Your subject here",
  html: `<p>Your HTML body here</p>`,
  text: `Plain text fallback`,
});
console.log("Sent!");
EOF
```

## Sending to Multiple Recipients Individually

Loop over the list — do **not** put all addresses in the `to` field (that exposes recipients to each other):

```js
const recipients = ["a@example.com", "b@example.com"];
for (const to of recipients) {
  await transporter.sendMail({ from, to, subject, html, text });
  console.log(`✓ ${to}`);
}
```

## Email Format Conventions

- Font: Georgia, serif — matches brand tone
- Max-width: 600px, centered
- Text color: #1a1a1a on white background
- Line-height: 1.7
- Use `<strong>` + emoji for section headers (e.g. `<strong>🎟️ Feature name:</strong>`)
- Sign off: `— Raj`

## Common Pitfall

Do NOT use `raj@eventcarpooling.com` as the SMTP user — the app password is tied to `GMAIL_USER` (the aiimplementationclubaustin account). Using the wrong user causes a `535 BadCredentials` error.
