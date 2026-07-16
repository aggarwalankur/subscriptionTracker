# Design Document

## Overview

The Subscription Tracker is a single-page, client-side-only web application built with vanilla HTML, CSS, and JavaScript (ES modules). There is no backend, build step, or framework dependency — the app runs by opening `index.html` in a browser. All state lives in memory during a session and is persisted to `localStorage` after every mutation, then restored on load.

The app follows a simple unidirectional-data-flow pattern:

```
User action -> Controller -> Model (validate/mutate) -> Storage (persist) -> Renderer (redraw)
```

Every mutation to the subscription list flows through the same path, which is what lets "total cost" and "most expensive" always be derived fresh from current state rather than incrementally maintained (avoiding a whole class of sync bugs).

## Architecture

```
subscription-tracker/
├── index.html          # App shell: form, list container, total, styles/scripts
├── styles.css           # Visual styling, including "most expensive" highlight
└── src/
    ├── app.js            # Wires DOM events to controller; app entry point
    ├── subscriptionModel.js  # Pure functions: validation, CRUD, derived calculations
    ├── storage.js         # localStorage read/write with error handling
    └── renderer.js         # DOM rendering (list, total, empty/error states)
```

**Why this split:** `subscriptionModel.js` contains only pure functions (no DOM, no storage) so it can be unit- and property-tested in isolation with plain Node.js/browser test runners. `storage.js` isolates the one place `localStorage` is touched, so the round-trip and corrupt-data behavior are testable by mocking a small key/value store instead of a real browser API. `renderer.js` isolates all DOM writes. `app.js` is the thin glue layer that wires DOM events to model calls and re-renders — it intentionally contains as little logic as possible.

### Data Flow for a Mutation (add/edit/remove)

1. User interacts with the DOM (submits form, clicks edit/save, clicks remove/confirm).
2. `app.js` reads form/input values and calls the relevant `subscriptionModel` function.
3. If validation fails, the model returns a result object with an error; `app.js` passes the message to `renderer.js` to display inline, and no further steps occur.
4. If validation succeeds, the model returns the updated `Subscription_List`.
5. `app.js` calls `storage.save(list)`.
6. `app.js` calls `renderer.render(list)`, which redraws the list, the total, and the highlighted most-expensive entries from the same list passed in.

Because step 6 always recomputes total and "most expensive" from the current list (rather than reading cached values), Requirements 2.3, 5.3, and 6.3 (redisplay-on-change) are satisfied structurally by the architecture rather than needing separate logic paths.

## Components and Interfaces

### `subscriptionModel.js`

```js
/**
 * @typedef {Object} Subscription
 * @property {string} id            - unique identifier (crypto.randomUUID())
 * @property {string} name          - trimmed, non-empty display name
 * @property {number} monthlyCost   - positive finite number
 */

/**
 * Validates raw form input for creating/editing a subscription.
 * @param {{name: string, monthlyCost: string|number}} input
 * @returns {{valid: true} | {valid: false, field: 'name'|'monthlyCost', message: string}}
 */
export function validateSubscriptionInput(input) {}

/**
 * Creates a new Subscription and appends it to the list.
 * Assumes input has already passed validateSubscriptionInput.
 * @param {Subscription[]} list
 * @param {{name: string, monthlyCost: number}} input
 * @returns {Subscription[]} new list (list is not mutated in place)
 */
export function addSubscription(list, input) {}

/**
 * Returns a new list with the subscription matching id replaced by
 * the same id with updated name/monthlyCost. No-op (returns list
 * unchanged) if id is not found.
 * @param {Subscription[]} list
 * @param {string} id
 * @param {{name: string, monthlyCost: number}} input
 * @returns {Subscription[]}
 */
export function editSubscription(list, id, input) {}

/**
 * Returns a new list with the subscription matching id removed.
 * @param {Subscription[]} list
 * @param {string} id
 * @returns {Subscription[]}
 */
export function removeSubscription(list, id) {}

/**
 * @param {Subscription[]} list
 * @returns {number} sum of monthlyCost across list; 0 for empty list
 */
export function calculateTotalMonthlyCost(list) {}

/**
 * @param {Subscription[]} list
 * @returns {Set<string>} ids of every subscription whose monthlyCost
 *          equals the maximum monthlyCost in list; empty set if list is empty
 */
export function getMostExpensiveIds(list) {}
```

### `storage.js`

```js
const STORAGE_KEY = 'subscription-tracker:subscriptions';

/**
 * Persists the list as JSON under STORAGE_KEY.
 * @param {Subscription[]} list
 */
export function save(list) {}

/**
 * Loads and parses the list from localStorage.
 * @returns {{list: Subscription[], error: string|null}}
 *          error is set (and list is []) if the stored value is missing,
 *          not valid JSON, or not an array of well-formed Subscription objects.
 */
export function load() {}
```

`load()` never throws: any `JSON.parse` failure, or a parsed value that is not an array, or array entries missing `id`/`name`/`monthlyCost` of the right type, is treated as corrupt data and results in `{list: [], error: '...'}`.

### `renderer.js`

```js
/**
 * Renders the full UI state: subscription list (or empty-state message),
 * total monthly cost, and highlight styling on most-expensive entries.
 * @param {Subscription[]} list
 */
export function render(list) {}

/** Displays a field-level validation message near the form. */
export function renderValidationError(message) {}

/** Displays a one-time notice that saved data could not be loaded. */
export function renderStorageError(message) {}
```

### `app.js`

Holds the current in-memory `list` (initialized from `storage.load()` on startup) and wires:
- form submit → validate → `addSubscription` or `editSubscription` → `storage.save` → `renderer.render`
- remove button click (with confirmation) → `removeSubscription` → `storage.save` → `renderer.render`
- edit button click → populate form with the selected subscription's current values, tracking which id is being edited

## Data Models

```js
Subscription = {
  id: string,          // crypto.randomUUID()
  name: string,         // trimmed, length > 0
  monthlyCost: number   // finite, > 0
}
```

`Subscription_List` is simply `Subscription[]`, held in memory in `app.js` and mirrored in `localStorage` as a JSON array under the key `subscription-tracker:subscriptions`.

`Total_Monthly_Cost` and `Most_Expensive_Subscriptions` are never stored — they are always derived on demand from `Subscription_List` via `calculateTotalMonthlyCost` and `getMostExpensiveIds`.

## Error Handling

| Scenario | Handling |
|---|---|
| Empty/whitespace name on add or edit | `validateSubscriptionInput` returns `{valid:false, field:'name', ...}`; form submission is rejected, list is unchanged, inline message shown. |
| Non-positive or non-numeric monthly cost | `validateSubscriptionInput` returns `{valid:false, field:'monthlyCost', ...}`; same rejection behavior. |
| Edit/remove target id not found (e.g. stale UI state) | Model functions are no-ops (return the list unchanged) rather than throwing, so `app.js` never crashes on a stale id. |
| `localStorage` contains invalid JSON or wrong shape | `storage.load()` catches the parse error, returns an empty list plus an error string; `app.js` shows the storage error message and proceeds with an empty list. |
| `localStorage` write fails (e.g. quota exceeded, private browsing) | `storage.save()` wraps `localStorage.setItem` in try/catch; on failure it does not throw, allowing the in-memory UI to keep working for the current session even though persistence failed. |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Adding a valid subscription grows the list and includes it

For any subscription list and any input with a non-empty (post-trim) name and a monthly cost greater than zero, `addSubscription(list, input)` returns a list whose length is exactly `list.length + 1` and which contains exactly one entry with that name and monthly cost that was not present in the original list.

**Validates: Requirements 1.2**

### Property 2: Empty or whitespace-only names are always rejected

For any string composed entirely of whitespace characters (including the empty string) used as `name`, and any monthly cost, `validateSubscriptionInput` reports the input as invalid with `field: 'name'`, and neither `addSubscription` nor `editSubscription` is invoked with that input (the underlying list is left unchanged).

**Validates: Requirements 1.3, 3.3**

### Property 3: Non-positive or non-numeric monthly costs are always rejected

For any name that passes validation and any monthly cost value that is zero, negative, `NaN`, non-finite, or not coercible to a number, `validateSubscriptionInput` reports the input as invalid with `field: 'monthlyCost'`, and the underlying list is left unchanged.

**Validates: Requirements 1.4, 3.3**

### Property 4: Every subscription has a unique identifier

For any sequence of `addSubscription` calls applied to an initially empty list, the resulting list has no two entries sharing the same `id`, and every entry's `id` is a non-empty string.

**Validates: Requirements 1.5**

### Property 5: Rendered output always reflects current list

For any subscription list, `render(list)` produces output that includes the name and monthly cost of every subscription in `list`, and this holds immediately after any add, edit, or remove mutation is applied and re-rendered (i.e. the render is never stale relative to the list passed to it).

**Validates: Requirements 2.1, 2.3**

### Property 6: Editing updates only the targeted subscription

For any non-empty subscription list, any id present in that list, and any valid new name/monthly cost, `editSubscription(list, id, input)` returns a list of the same length where the entry matching `id` has the new name and monthly cost, and every other entry is unchanged (same id, name, and monthly cost as before).

**Validates: Requirements 3.2**

### Property 7: Removing a subscription deletes exactly that entry

For any non-empty subscription list and any id present in that list, `removeSubscription(list, id)` returns a list of length `list.length - 1` that does not contain an entry with that id, while every other entry from the original list (identified by id) is still present and unchanged.

**Validates: Requirements 4.2**

### Property 8: Total monthly cost equals the sum of all costs

For any subscription list, `calculateTotalMonthlyCost(list)` equals the arithmetic sum of the `monthlyCost` values of every entry in `list`, and equals zero when `list` is empty.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 9: Most-expensive set contains exactly the entries at maximum cost

For any non-empty subscription list, `getMostExpensiveIds(list)` returns exactly the set of ids whose `monthlyCost` equals the maximum `monthlyCost` value across `list` — including all of them when multiple entries tie for the maximum — and returns an empty set when `list` is empty.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 10: Save then load round-trips the subscription list

For any subscription list, calling `storage.save(list)` followed by `storage.load()` returns a list that is element-wise equivalent to the original list (same ids, names, and monthly costs, in the same order).

**Validates: Requirements 7.1, 7.2**

### Property 11: Corrupt storage never crashes and always yields an empty list with an error

For any malformed value placed under the storage key (invalid JSON, valid JSON that is not an array, or an array containing entries missing/mistyped `id`, `name`, or `monthlyCost`), `storage.load()` does not throw, returns `list: []`, and returns a non-null `error` message.

**Validates: Requirements 7.3**

## Testing Strategy

**Unit tests** cover specific examples and UI-affordance/edge-case behavior that isn't naturally a universal property:
- Subscription_Form renders with name and monthly-cost fields present (Req 1.1).
- Empty-list state renders the "no subscriptions have been added" message (Req 2.2).
- A way to select a subscription for editing exists and populates the form with its current values (Req 3.1).
- A way to remove a selected subscription exists and requires confirmation before deleting (Req 4.1).

**Property-based tests** (minimum 100 iterations each, using a library such as `fast-check` for JavaScript) cover Properties 1–11 above, exercising `subscriptionModel.js` and `storage.js` with randomly generated subscription lists, names (including whitespace/unicode edge cases), and monthly cost values (including zero, negative, `NaN`, and large numbers).

Each property test is tagged: **Feature: subscription-tracker, Property {number}: {property title}**, and references the design document property it validates in its test description or comment.

`storage.js` tests use an in-memory mock for `localStorage` (or run in a test environment that provides one) so that round-trip and corruption tests are deterministic and fast.
