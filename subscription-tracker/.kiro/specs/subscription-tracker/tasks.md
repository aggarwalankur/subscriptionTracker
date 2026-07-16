# Implementation Plan: Subscription Tracker

## Overview

Implementation proceeds bottom-up: static shell first, then the pure `subscriptionModel.js` functions (validation, CRUD, derived calculations), then `storage.js`, then `renderer.js`, and finally `app.js` to wire DOM events to the model/storage/renderer layers. This mirrors the design's unidirectional data flow (`User action -> Controller -> Model -> Storage -> Renderer`) and lets each layer be unit- and property-tested in isolation before the next layer depends on it. All code is vanilla JavaScript (ES modules), HTML, and CSS, matching the finalized design.

## Tasks

- [x] 1. Set up project structure and static application shell
  - [x] 1.1 Create directory structure and `index.html` app shell
    - Create `src/` directory alongside `index.html` and `styles.css`
    - Build `index.html` with the Subscription_Form (name input, monthly-cost input, submit button), a list container for rendered subscriptions, and an element for displaying the Total_Monthly_Cost
    - Wire `<script type="module" src="src/app.js">` and the `styles.css` link
    - _Requirements: 1.1, 2.1_

  - [x] 1.2 Create `styles.css` with base layout and highlight styling
    - Add base layout/typography styles for the form, list, and total display
    - Add a distinct CSS class (e.g. `.most-expensive`) to be applied to Most_Expensive_Subscriptions entries
    - _Requirements: 6.1_

- [x] 2. Implement subscription validation and CRUD in `subscriptionModel.js`
  - [x] 2.1 Implement `validateSubscriptionInput`
    - Reject empty/whitespace-only names with `field: 'name'`
    - Reject non-positive, non-numeric, `NaN`, or non-finite monthly costs with `field: 'monthlyCost'`
    - Return `{valid: true}` for well-formed input
    - _Requirements: 1.3, 1.4, 3.3_

  - [ ]* 2.2 Write property tests for input validation
    - **Property 2: Empty or whitespace-only names are always rejected**
    - **Property 3: Non-positive or non-numeric monthly costs are always rejected**
    - **Validates: Requirements 1.3, 1.4, 3.3**

  - [x] 2.3 Implement `addSubscription`
    - Append a new Subscription (with `crypto.randomUUID()` id) to a new copy of the list; do not mutate the input list
    - _Requirements: 1.2, 1.5_

  - [ ]* 2.4 Write property tests for `addSubscription`
    - **Property 1: Adding a valid subscription grows the list and includes it**
    - **Property 4: Every subscription has a unique identifier**
    - **Validates: Requirements 1.2, 1.5**

  - [x] 2.5 Implement `editSubscription`
    - Return a new list with the matching-id entry replaced by updated name/monthlyCost; no-op (return list unchanged) if id not found
    - _Requirements: 3.2_

  - [ ]* 2.6 Write property test for `editSubscription`
    - **Property 6: Editing updates only the targeted subscription**
    - **Validates: Requirements 3.2**

  - [x] 2.7 Implement `removeSubscription`
    - Return a new list with the matching-id entry removed; no-op if id not found
    - _Requirements: 4.2_

  - [ ]* 2.8 Write property test for `removeSubscription`
    - **Property 7: Removing a subscription deletes exactly that entry**
    - **Validates: Requirements 4.2**

- [x] 3. Implement derived calculations in `subscriptionModel.js`
  - [x] 3.1 Implement `calculateTotalMonthlyCost`
    - Sum `monthlyCost` across the list; return 0 for an empty list
    - _Requirements: 5.1, 5.4_

  - [ ]* 3.2 Write property test for `calculateTotalMonthlyCost`
    - **Property 8: Total monthly cost equals the sum of all costs**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [x] 3.3 Implement `getMostExpensiveIds`
    - Return the set of ids whose `monthlyCost` equals the maximum in the list; return an empty set for an empty list; include all ids on a tie
    - _Requirements: 6.1, 6.2_

  - [ ]* 3.4 Write property test for `getMostExpensiveIds`
    - **Property 9: Most-expensive set contains exactly the entries at maximum cost**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 4. Checkpoint - Ensure all `subscriptionModel.js` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `storage.js` persistence layer
  - [x] 5.1 Implement `save(list)`
    - Serialize the list to JSON and write it under `STORAGE_KEY` in `localStorage`
    - Wrap `localStorage.setItem` in try/catch so write failures (quota exceeded, private browsing) do not throw
    - _Requirements: 7.1_

  - [x] 5.2 Implement `load()`
    - Read and `JSON.parse` the stored value; return `{list, error: null}` on success
    - Treat missing data, invalid JSON, a non-array value, or array entries missing/mistyped `id`/`name`/`monthlyCost` as corrupt: return `{list: [], error: '...'}` without throwing
    - _Requirements: 7.2, 7.3_

  - [ ]* 5.3 Write property test for save/load round-trip
    - **Property 10: Save then load round-trips the subscription list**
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 5.4 Write property test for corrupt storage handling
    - **Property 11: Corrupt storage never crashes and always yields an empty list with an error**
    - **Validates: Requirements 7.3**

- [x] 6. Implement `renderer.js` DOM rendering
  - [x] 6.1 Implement `render(list)` for the subscription list, total, and empty-state message
    - Render each subscription's name and Monthly_Cost
    - Render the Total_Monthly_Cost (via `calculateTotalMonthlyCost`)
    - Display the "no subscriptions have been added" message when the list is empty, and display Total_Monthly_Cost as zero in that case
    - _Requirements: 2.1, 2.2, 5.2, 5.4_

  - [x] 6.2 Implement most-expensive highlight rendering in `render(list)`
    - Use `getMostExpensiveIds` to apply the `.most-expensive` class to every matching entry, including ties
    - _Requirements: 6.1, 6.2_

  - [x] 6.3 Implement `renderValidationError` and `renderStorageError`
    - `renderValidationError(message)` displays a field-level message near the Subscription_Form
    - `renderStorageError(message)` displays a one-time notice that saved data could not be loaded
    - _Requirements: 1.3, 1.4, 3.3, 7.3_

  - [ ]* 6.4 Write unit test for empty-list message display
    - Verify `render([])` shows the "no subscriptions have been added" message and a zero total
    - _Requirements: 2.2_

  - [ ]* 6.5 Write property test for render reflecting current list
    - **Property 5: Rendered output always reflects current list**
    - **Validates: Requirements 2.1, 2.3**

- [x] 7. Checkpoint - Ensure all `storage.js` and `renderer.js` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire application logic in `app.js`
  - [x] 8.1 Implement app initialization
    - On load, call `storage.load()`; if `error` is present, call `renderer.renderStorageError(error)` and continue with an empty in-memory list
    - Call `renderer.render(list)` with the initial (restored or empty) list
    - _Requirements: 7.2, 7.3_

  - [x] 8.2 Wire Subscription_Form submit handler for add and edit flows
    - On submit, call `validateSubscriptionInput`; on failure call `renderer.renderValidationError` and stop (list unchanged)
    - On success, call `addSubscription` (or `editSubscription` if an id is currently being edited), then `storage.save(list)`, then `renderer.render(list)`
    - _Requirements: 1.2, 1.3, 1.4, 2.3, 3.2, 3.3, 5.3, 6.3, 7.1_

  - [x] 8.3 Wire edit-selection affordance
    - On selecting a subscription to edit, populate the Subscription_Form with its current name/monthlyCost and track which id is being edited
    - _Requirements: 3.1_

  - [x] 8.4 Wire remove affordance with confirmation
    - Provide a way to select a subscription for removal; on confirmation, call `removeSubscription`, then `storage.save(list)`, then `renderer.render(list)`
    - _Requirements: 4.1, 4.2_

  - [ ]* 8.5 Write unit test verifying the Subscription_Form renders required fields
    - Verify the form exposes a name input and a monthly-cost input
    - _Requirements: 1.1_

  - [ ]* 8.6 Write unit test verifying edit selection populates the form
    - Verify selecting a subscription for editing fills the form with its current name/monthlyCost
    - _Requirements: 3.1_

  - [ ]* 8.7 Write unit test verifying remove requires confirmation
    - Verify removal is not applied until confirmation is given, and that the list/total update once confirmed
    - _Requirements: 4.1, 4.2_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP; they are all test-writing tasks and are not implemented by the coding agent.
- Property-based tests use `fast-check` with a minimum of 100 iterations, tagged `Feature: subscription-tracker, Property {number}: {property title}` per the design's Testing Strategy.
- Each property test task references the exact property number and title from `design.md`'s Correctness Properties section.
- `storage.js` tests should use an in-memory mock for `localStorage` for deterministic, fast round-trip and corruption tests.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "5.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "5.2", "6.1"] },
    { "id": 2, "tasks": ["2.4", "2.5", "5.3", "6.2", "6.4"] },
    { "id": 3, "tasks": ["2.6", "2.7", "5.4", "6.3", "6.5"] },
    { "id": 4, "tasks": ["2.8", "3.1", "8.1"] },
    { "id": 5, "tasks": ["3.2", "3.3", "8.2"] },
    { "id": 6, "tasks": ["3.4", "8.3", "8.5"] },
    { "id": 7, "tasks": ["8.4", "8.6"] },
    { "id": 8, "tasks": ["8.7"] }
  ]
}
```
