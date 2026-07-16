/**
 * Controller layer for the Subscription Tracker.
 * Wires DOM events to the model, storage, and renderer layers.
 * Intentionally contains as little logic as possible.
 */

import * as storage from './storage.js';
import * as renderer from './renderer.js';
import {
  validateSubscriptionInput,
  addSubscription,
  editSubscription,
  removeSubscription,
} from './subscriptionModel.js';

/**
 * @typedef {import('./subscriptionModel.js').Subscription} Subscription
 */

/**
 * In-memory Subscription_List for the current session.
 * Initialized on module load from `storage.load()` and mutated in place
 * by later wiring (form submit, edit-selection, remove) added in
 * subsequent tasks.
 * @type {Subscription[]}
 */
let currentList = [];

/**
 * Restores the Subscription_List from storage (if present), surfaces a
 * storage error notice when saved data could not be loaded, and renders
 * the initial UI state.
 *
 * Extension point for later tasks: additional event wiring (form submit,
 * edit-selection, remove) should be added in their own functions and
 * invoked from `init()`.
 */
export function init() {
  const { list, error } = storage.load();

  currentList = list;

  if (error) {
    renderer.renderStorageError(error);
  }

  renderer.render(currentList);

  wireSubscriptionFormSubmit();
  wireEditSelection();
}

/**
 * Resets the Subscription_Form back to "add" mode: clears the name/cost
 * fields, clears the hidden edit-id field, and restores the submit
 * button label. Safe to call even if any of these elements are missing.
 */
function resetSubscriptionForm() {
  const form = document.getElementById('subscription-form');
  const idField = document.getElementById('subscription-id');
  const submitButton = document.getElementById('submit-button');
  const cancelButton = document.getElementById('cancel-edit-button');

  if (form) {
    form.reset();
  }

  if (idField) {
    idField.value = '';
  }

  if (submitButton) {
    submitButton.textContent = 'Add Subscription';
  }

  if (cancelButton) {
    cancelButton.hidden = true;
  }
}

/**
 * Wires the Subscription_Form submit handler for both the add and edit
 * flows. On validation failure, shows an inline field error and leaves
 * `currentList` unchanged. On success, applies the add/edit mutation,
 * persists the result, re-renders, and resets the form to "add" mode.
 */
function wireSubscriptionFormSubmit() {
  const form = document.getElementById('subscription-form');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nameField = document.getElementById('subscription-name');
    const costField = document.getElementById('subscription-cost');
    const idField = document.getElementById('subscription-id');

    const input = {
      name: nameField ? nameField.value : '',
      monthlyCost: costField ? costField.value : '',
    };
    const editingId = idField ? idField.value : '';

    const result = validateSubscriptionInput(input);

    if (!result.valid) {
      renderer.renderValidationError(result.field, result.message);
      return;
    }

    renderer.clearValidationErrors();

    currentList = editingId
      ? editSubscription(currentList, editingId, input)
      : addSubscription(currentList, input);

    storage.save(currentList);
    renderer.render(currentList);
    resetSubscriptionForm();
  });
}

/**
 * Populates the Subscription_Form with the given subscription's current
 * name/monthlyCost, tracks its id as the one being edited, and switches
 * the form into "edit" mode (submit button label + visible cancel button).
 * Safe to call even if any of these elements are missing.
 * @param {Subscription} subscription
 */
function enterEditMode(subscription) {
  const nameField = document.getElementById('subscription-name');
  const costField = document.getElementById('subscription-cost');
  const idField = document.getElementById('subscription-id');
  const submitButton = document.getElementById('submit-button');
  const cancelButton = document.getElementById('cancel-edit-button');

  if (nameField) {
    nameField.value = subscription.name;
  }

  if (costField) {
    costField.value = subscription.monthlyCost;
  }

  if (idField) {
    idField.value = subscription.id;
  }

  if (submitButton) {
    submitButton.textContent = 'Save Changes';
  }

  if (cancelButton) {
    cancelButton.hidden = false;
  }
}

/**
 * Removes the subscription with the given id after user confirmation:
 * calls `removeSubscription`, persists the result, and re-renders.
 * If the removed subscription is the one currently being edited, the
 * Subscription_Form is reset back to "add" mode so it doesn't reference
 * a deleted id. Does nothing if the user cancels the confirmation.
 * @param {string} id
 */
function removeSubscriptionWithConfirmation(id) {
  const confirmed = confirm('Remove this subscription?');

  if (!confirmed) {
    return;
  }

  currentList = removeSubscription(currentList, id);

  storage.save(currentList);
  renderer.render(currentList);

  const idField = document.getElementById('subscription-id');
  if (idField && idField.value === id) {
    resetSubscriptionForm();
  }
}

/**
 * Wires the edit-selection and remove affordances. Both use a single
 * event-delegation click listener on `#subscription-list` since list
 * items are replaced wholesale on every render:
 * - Clicking an Edit button populates the Subscription_Form with that
 *   subscription's current values and enters edit mode.
 * - Clicking a Remove button prompts for confirmation and, if confirmed,
 *   removes that subscription from the list.
 * Clicking the cancel button exits edit mode without saving.
 *
 * _Requirements: 3.1, 4.1, 4.2_
 */
function wireEditSelection() {
  const listEl = document.getElementById('subscription-list');
  const cancelButton = document.getElementById('cancel-edit-button');

  if (listEl) {
    listEl.addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-action="edit"]');

      if (editButton) {
        const id = editButton.dataset.id;
        const subscription = currentList.find((item) => item.id === id);

        if (!subscription) {
          return;
        }

        renderer.clearValidationErrors();
        enterEditMode(subscription);
        return;
      }

      const removeButton = event.target.closest('[data-action="remove"]');

      if (removeButton) {
        removeSubscriptionWithConfirmation(removeButton.dataset.id);
      }
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      resetSubscriptionForm();
    });
  }
}

init();
