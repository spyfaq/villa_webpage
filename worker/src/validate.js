/**
 * Validation for the enquiry form, kept free of Cloudflare imports so it can be
 * unit-tested with plain Node.
 */
export const MAX_FIELD = 2000;
export const MAX_GUESTS = 6;
export const MIN_NIGHTS = 4;

/** Strip control characters so nothing can inject extra MIME headers. */
export function clean(value) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_FIELD);
}

export function isEmail(value) {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value) && value.length <= 254;
}

export function isYmd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function nightsBetween(checkIn, checkOut) {
  const a = new Date(`${checkIn}T00:00:00Z`);
  const b = new Date(`${checkOut}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/**
 * @param {{get(name: string): unknown}} form  FormData, or anything with .get()
 * @returns {{errors: string[], data: object, silentDrop?: boolean}}
 */
export function validate(form) {
  const data = {
    name: clean(form.get("name")),
    email: clean(form.get("email")),
    phone: clean(form.get("phone")),
    checkIn: clean(form.get("check_in")),
    checkOut: clean(form.get("check_out")),
    guests: clean(form.get("guests")),
    details: clean(form.get("trip_details")),
  };

  // Honeypot: a real visitor never sees this field, so anything in it is a bot.
  // The caller answers 200 so the bot believes it succeeded and does not retry.
  if (clean(form.get("_gotcha"))) return { errors: [], data, silentDrop: true };

  const errors = [];
  if (!data.name) errors.push("name is required");
  if (!isEmail(data.email)) errors.push("a valid email address is required");

  if (!isYmd(data.checkIn) || !isYmd(data.checkOut)) {
    errors.push("check-in and check-out must be valid dates");
  } else {
    const nights = nightsBetween(data.checkIn, data.checkOut);
    if (nights <= 0) errors.push("check-out must be after check-in");
    else if (nights < MIN_NIGHTS) errors.push(`the minimum stay is ${MIN_NIGHTS} nights`);
  }

  const guests = Number(data.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) {
    errors.push(`guests must be between 1 and ${MAX_GUESTS}`);
  }

  return { errors, data };
}

export function buildBody(data, country = "unknown", now = new Date()) {
  const nights = nightsBetween(data.checkIn, data.checkOut);
  return [
    "New enquiry from olgasluxuryvilla-corfu.com",
    "",
    `Name:       ${data.name}`,
    `Email:      ${data.email}`,
    `Phone:      ${data.phone || "-"}`,
    "",
    `Check-in:   ${data.checkIn}`,
    `Check-out:  ${data.checkOut}`,
    `Nights:     ${nights}`,
    `Guests:     ${data.guests}`,
    "",
    "Trip details:",
    data.details || "-",
    "",
    "---",
    `Submitted:  ${now.toISOString()}`,
    `Country:    ${country}`,
    "",
    "Reply directly to this email to answer the guest.",
  ].join("\n");
}
