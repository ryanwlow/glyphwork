// Anonymous play counts through GoatCounter (no cookies, no personal data).
// Events: start/<level>, solve/<level>/par|over-par, input/api|console|click.
// Everything here is a no-op when the counter script is blocked or offline.

const pending = [];
const once = new Set();
let retries = 0;

function flush() {
  const gc = window.goatcounter;
  if (!gc?.count) {
    if (pending.length && retries++ < 20) setTimeout(flush, 1000);
    return;
  }
  while (pending.length) gc.count(pending.shift());
}

export function track(path, { oncePerVisit = true } = {}) {
  if (oncePerVisit) {
    if (once.has(path)) return;
    once.add(path);
  }
  pending.push({ path, title: path, event: true });
  flush();
}
