/**
 * DOM rendering layer for the Subscription Tracker.
 * Isolates all direct DOM writes so the rest of the app never touches
 * the document outside of this module.
 */

import { calculateTotalMonthlyCost, getMostExpensiveIds } from './subscriptionModel.js';

/**
 * @typedef {import('./subscriptionModel.js').Subscription} Subscription
 */

/**
 * Formats a numeric amount as a currency string, e.g. 9.5 -> "$9.50".
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `$${safeAmount.toFixed(2)}`;
}

/**
 * Builds the `<li>` element for a single subscription entry.
 * @param {Subscription} subscription
 * @param {boolean} isMostExpensive - whether to apply the `.most-expensive` highlight class
 * @returns {HTMLLIElement}
 */
function createSubscriptionItem(subscription, isMostExpensive) {
  const item = document.createElement('li');
  item.className = isMostExpensive ? 'subscription-item most-expensive' : 'subscription-item';
  item.dataset.id = subscription.id;

  const nameEl = document.createElement('span');
  nameEl.className = 'subscription-name';
  nameEl.textContent = subscription.name;

  const costEl = document.createElement('span');
  costEl.className = 'subscription-cost';
  costEl.textContent = formatCurrency(subscription.monthlyCost);

  const actionsEl = document.createElement('div');
  actionsEl.className = 'subscription-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'btn-edit';
  editButton.dataset.action = 'edit';
  editButton.dataset.id = subscription.id;
  editButton.textContent = 'Edit';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'btn-danger';
  removeButton.dataset.action = 'remove';
  removeButton.dataset.id = subscription.id;
  removeButton.textContent = 'Remove';

  actionsEl.appendChild(editButton);
  actionsEl.appendChild(removeButton);

  item.appendChild(nameEl);
  item.appendChild(costEl);
  item.appendChild(actionsEl);

  return item;
}

/**
 * Renders the subscription list, the empty-state message, the
 * Total_Monthly_Cost, and most-expensive highlighting from the given list.
 *
 * Does not implement validation/storage error rendering (see task 6.3).
 *
 * @param {Subscription[]} list
 */
export function render(list) {
  const listEl = document.getElementById('subscription-list');
  const emptyMessageEl = document.getElementById('empty-message');
  const totalEl = document.getElementById('total-monthly-cost');

  const subscriptions = Array.isArray(list) ? list : [];
  const mostExpensiveIds = getMostExpensiveIds(subscriptions);

  if (listEl) {
    listEl.innerHTML = '';

    subscriptions.forEach((subscription) => {
      listEl.appendChild(
        createSubscriptionItem(subscription, mostExpensiveIds.has(subscription.id))
      );
    });
  }

  if (emptyMessageEl) {
    emptyMessageEl.hidden = subscriptions.length > 0;
  }

  if (totalEl) {
    totalEl.textContent = formatCurrency(calculateTotalMonthlyCost(subscriptions));
  }
}

/**
 * Maps a validation `field` (as returned by `validateSubscriptionInput`)
 * to the id of its field-level error element near the Subscription_Form.
 */
const FIELD_ERROR_ELEMENT_IDS = {
  name: 'name-error',
  monthlyCost: 'cost-error',
};

/**
 * Displays a field-level validation message near the Subscription_Form.
 * Clears any error message on the other field so only the current
 * validation failure is shown at a time.
 *
 * @param {'name'|'monthlyCost'} field - which form field the message applies to
 * @param {string} message - the validation message to display
 */
export function renderValidationError(field, message) {
  Object.entries(FIELD_ERROR_ELEMENT_IDS).forEach(([fieldName, elementId]) => {
    const errorEl = document.getElementById(elementId);
    if (!errorEl) {
      return;
    }

    if (fieldName === field) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    } else {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  });
}

/**
 * Clears any currently displayed field-level validation messages.
 * Intended to be called after a successful Subscription_Form submission.
 */
export function clearValidationErrors() {
  Object.values(FIELD_ERROR_ELEMENT_IDS).forEach((elementId) => {
    const errorEl = document.getElementById(elementId);
    if (!errorEl) {
      return;
    }
    errorEl.textContent = '';
    errorEl.hidden = true;
  });
}

/**
 * Displays a one-time notice that saved data could not be loaded.
 * @param {string} message
 */
export function renderStorageError(message) {
  const storageErrorEl = document.getElementById('storage-error');
  if (!storageErrorEl) {
    return;
  }

  storageErrorEl.textContent = message;
  storageErrorEl.hidden = false;
}
