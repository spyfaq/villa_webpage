/**
 * Enquiry form handler for Olga's Luxury Villa.
 *
 * Replaces Formspree. The form posts here, this Worker validates the
 * submission and sends it to the owner's inbox using Cloudflare's send_email
 * binding, which delivers to a verified destination address free of charge and
 * with no third-party email service in the path.
 *
 * Nothing is stored. A submission exists only for the life of the request and
 * then in the owner's mailbox, which keeps the privacy position simple: there
 * is no processor holding a database of enquiries.
 *
 * The validation lives in ./validate.js so it can be unit-tested under plain
 * Node without the Cloudflare runtime. See test/validate.test.mjs.
 */
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import { validate, buildBody } from "./validate.js";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN;
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405, headers);
    }

    // Only accept posts that claim to come from the site. This does not stop a
    // determined bot posting directly — nothing short of a captcha does — but it
    // stops the endpoint being embedded on someone else's page.
    const sender = request.headers.get("Origin");
    if (sender && sender !== origin) {
      return json({ ok: false, error: "Forbidden" }, 403, headers);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ ok: false, error: "Could not read the submission" }, 400, headers);
    }

    const { errors, data, silentDrop } = validate(form);
    if (silentDrop) return json({ ok: true }, 200, headers);
    if (errors.length) return json({ ok: false, errors }, 422, headers);

    const message = createMimeMessage();
    message.setSender({ name: "Villa enquiry form", addr: env.FROM_ADDRESS });
    message.setRecipient(env.TO_ADDRESS);
    // So the owner can simply hit reply and reach the guest.
    message.setHeader("Reply-To", `${data.name} <${data.email}>`);
    message.setSubject(
      `Enquiry: ${data.checkIn} to ${data.checkOut}, ${data.guests} guests - ${data.name}`
    );
    message.addMessage({
      contentType: "text/plain",
      data: buildBody(data, request.cf?.country ?? "unknown"),
    });

    try {
      await env.ENQUIRY_MAILER.send(
        new EmailMessage(env.FROM_ADDRESS, env.TO_ADDRESS, message.asRaw())
      );
    } catch (err) {
      console.error("enquiry send failed", err);
      return json(
        { ok: false, error: "The enquiry could not be sent. Please try WhatsApp or email." },
        502,
        headers
      );
    }

    return json({ ok: true }, 200, headers);
  },
};
