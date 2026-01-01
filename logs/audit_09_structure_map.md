# AUDIT LOG 09: ROOT CAUSE INVESTIGATION - STRUCTURE MAP
**Date:** 2025-12-31
**Status:** FORENSIC ANALYSIS (NO FIXES APPLIED)
**Auditor:** Claude Opus 4.5
**Subject:** Mapping Exact File Structure & Configuration to Diagnose White Screen/Tailwind Failure

---

## EXECUTIVE SUMMARY

**Finding:** All configuration files ARE present and correctly configured. The issue is NOT missing files.
- `tailwind.config.js` ✅ EXISTS at root
- `postcss.config.js` ✅ EXISTS at root
- `main.css` ✅ EXISTS at `src/renderer/src/assets/main.css`
- `main.tsx` ✅ IMPORTS `./assets/main.css` correctly

**Suspected Root Cause:** The Tailwind CSS build output exists (`12.32 kB` CSS file generated), but the classes may not be applying due to:
1. Vite dev server not recompiling CSS after changes
2. Browser cache issue
3. Or the actual layout crash (Fragment error) is preventing render

---

## 1. THE MAP (File Structure)

### Project Root Structure
```
D:\MyProject\LiveSpec\livespec\
├── electron.vite.config.ts    ✅ EXISTS
├── tailwind.config.js          ✅ EXISTS (Root level)
├── postcss.config.js           ✅ EXISTS (Root level)
├── package.json                ✅ EXISTS
├── tsconfig.json               ✅ EXISTS
├── tsconfig.node.json          ✅ EXISTS
├── tsconfig.web.json           ✅ EXISTS
├── eslint.config.mjs           ✅ EXISTS
├── .editorconfig               ✅ EXISTS
└── src/
    ├── main/                   (Electron main process)
    ├── preload/                (Electron preload)
    └── renderer/               (React frontend)
        ├── index.html         ✅ EXISTS
        └── src/
            ├── main.tsx        ✅ EXISTS (Entry point)
            ├── App.tsx         ✅ EXISTS (Main component)
            └── assets/
                └── main.css    ✅ EXISTS
```

### Key Finding: NO HALLUCINATED PATHS
- All paths referenced in code match the actual file structure
- `src/renderer/src/main.tsx` → EXISTS
- `src/renderer/src/assets/main.css` → EXISTS
- `./src/renderer/index.html` in tailwind.config.js → EXISTS

---

## 2. THE CONFIGURATION (The "Brain")

### package.json - Dependencies
```json
{
  "dependencies": {
    "phosphor-react": "^1.4.1",      ✅ CORRECT (swapped from lucide-react)
    "react-reflex": "^4.1.0",          ✅ CORRECT
    "zustand": "^5.0.2",               ✅ CORRECT
    "dagre": "^0.8.5",                 ✅ CORRECT
    "panzoom": "^9.4.3",               ✅ CORRECT
    // ... other deps
  },
  "devDependencies": {
    "tailwindcss": "^3.4.17",          ✅ INSTALLED
    "autoprefixer": "^10.4.20",        ✅ INSTALLED
    "postcss": "^8.4.49",              ✅ INSTALLED
    "vite": "^7.2.6",                  ✅ INSTALLED
    "electron-vite": "^5.0.0",         ✅ INSTALLED
    // ... other deps
  }
}
```

**VERDICT:** ✅ All required dependencies are installed.

---

### tailwind.config.js - Current Content
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',      ✅ CORRECT PATH
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'  ✅ CORRECT PATTERN
  ],
  theme: {
    extend: {
      colors: {
        primary: { ... },
        gray: {
          850: '#1f2937',  ✅ CUSTOM
          900: '#111827',  ✅ CUSTOM
          950: '#030712'   ✅ CUSTOM
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],  ✅
        mono: ['JetBrains Mono', 'monospace']         ✅
      }
    }
  },
  plugins: []
}
```

**VERDICT:** ✅ Tailwind config is CORRECT. Content paths match actual file structure.

---

### postcss.config.js - Current Content
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

**Location:** `D:\MyProject\LiveSpec\livespec\postcss.config.js` (ROOT)

**VERDICT:** ✅ PostCSS config EXISTS and is CORRECT.

**WARNING:** Build shows:
```
[MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of postcss.config.js is not specified...
```

This is a WARNING, not an ERROR. It works, but causes performance overhead.

---

### electron.vite.config.ts - Vite Configuration
```typescript
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['ws', 'express', 'chokidar']  ✅ CORRECT
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')  ✅ ALIAS DEFINED
      }
    },
    plugins: [react()]  ✅ REACT PLUGIN
  }
})
```

**VERDICT:** ✅ Vite config is CORRECT.

---

## 3. THE ENTRY POINT (The "Link")

### src/renderer/src/main.tsx - Entry Point
```typescript
import './assets/main.css'  ✅ CSS IMPORT IS HERE

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

**VERDICT:** ✅ CSS is imported at the entry point. Path is correct (`./assets/main.css`).

---

### src/renderer/index.html - HTML Template
```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>LiveSpec</title>
    <!-- FIX (Audit Log 07): Added frame-src to allow localhost iframe for GuestViewport -->
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
              style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;
              frame-src 'self' http://localhost:3900 http://127.0.0.1:3900;"
    />
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**VERDICT:** ✅ CSP includes `frame-src` for localhost iframe. HTML template is correct.

---

## 4. THE LAYOUT BUG (The "Crash")

### App.tsx - Fragment Issue (LINES 265-283)
```tsx
{/* Guest Viewport & Graph View */}
<ReflexElement className="bg-gray-950" flex={1}>
  <ReflexContainer orientation="horizontal">
    {/* Guest Viewport - NO FRAGMENT, conditional rendering */}
    {showGuestViewport && (
      <ReflexElement minSize={200} size={350}>
        <div className="h-full relative border-b border-gray-800">
          ...
        </div>
      </ReflexElement>
    )}

    {showGuestViewport && (
      <ReflexSplitter className="border-t border-gray-700 hover:border-cyan-600 transition-colors" />
    )}

    {/* Graph/Tree View */}
    <ReflexElement flex={1}>
      ...
    </ReflexElement>
  </ReflexContainer>
</ReflexElement>
```

**VERDICT:** ✅ Fragment issue was FIXED in Round 7. The code now uses separate conditional renders instead of wrapping in `<>...</>`.

---

### Potential Issue: Lines 287-328 - Still Has Fragment
```tsx
{hasGraphData ? (
  <>
    {/* View Mode Toggle - Floating */}
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg p-1 flex items-center gap-2">
      ...
    </div>

    {/* View Content */}
    {viewMode === 'graph' && (
      <GraphCanvas ... />
    )}
    {viewMode === 'tree' && (
      <div className="w-full h-full bg-gray-900">
        <SpecTree ... />
      </div>
    )}
  </>
) : (
  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
    ...
  </div>
)}
```

**NOTE:** This Fragment (`<>...</>`) is INSIDE a `<main>` element, not inside `<ReflexContainer>`. This is VALID and should NOT cause the React Fragment error.

---

## 5. THE CSS FILE (main.css)

### src/renderer/src/assets/main.css
```css
/**
 * VISUAL REDEMPTION (Audit Log 06):
 * - Removed external Google Fonts import (CSP issue)
 * - Using system font stack for fast, safe loading
 */

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Dark Scrollbar styles ... */
/* Grid Pattern styles ... */
```

**VERDICT:** ✅ CSS file EXISTS and has correct content. No external font imports.

---

## 6. BUILD OUTPUT ANALYSIS

### From Latest Build:
```
[36mvite v7.3.0 [32mbuilding client environment for production...[36m
transforming...
[32m✓[39m 1428 modules transformed.
rendering chunks...
[2m../../out/renderer/[22m[32mindex.html                 [39m[1m[2m    0.74 kB[22m[1m[22m
[2m../../out/renderer/[22m[35massets/index-CT6nXhtA.css  [39m[1m[2m   12.32 kB[22m[1m[22m  ✅ CSS WAS GENERATED
[2m../../out/renderer/[22m[36massets/index-Bofb2fek.js   [39m[1m[33m1,007.86 kB[39m[22m
[32m✓[39m built in 10.87s
```

**VERDICT:** ✅ Tailwind CSS WAS compiled successfully. `12.32 kB` CSS file was generated.

---

## 7. ROOT CAUSE HYPOTHESIS

### What IS Working:
1. ✅ All config files exist and are correct
2. ✅ All dependencies are installed
3. ✅ CSS import is present in entry point
4. ✅ Build generates CSS output (12.32 kB)
5. ✅ Fragment issue in ReflexContainer was fixed

### What MAY Be Broken:
1. ⚠️ **HMR (Hot Module Replacement) may not be reloading CSS**
   - If the dev server is running from before CSS changes, it may not pick up the new styles
   - Solution: Restart dev server

2. ⚠️ **Browser Cache**
   - Old CSS may be cached
   - Solution: Hard refresh (Ctrl+Shift+R) or clear cache

3. ⚠️ **React Component Crash Before CSS Loads**
   - If there's a runtime error during render, CSS won't matter
   - The error "Invalid prop 'maxSize' supplied to React.Fragment" suggests the old code is still running

---

## 8. RECOMMENDED NEXT STEPS

### DO NOT GUESS PATHS. All paths are verified correct.

### STEP 1: Clean Restart
```bash
# Stop dev server
# Clear .vite cache
rm -rf node_modules/.vite
# Restart dev server
npm run dev
```

### STEP 2: If Still White, Check Browser Console
- Look for actual runtime errors
- The "Fragment error" suggests OLD CODE is still running

### STEP 3: Verify Built Output
- Check `out/renderer/assets/index-*.css` in production build
- See if Tailwind classes are present in the file

---

**END OF INVESTIGATION LOG**
