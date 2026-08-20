# Enquiry form + `info@` mailbox setup

This replaces Formspree with a Cloudflare Worker you own, and gives
`info@olgasluxuryvilla-corfu.com` a working inbox. Both are free.

The domain stays registered at Namecheap. Only the **nameservers** move to
Cloudflare, because Cloudflare Email Routing and Workers both require Cloudflare
to be answering DNS for the domain.

## Why not Namecheap's own email

Namecheap Private Email works and would give you the address, but it is hosted
in Phoenix, Arizona. It fixes how the address *looks* without changing the fact
that a US company processes the mail. Cloudflare Email Routing forwards to an
inbox of your choosing, so you can point it at an EU mailbox now or later
without touching the website again.

---

## Before you start

**The risk in this whole procedure is DNS.** Moving nameservers means every
record has to exist on the new side or the website goes dark. Write down what
you have at Namecheap first, and do not remove anything there until the site is
confirmed working on Cloudflare.

The records the live site needs are listed in step 3. There are seven.

---

## 1. Add the domain to Cloudflare

1. Create a free account at <https://dash.cloudflare.com>.
2. **Add a domain** → `olgasluxuryvilla-corfu.com` → choose the **Free** plan.
3. Cloudflare scans your existing DNS. Check what it imported against step 3
   before continuing — the scan usually finds the A records but sometimes
   misses `www`.

## 2. Point Namecheap at Cloudflare

In Namecheap: **Domain List → Manage → Nameservers → Custom DNS**, then enter
the two nameservers Cloudflare gave you (they look like
`ana.ns.cloudflare.com`). Save.

Propagation is usually minutes, occasionally a few hours.

## 3. Confirm the website records exist in Cloudflare

These four A records point the apex at GitHub Pages. All four are needed;
GitHub uses them for redundancy.

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `185.199.108.153` | **DNS only** |
| A | `@` | `185.199.109.153` | **DNS only** |
| A | `@` | `185.199.110.153` | **DNS only** |
| A | `@` | `185.199.111.153` | **DNS only** |
| CNAME | `www` | `spyfaq.github.io` | **DNS only** |

Set the proxy toggle to **DNS only** (grey cloud, not orange) on every one.
GitHub Pages issues its own TLS certificate, and proxying the apex through
Cloudflare can interfere with that renewal. There is no benefit to proxying
here — GitHub already serves the site through a CDN.

Optionally add the IPv6 records too, same **DNS only** setting:

```
AAAA  @  2606:50c0:8000::153
AAAA  @  2606:50c0:8001::153
AAAA  @  2606:50c0:8002::153
AAAA  @  2606:50c0:8003::153
```

**Check the site loads over HTTPS before going further.** If it does not, stop
and fix DNS first — nothing below matters if the site is down.

## 4. Turn on Email Routing

Cloudflare dashboard → **Email** → **Email Routing** → **Get started**.

1. It offers to add the required MX and TXT records automatically. Accept.
2. Add a **destination address**: the inbox where you actually want to read
   mail. Cloudflare emails it a verification link that must be clicked. This can
   be your existing Gmail for now, or an EU mailbox later — changing it later is
   two clicks and needs no website change.
3. Create the routing rule: `info@olgasluxuryvilla-corfu.com` → your verified
   destination.

Send yourself a test message to `info@olgasluxuryvilla-corfu.com` and confirm it
arrives before continuing.

> **Sending as `info@`:** routing forwards mail *to* you. To reply *as*
> `info@…` from Gmail, add it under Gmail → Settings → Accounts → *Send mail as*.
> Gmail will ask for an SMTP server, which Email Routing does not provide, so
> this step needs a real mailbox — one more reason to move to an EU mailbox
> eventually. Until then, replies go out from your existing address.

## 5. Deploy the Worker

From this directory:

```sh
npm install
npx wrangler login
```

Edit `wrangler.toml` and replace **both** `REPLACE_ME_owner_inbox@example.com`
values with the destination address you verified in step 4. They must match the
verified address exactly or the send binding refuses to deliver.

```sh
npm test          # 14 validation tests, should all pass
npx wrangler deploy
```

Wrangler prints the deployed URL. To serve it from your own domain instead of
`*.workers.dev`, uncomment the `[[routes]]` block in `wrangler.toml` and deploy
again — that creates `forms.olgasluxuryvilla-corfu.com` automatically. That
subdomain *is* proxied by Cloudflare, which is correct and does not affect the
apex.

## 6. Point the website at it

In `index.html`, change the form's action:

```html
<form class="booking-form" id="bookingForm"
      action="https://forms.olgasluxuryvilla-corfu.com" method="POST">
```

No JavaScript changes are needed. The existing handler posts `FormData` and
checks `response.ok`, which is exactly what the Worker answers.

## 7. Test it properly

Submit a real enquiry from the live site and confirm the email arrives. Then
check the failure path: submit with a two-night stay and confirm you get an
error rather than a silent success.

**Do not skip this.** A quietly broken enquiry form loses bookings without ever
telling you.

---

## What the Worker does

- Validates name, email, dates, the 4-night minimum and a guest count of 1–6.
- Strips control characters from every field, so nothing can forge extra MIME
  headers through the form.
- Drops honeypot submissions silently with a `200`, so bots do not retry.
- Rejects posts whose `Origin` is not the website.
- Sets `Reply-To` to the guest, so replying from your inbox reaches them.
- Stores nothing.

## A note on secrets

`wrangler.toml` is committed to the repository and, because the site is served
from it, will also be readable at `/worker/wrangler.toml`. That is fine for what
is in it — the addresses there are already published on the website — but do not
put anything genuinely secret in `[vars]`. If you later add an API key for
anything, use `npx wrangler secret put NAME` instead, which stores it in
Cloudflare and never touches the repository.

## Costs

Free. Email Routing has no per-user fee, sends to verified destination
addresses are free and do not count against any quota, and Workers' free tier is
100,000 requests a day — several orders of magnitude more than this form needs.

## If you ever want to move off Cloudflare

Nothing here is one-way. The site stays on GitHub Pages throughout, and the only
site-side change is one `action` attribute. Moving nameservers back to Namecheap
restores the previous arrangement, provided the seven records in step 3 are
recreated there.
