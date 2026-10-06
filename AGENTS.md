# Repository Guidelines

## Project Structure & Module Organization

The browser frontend lives at the repository root: `index.html` is the landing page, while `predict.html`, `dashboard.html`, `disease.html`, `admin.html`, and the informational pages provide individual views. `backend/` contains the Express API and the local TensorFlow Lite inference bridge; `backend/artifacts/crop-disease/` contains the deployed model, labels, and evaluation reports. The trained classifier supports pepper, potato, and tomato leaf classes.

- `style.css` is the global design system; `login.css` and `disease.css` hold page-specific overrides.
- `main.js` contains shared UI and page features; `login.js`, `chatbot.js`, `motion-effects.js`, and `hero3d.js` provide focused behavior.
- `auth.js` supplies lightweight route-guard helpers; `backend/` provides the API and model-backed prediction route.
- `imgs/` contains disease and leaf imagery. Keep asset names descriptive, such as `Fusarium_wilt.jpg`.

External libraries (Three.js, Leaflet, and Chart.js) are loaded from CDNs in the relevant HTML page; avoid adding a build system unless the project requires one.

## Build, Test, and Development Commands

Serve the root rather than opening pages directly so routing and browser behavior match deployment. Run the API separately for model-backed predictions:

```powershell
# Terminal 1: static frontend from the repository root
python -m http.server 8000

# Terminal 2: API from backend\
cd backend
npm install
py -3.10 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm run dev
```

Then visit `http://localhost:8000/predict.html`. Run backend checks with `cd backend; npm test` and `npm run lint`. Manually check the page you changed at desktop and mobile widths, navigation links, dark/light mode, language switching, and any affected login or prediction flows. Use browser developer tools to confirm the console is free of new errors.

## Coding Style & Naming Conventions

Use four spaces for HTML, CSS, and JavaScript indentation. Preserve the existing plain ES6 browser JavaScript style: `camelCase` for functions and variables, `const`/`let` instead of `var`, and semicolons. Keep DOM IDs and CSS classes descriptive and consistent with existing names (for example, `themeToggle`, `mobile-drawer`, and `btn-primary`). Add shared styles to `style.css`; reserve page-specific files for rules that cannot be reused. Guard page-specific DOM lookups so shared scripts remain safe on every page.

## Testing Guidelines

There is no test framework or coverage target. Treat the manual checks above as required regression testing. For visual changes, verify both themes and include before/after screenshots in the pull request when the layout or interaction changes.

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so use short imperative commit subjects such as `Improve prediction upload feedback`. Keep commits focused. Pull requests should explain the user-visible change, list manual validation performed, link related issues when available, and include screenshots for UI changes. Call out CDN, storage-key, or authentication-flow changes explicitly.
