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
export function validateSubscriptionInput(input) {
  const name = input && input.name;
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (trimmedName.length === 0) {
    return {
      valid: false,
      field: 'name',
      message: 'Name is required.',
    };
  }

  const monthlyCost = Number(input && input.monthlyCost);

  if (!Number.isFinite(monthlyCost) || monthlyCost <= 0) {
    return {
      valid: false,
      field: 'monthlyCost',
      message: 'Monthly cost must be a positive number.',
    };
  }

  return { valid: true };
}

/**
 * Creates a new Subscription and appends it to the list.
 * Assumes input has already passed validateSubscriptionInput.
 * @param {Subscription[]} list
 * @param {{name: string, monthlyCost: number}} input
 * @returns {Subscription[]} new list (list is not mutated in place)
 */
export function addSubscription(list, input) {
  const newSubscription = {
    id: crypto.randomUUID(),
    name: typeof input.name === 'string' ? input.name.trim() : input.name,
    monthlyCost: Number(input.monthlyCost),
  };

  return [...list, newSubscription];
}

/**
 * @param {Subscription[]} list
 * @returns {number} sum of monthlyCost across list; 0 for empty list
 */
export function calculateTotalMonthlyCost(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return 0;
  }

  return list.reduce((total, subscription) => total + subscription.monthlyCost, 0);
}

/**
 * Returns a new list with the subscription matching id replaced by
 * the same id with updated name/monthlyCost. No-op (returns list
 * unchanged) if id is not found.
 * @param {Subscription[]} list
 * @param {string} id
 * @param {{name: string, monthlyCost: number}} input
 * @returns {Subscription[]}
 */
export function editSubscription(list, id, input) {
  const index = list.findIndex((subscription) => subscription.id === id);

  if (index === -1) {
    return list;
  }

  const updatedSubscription = {
    id,
    name: typeof input.name === 'string' ? input.name.trim() : input.name,
    monthlyCost: Number(input.monthlyCost),
  };

  const newList = [...list];
  newList[index] = updatedSubscription;
  return newList;
}

/**
 * Returns a new list with the subscription matching id removed.
 * No-op (returns a new list with the same entries) if id is not found.
 * @param {Subscription[]} list
 * @param {string} id
 * @returns {Subscription[]}
 */
export function removeSubscription(list, id) {
  return list.filter((subscription) => subscription.id !== id);
}

/**
 * @param {Subscription[]} list
 * @returns {Set<string>} ids of every subscription whose monthlyCost
 *          equals the maximum monthlyCost in list; empty set if list is empty
 */
export function getMostExpensiveIds(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return new Set();
  }

  const maxCost = list.reduce(
    (max, subscription) => Math.max(max, subscription.monthlyCost),
    -Infinity
  );

  const ids = list
    .filter((subscription) => subscription.monthlyCost === maxCost)
    .map((subscription) => subscription.id);

  return new Set(ids);
}
