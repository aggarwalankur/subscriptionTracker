/**
 * Persistence layer for the Subscription Tracker.
 * Isolates all reads/writes to `localStorage` so the rest of the app
 * never touches the browser storage API directly.
 */

/**
 * @typedef {Object} Subscription
 * @property {string} id            - unique identifier
 * @property {string} name          - trimmed, non-empty display name
 * @property {number} monthlyCost   - positive finite number
 */

export const STORAGE_KEY = 'subscription-tracker:subscriptions';

/**
 * Persists the list as JSON under STORAGE_KEY.
 * Write failures (quota exceeded, private browsing, etc.) are swallowed
 * so a failed save never throws or crashes the app.
 * @param {Subscription[]} list
 */
export function save(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Intentionally ignored: persistence is best-effort. The in-memory
    // UI should keep working for the current session even if the write
    // failed (e.g. quota exceeded or private browsing mode).
  }
}

/**
 * Checks whether a parsed value looks like a well-formed Subscription
 * (has an `id` and `name` that are non-empty strings, and a `monthlyCost`
 * that is a finite number).
 * @param {*} entry
 * @returns {boolean}
 */
function isValidSubscriptionEntry(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    typeof entry.name === 'string' &&
    entry.name.length > 0 &&
    typeof entry.monthlyCost === 'number' &&
    Number.isFinite(entry.monthlyCost)
  );
}

/**
 * Loads and parses the subscription list from localStorage.
 * Never throws: missing data, invalid JSON, a non-array value, or an
 * array containing entries missing/mistyped `id`/`name`/`monthlyCost`
 * are all treated as corrupt data.
 * @returns {{list: Subscription[], error: string|null}}
 */
export function load() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { list: [], error: 'Saved data could not be loaded.' };
  }

  if (raw === null) {
    return { list: [], error: null };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { list: [], error: 'Saved data could not be loaded.' };
  }

  if (!Array.isArray(parsed) || !parsed.every(isValidSubscriptionEntry)) {
    return { list: [], error: 'Saved data could not be loaded.' };
  }

  return { list: parsed, error: null };
}
