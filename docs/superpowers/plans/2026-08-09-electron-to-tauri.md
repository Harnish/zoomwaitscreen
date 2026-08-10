# Electron → Tauri v2 Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Electron shell (`main.js`, `electron`/`electron-builder`) with a Tauri v2 Rust core, keeping the existing plain HTML/CSS/JS frontend and all current behavior (away message, countdown, background image picker, size presets, custom title bar, ESC/back).

**Architecture:** Frontend files stay at the repo root and are served by Tauri via `frontendDist` — no bundler. A new `src-tauri/` Rust crate exposes 3 commands (`choose_background`, `resize_window`, `quit_app`); page-to-page navigation moves from Electron's `loadFile` IPC to plain `location.href` changes in the existing single webview.

**Tech Stack:** Tauri v2 (Rust), `@tauri-apps/api` (JS), `tauri-plugin-dialog`, existing vanilla JS/HTML/CSS, Jest (unchanged).

## Global Constraints

- No frontend framework or bundler — files stay plain HTML/CSS/JS at repo root.
- No custom app icon — use the Tauri CLI's generated default.
- `countdown.js`'s logic and `tests/countdown.test.js` must not change.
- `npm test` must keep passing throughout.
- Background image access uses `assetProtocol.scope: ["**"]` in `tauri.conf.json` (accepted trust trade-off for a local single-user tool — see spec).

---

### Task 1: Install Rust + Tauri Linux build dependencies

**Files:** none (environment setup only).

**Interfaces:** N/A — this task just makes `cargo`, `rustc`, and the Tauri CLI usable for every later task.

- [ ] **Step 1: Install Rust via rustup**

Run: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`
Then: `source "$HOME/.cargo/env"`

- [ ] **Step 2: Verify Rust is installed**

Run: `rustc --version && cargo --version`
Expected: both print version numbers (no "command not found").

- [ ] **Step 3: Install Tauri's Linux system dependencies (Fedora)**

This machine is Fedora (`fc44`), so use `dnf`, not `apt`:

Run: `sudo dnf install -y webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel patchelf gtk3-devel`

This step requires `sudo` — confirm with the user before running it, since it modifies system packages outside the repo.

- [ ] **Step 4: Verify pkg-config can find webkit2gtk**

Run: `pkg-config --modversion webkit2gtk-4.1`
Expected: prints a version number, no error.

---

### Task 2: Convert `package.json` to Tauri, remove Electron

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: npm scripts `start` (→ `tauri dev`), `build` (→ `tauri build`), `test` (unchanged); dependency `@tauri-apps/api`; devDependency `@tauri-apps/cli`.

- [ ] **Step 1: Rewrite package.json**

Replace the full file contents with:

```json
{
  "name": "zoom-wait-screen",
  "version": "1.0.0",
  "description": "Zoom wait screen — away message and countdown timer for Zoom screen sharing",
  "author": "josephharnish@gmail.com",
  "scripts": {
    "start": "tauri dev",
    "test": "jest",
    "build": "tauri build",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "jest": "^30.4.2"
  }
}
```

This drops `electron`, `electron-builder`, the `main` field, and the electron-builder `build` config block (packaging config moves to `tauri.conf.json` in Task 3).

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: installs cleanly, no `electron`/`electron-builder` in `node_modules` afterward (they're removed by `npm install` reconciling with the new `package.json`).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap electron/electron-builder for tauri in package.json"
```

---

### Task 3: Scaffold `src-tauri/` and configure the window

**Files:**
- Create: `src-tauri/` (via `tauri init`)
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Produces: `tauri.conf.json` window config (480×580, `decorations:false`, `resizable:false`) and `app.security.assetProtocol.scope` that Task 6/7's frontend code relies on for background images.

- [ ] **Step 1: Run the Tauri init scaffolder from the repo root**

Run:
```bash
npx @tauri-apps/cli@2 init \
  --app-name "Zoom Wait Screen" \
  --window-title "Zoom Wait Screen" \
  --frontend-dist "../" \
  --dev-url "" \
  --before-dev-command "" \
  --before-build-command "" \
  --ci
```

This creates `src-tauri/` with `Cargo.toml`, `tauri.conf.json`, `src/main.rs`, `src/lib.rs`, `build.rs`, default icons, and `capabilities/default.json`.

- [ ] **Step 2: Set the app identifier and product name in `src-tauri/tauri.conf.json`**

Edit the top-level `identifier` and `productName` fields to match the old electron-builder config:

```json
"productName": "Zoom Wait Screen",
"identifier": "com.zoomwaitscreen.app",
```

- [ ] **Step 3: Configure the window in `src-tauri/tauri.conf.json`**

Under `app.windows`, replace the generated entry with:

```json
"windows": [
  {
    "title": "Zoom Wait Screen",
    "width": 480,
    "height": 580,
    "resizable": false,
    "decorations": false,
    "center": true,
    "backgroundColor": "#1e1e2e"
  }
]
```

- [ ] **Step 4: Allow the asset protocol to load user-picked background images**

Under `app.security` in the same file, add:

```json
"assetProtocol": {
  "enable": true,
  "scope": ["**"]
}
```

- [ ] **Step 5: Confirm `frontendDist` points at the repo root**

In the `build` section, confirm (or set):

```json
"frontendDist": "../"
```

- [ ] **Step 6: Verify the config parses**

Run: `cd src-tauri && cargo check && cd ..`
Expected: compiles/checks with no config-schema errors. If a field name is rejected (e.g. `backgroundColor` not supported in the installed Tauri version), remove that one field and note it — it's cosmetic only.

- [ ] **Step 7: Commit**

```bash
git add src-tauri .gitignore
git commit -m "feat: scaffold src-tauri, configure window and asset protocol scope"
```

(`tauri init` typically appends `src-tauri/target` and similar to `.gitignore` — include whatever it changed.)

---

### Task 4: Implement the 3 Tauri commands

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Consumes: nothing from earlier tasks besides the scaffold from Task 3.
- Produces: invokable commands `choose_background() -> Option<String>`, `resize_window(width: f64, height: f64) -> ()`, `quit_app() -> ()` — Task 6/7's frontend calls these exact names with these exact argument shapes.

- [ ] **Step 1: Add the dialog plugin dependency**

In `src-tauri/Cargo.toml`, under `[dependencies]`, add:

```toml
tauri-plugin-dialog = "2"
```

- [ ] **Step 2: Write the commands in `src-tauri/src/lib.rs`**

Replace the generated `run()` function and its `greet`-style command with:

```rust
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn choose_background(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .add_filter("Images", &["jpg", "jpeg", "png", "webp"])
        .blocking_pick_file()
        .map(|file_path| file_path.to_string())
}

#[tauri::command]
fn resize_window(window: tauri::WebviewWindow, width: f64, height: f64) {
    let _ = window.set_resizable(true);
    let _ = window.set_size(tauri::LogicalSize::new(width, height));
    let _ = window.set_resizable(false);
    let _ = window.center();
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            choose_background,
            resize_window,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Grant the dialog plugin's default permission**

In `src-tauri/capabilities/default.json`, add `"dialog:default"` to the `permissions` array (alongside whatever `tauri init` already put there, e.g. `"core:default"`). Custom commands (`choose_background`, `resize_window`, `quit_app`) need no permission entries — only plugin-provided commands are gated by the capabilities system.

- [ ] **Step 4: Build to verify it compiles**

Run: `cd src-tauri && cargo build && cd ..`
Expected: builds successfully. Fix any type errors against the exact Tauri/plugin version resolved by Cargo before moving on — this is the only "test" available for Rust glue code with no unit tests of its own.

- [ ] **Step 5: Commit**

```bash
git add src-tauri
git commit -m "feat: implement choose_background, resize_window, quit_app tauri commands"
```

---

### Task 5: Make `countdown.js` work as both a CommonJS module and a browser global

**Files:**
- Modify: `countdown.js`
- Test: `tests/countdown.test.js` (unchanged — used as the regression check)

**Interfaces:**
- Produces: `window.calculateTargetDate`, `window.getRemainingSeconds`, `window.formatTime` — Task 7's `display.js` calls these as bare globals.

- [ ] **Step 1: Run the existing test suite to confirm the current baseline passes**

Run: `npm test`
Expected: all `tests/countdown.test.js` tests pass (this file isn't changing).

- [ ] **Step 2: Add the browser-global export at the bottom of `countdown.js`**

Keep the three function declarations exactly as they are. Replace the final line (`module.exports = { calculateTargetDate, getRemainingSeconds, formatTime }`) with:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateTargetDate, getRemainingSeconds, formatTime }
}
if (typeof window !== 'undefined') {
  window.calculateTargetDate = calculateTargetDate
  window.getRemainingSeconds = getRemainingSeconds
  window.formatTime = formatTime
}
```

- [ ] **Step 3: Re-run the test suite**

Run: `npm test`
Expected: same tests still pass (Jest's Node environment has no `window`, so the `typeof window !== 'undefined'` branch is simply skipped there — this is what makes the dual-export safe).

- [ ] **Step 4: Commit**

```bash
git add countdown.js
git commit -m "feat: expose countdown.js functions as browser globals alongside CommonJS export"
```

---

### Task 6: Port `renderer.js` and `index.html` off Electron IPC

**Files:**
- Modify: `renderer.js`
- Modify: `index.html:77` (script tag)

**Interfaces:**
- Consumes: `choose_background`, `resize_window` from Task 4.
- Produces: no exports — this is a leaf/entry file.

- [ ] **Step 1: Replace the top of `renderer.js`**

Replace lines 1-2:
```js
const { ipcRenderer } = require('electron')
const path = require('path')
```
with:
```js
import { invoke, convertFileSrc } from '@tauri-apps/api/core'

function basename(filePath) {
  return filePath.split(/[\\/]/).pop()
}
```

- [ ] **Step 2: Update the background picker handler**

Replace the `choose-bg` click handler body (currently calling `ipcRenderer.invoke('choose-background')` and building a `file://` URL with `path.basename`) with:

```js
document.getElementById('choose-bg').addEventListener('click', async () => {
  const filePath = await invoke('choose_background')
  if (filePath) {
    backgroundImagePath = filePath
    document.getElementById('bg-filename').textContent = basename(filePath)
    const preview = document.getElementById('bg-preview')
    preview.style.backgroundImage = `url('${convertFileSrc(filePath)}')`
    preview.classList.remove('hidden')
  }
})
```

- [ ] **Step 3: Update the Start Display handler**

Make the `start-btn` click handler `async`, and replace its final line
(`ipcRenderer.invoke('show-display', width, height)`) with:

```js
  await invoke('resize_window', { width, height })
  window.location.href = 'display.html'
```

- [ ] **Step 4: Update the title bar close handler**

Replace:
```js
document.querySelector('.title-bar-close').addEventListener('click', () => {
  ipcRenderer.invoke('quit-app')
})
```
with:
```js
document.querySelector('.title-bar-close').addEventListener('click', () => {
  invoke('quit_app')
})
```

- [ ] **Step 5: Make the script tag a module in `index.html`**

Change line 77 from:
```html
<script src="renderer.js"></script>
```
to:
```html
<script type="module" src="renderer.js"></script>
```

- [ ] **Step 6: Commit**

```bash
git add renderer.js index.html
git commit -m "feat: port renderer.js from electron ipc to tauri invoke"
```

(Manual verification of this file happens end-to-end in Task 8, once `display.js` is also ported — the settings screen alone can't fully round-trip yet.)

---

### Task 7: Port `display.js` and `display.html` off Electron IPC

**Files:**
- Modify: `display.js`
- Modify: `display.html:22-23` (script tags)

**Interfaces:**
- Consumes: `resize_window` from Task 4; `window.calculateTargetDate`, `window.getRemainingSeconds`, `window.formatTime` from Task 5.
- Produces: no exports — leaf/entry file.

- [ ] **Step 1: Replace the top of `display.js`**

Replace lines 1-2:
```js
const { ipcRenderer } = require('electron')
const { calculateTargetDate, getRemainingSeconds, formatTime } = require('./countdown')
```
with:
```js
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
```

(`calculateTargetDate`, `getRemainingSeconds`, `formatTime` are now read as bare globals set by `countdown.js`'s classic `<script>` tag — no import needed for them.)

- [ ] **Step 2: Update the background image line in `init()`**

Replace:
```js
    document.body.style.backgroundImage = `url('${encodeURI('file://' + bgPath.replace(/\\/g, '/'))}')`
```
with:
```js
    document.body.style.backgroundImage = `url('${convertFileSrc(bgPath)}')`
```

- [ ] **Step 3: Update `goBack()`**

Replace:
```js
function goBack() {
  if (navigating) return
  navigating = true
  ipcRenderer.invoke('show-settings')
}
```
with:
```js
function goBack() {
  if (navigating) return
  navigating = true
  invoke('resize_window', { width: 480, height: 580 }).then(() => {
    window.location.href = 'index.html'
  })
}
```

- [ ] **Step 4: Update the script tags in `display.html`**

Replace:
```html
  <script src="display.js"></script>
```
with:
```html
  <script src="countdown.js"></script>
  <script type="module" src="display.js"></script>
```

- [ ] **Step 5: Commit**

```bash
git add display.js display.html
git commit -m "feat: port display.js from electron ipc to tauri invoke"
```

---

### Task 8: Remove `main.js`, run the app end-to-end, fix what breaks

**Files:**
- Delete: `main.js`

**Interfaces:** N/A — this is the manual verification pass for the whole conversion.

- [ ] **Step 1: Delete the Electron main process file**

Run: `git rm main.js`

- [ ] **Step 2: Launch the app in dev mode**

Run: `npm start`
Expected: a 480×580 borderless window opens showing the settings screen.

- [ ] **Step 3: Manually verify the away-message flow**

In the running app: select "Away Message", type a message, click "Start Display". Expected: window resizes to 1280×720, centers, shows your message. Press ESC. Expected: window resizes back to 480×580 and shows settings again.

- [ ] **Step 4: Manually verify the countdown flow**

Select "Countdown Timer", leave the default "In 15 minutes", click "Start Display". Expected: countdown page shows a ticking `MM:SS`/`HH:MM:SS` timer. Click the "✕ Back to Settings" button. Expected: returns to settings at 480×580.

- [ ] **Step 5: Manually verify the background image picker**

Click "Choose Image", pick a PNG/JPG. Expected: filename appears, preview swatch shows the image. Start the display. Expected: the chosen image renders as the display background.

- [ ] **Step 6: Manually verify custom size + quit**

Enter a custom width/height (e.g. 1920×1080), Start Display, confirm it resizes to that size. Go back, click the title bar's ✕. Expected: the app process exits.

- [ ] **Step 7: Fix any breakage found in Steps 2-6**

If something doesn't work (e.g. a Tauri config field name mismatch, a missing capability permission, an asset-protocol scope issue), fix it in the relevant file from Tasks 3/4/6/7 and re-run the affected manual step until all six pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove electron main.js, tauri app verified end-to-end"
```

---

### Task 9: Update the README's dev instructions

**Files:**
- Modify: `README.md:34-45`

**Interfaces:** N/A — documentation only.

- [ ] **Step 1: Replace the Development section**

Replace the `## Development` section's content with:

```markdown
## Development

**Prerequisites:** Node.js 20+, Rust (via [rustup](https://rustup.rs)), and your
platform's Tauri prerequisites (see the
[Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)).

```bash
git clone https://github.com/Harnish/zoomwaitscreen.git
cd zoomwaitscreen
npm install
npm start       # run the app (tauri dev)
npm test        # run unit tests
npm run build   # package binaries to src-tauri/target/release/bundle/
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update dev instructions for tauri"
```

---

### Task 10: Update GitHub Actions to build with Tauri

**Files:**
- Modify: `.github/workflows/build.yml`

**Interfaces:** N/A — CI config only.

- [ ] **Step 1: Add Rust toolchain setup and Linux system deps, swap the build step**

Replace the `build` job's steps (from `uses: actions/checkout@v7` through `Upload artifact`) with:

```yaml
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: '20'
          cache: 'npm'

      - uses: dtolnay/rust-toolchain@stable

      - name: Install Linux build dependencies
        if: matrix.os == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build distributable
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-artifact@v7
        with:
          name: ${{ matrix.artifact-name }}
          path: ${{ matrix.artifact-path }}
          if-no-files-found: error
```

- [ ] **Step 2: Update the matrix artifact paths**

Replace the `matrix.include` block's `artifact-path` values:

```yaml
          - os: windows-latest
            artifact-name: zoom-wait-screen-windows
            artifact-path: src-tauri/target/release/bundle/nsis/*.exe
          - os: macos-latest
            artifact-name: zoom-wait-screen-macos
            artifact-path: src-tauri/target/release/bundle/dmg/*.dmg
          - os: ubuntu-latest
            artifact-name: zoom-wait-screen-linux
            artifact-path: src-tauri/target/release/bundle/appimage/*.AppImage
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: build with tauri instead of electron-builder"
```

(This can only be verified by pushing/opening a PR — note that to the user rather than claiming it's confirmed working.)

---

### Task 11: Update GitLab CI to build with Tauri

**Files:**
- Modify: `.gitlab-ci.yml`

**Interfaces:** N/A — CI config only.

- [ ] **Step 1: Rewrite the file**

Replace the full contents with:

```yaml
stages:
  - test
  - build

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test

build-linux:
  stage: build
  image: node:20
  before_script:
    - apt-get update -y
    - apt-get install -y curl build-essential fuse libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
    - curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    - source "$HOME/.cargo/env"
    - npm ci
  script:
    - npm run build
  artifacts:
    paths:
      - src-tauri/target/release/bundle/appimage/*.AppImage
    expire_in: 1 week
  only:
    - main
```

- [ ] **Step 2: Commit**

```bash
git add .gitlab-ci.yml
git commit -m "ci: build with tauri instead of electron-builder"
```

(Same caveat as Task 10 — only verifiable by an actual GitLab CI run.)

---

### Task 12: Full release build sanity check

**Files:** none.

**Interfaces:** N/A — final verification.

- [ ] **Step 1: Run a full release build locally**

Run: `npm run build`
Expected: completes and produces `src-tauri/target/release/bundle/appimage/*.AppImage` (Linux, this machine).

- [ ] **Step 2: Run the produced AppImage**

Run: `src-tauri/target/release/bundle/appimage/*.AppImage` (fill in the actual filename)
Expected: the app launches and behaves identically to the `npm start` dev-mode checks from Task 8.

- [ ] **Step 3: Run the full test suite one last time**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Final status check**

Run: `git status`
Expected: clean working tree, nothing left uncommitted.
