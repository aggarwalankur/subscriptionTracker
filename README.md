## One-Sentence Prompt
"Build a subscription tracker web app that lists all monthly subscriptions, shows total monthly cost, and highlights the most expensive ones."


# Subscription Tracker

A lightweight, client-side web app for tracking recurring monthly subscriptions. No backend, no build step, no dependencies — just HTML, CSS, and vanilla JavaScript (ES modules).

## Features

- Add, edit, and remove subscriptions (name + monthly cost)
- View all subscriptions in a list with the total monthly cost
- Automatically highlights the most expensive subscription(s) (ties are all highlighted)
- Input validation (name required, cost must be a positive number)
- Data persists across sessions via the browser's `localStorage`
- Gracefully handles corrupted/missing saved data (falls back to an empty list with a notice)

## Running the app

This app uses native ES modules (`<script type="module">`), which browsers block from loading over the `file://` protocol due to CORS restrictions. You need to serve it over HTTP:

```bash
# Using Python
cd subscription-tracker
python3 -m http.server 8080
# then open http://localhost:8080

# Or using Node
npx serve .
```

Then open the printed local URL in your browser.

## Project structure

```
subscription-tracker/
├── index.html              # App shell: form, list container, total display
├── styles.css               # Layout, form, list, and most-expensive highlight styles
├── src/
│   ├── subscriptionModel.js # Pure functions: validation, add/edit/remove, total cost, most-expensive calculation
│   ├── storage.js           # localStorage persistence (save/load)
│   ├── renderer.js          # DOM rendering: list, total, empty state, highlighting, errors
│   └── app.js                # Controller: wires DOM events to model/storage/renderer
└── .kiro/specs/subscription-tracker/  # Requirements, design, and task docs for this feature
```

## Notes

- All subscription data is stored locally in your browser; clearing browser storage will remove it.
- No account or server is required — this is intended as a personal, single-device tracker.
