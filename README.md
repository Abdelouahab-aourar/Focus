# Focus

A desktop-first focus timer built with React, Tauri and Rust.

## Features

- Three timer modes: Focus, Break, and Rest
- Circular progress timer with Start/Pause and Reset controls
- Per-mode duration settings (minutes + seconds)
- System notification and looping alarm sound on timer completion
- Mute/unmute in Settings, with an immediate stop control on the main timer row
- Optional preference persistence to a JSON file in the app data folder
- Locally bundled fonts (no runtime Google Fonts import)

## Tech Stack

- **Frontend:** React , TypeScript, Vite, Tailwind CSS
- **UI:** shadcn-style components (`Button`, `Card`, `Input`) + `lucide-react` icons
- **Desktop shell:** Tauri v2 (Rust backend)
- **Notifications:** `@tauri-apps/plugin-notification`

## Preferences Persistence

Enable **Save Prefs To File** in Settings to persist preferences to:

```
<app_data_dir>/user-prefs.json
```

Example:

```json
{
  "durations": {
    "focus": 5400,
    "break": 300,
    "rest": 1800
  },
  "isSoundMuted": false
}
```

>

## Notifications and Sound

On timer completion, Focus requests notification permission, sends a desktop notification, and starts a looping alarm (`public/sounds/notification_sound.m4a`). The alarm can be stopped immediately from the main screen.

## Download / Install

Prebuilt cross-platform executables (Windows, macOS, Linux) are published on the [Releases page](https://github.com/Abdelouahab-aourar/Focus/releases). Download the installer for your platform and run it — no build step required.
