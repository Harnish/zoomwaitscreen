# Zoom Wait Screen

A lightweight desktop app for displaying a wait screen while sharing your screen on Zoom. Configure a message or countdown timer, pick a background image, then click **Start Display** — the window expands to your chosen size, ready to share.

## Features

- **Away Message** — display custom text over a background image
- **Countdown Timer** — count down to a meeting start time, either "in X minutes" or at an exact time
- **Custom background** — pick any PNG, JPG, or WEBP image
- **Configurable display size** — presets for 1280×720 and 1920×1080, or enter custom dimensions
- **ESC or hover button** to return to settings

## Download

Grab the latest release for your platform from the [Releases](../../releases/latest) page:

| Platform | File |
|----------|------|
| Windows  | `Zoom Wait Screen Setup *.exe` |
| macOS    | `Zoom Wait Screen-*.dmg` |
| Linux    | `Zoom Wait Screen-*.AppImage` |

## Usage

1. Launch the app — a small settings window appears
2. Choose **Away Message** or **Countdown Timer**
3. Fill in your message or set the countdown time
4. Optionally pick a background image
5. Set the display size (default 1280×720)
6. Click **Start Display**
7. Share the window in Zoom
8. Press **ESC** or hover to reveal the back button when done

## Development

**Prerequisites:** Node.js 20+

```bash
git clone https://github.com/Harnish/zoomwaitscreen.git
cd zoomwaitscreen
npm install
npm start       # run the app
npm test        # run unit tests
npm run build   # package binaries to dist/
```

## CI / Releases

Every push to `main` runs tests and builds all three platforms. Pushing a `v*` tag builds and attaches the binaries to a GitHub Release automatically.

## License

MIT
