# Signal Vault

Signal Vault is a local-first music curation console for large folders of AI generations, demos, alternate takes, and unfinished tracks. It turns an overwhelming directory into focused audition decks without uploading the audio.

## Try it

[Open CUTLIGHT](https://cutlight.predictyou.ai/), load an image and song, or connect a music folder to enter the full Signal Vault review deck. Analysis, playback, rigging, and recording stay in your browser.

## What it does

- Opens a music folder through the browser's directory picker
- Reads titles, artists, albums, comments, genres, duration, bitrate, and BPM cues locally
- Groups tracks with matching artist and title as alternate cuts
- Builds eight themed crates plus a 250-track priority audition deck
- Supports private local playback, search, energy sorting, and keyboard review
- Includes Signal Theater with ten original browser-native audio-reactive scenes
- Includes CUTLIGHT, which turns any image and song into a twenty-plane moving artwork rig
- Accepts local director prompts for color, movement, bass response, and musical transitions
- Records the clean visual canvas plus song audio as a downloadable WebM video
- Can launch the installed VZX Player for a native OpenGL visualizer experience
- Saves `VAULT`, `HOLD`, and `CUT` decisions in the browser
- Provides an explicit **Forget Library** action that removes the cached catalog and ratings without touching audio files
- Exports keepers as M3U8 playlists and decisions as JSON

Supported import formats include MP3, M4A, AAC, FLAC, WAV, OGG, Opus, AIFF, and APE. Playback support still depends on the visitor's browser.

## Privacy model

Audio never leaves the visitor's device. Signal Vault creates temporary browser object URLs for playback and stores only the analyzed catalog and ratings in local browser storage. The production build contains no audio, personal paths, or prebuilt music catalog.

Selecting the same folder later reconnects playback without rebuilding an unchanged catalog.

## Run locally

Double-click **START SIGNAL VAULT.cmd**, or run:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173`, choose a music folder, and leave the tab open while the first local analysis completes.

Keyboard controls:

- `Space`: play or pause
- `J` / `K`: next or previous
- `V`: vault
- `H`: hold
- `X`: cut
- `F`: open or close Signal Theater
- `Left` / `Right`: change the Signal Theater scene
- `R`: randomize the Signal Theater scene
- `Escape`: close Signal Theater

## CUTLIGHT

CUTLIGHT is a local-first moving-artwork instrument inside Signal Theater. Load any image and song, then describe the direction in plain language. The current local director understands color families, monochrome treatment, movement intensity, bass emphasis, and color changes on detected beats, cuts, drops, or section transitions.

The browser divides the visible image into twenty independently eased motion planes. Each plane has its own pivot, frequency assignment, direction, scale, opacity, and transition response. The original image remains underneath the moving planes so the composition can separate without opening holes. Recording uses the canvas capture and Web Audio streams already on the device; nothing is uploaded for a normal session.

## Signal Theater and VZX

Signal Theater is the portable visual layer built directly into the web app. It includes ten original scenes, intensity control, automatic scene changes, fullscreen mode, and local audio analysis through the Web Audio API. Astral Cathedral is built from ten composition-matched artwork states. CUTLIGHT is the reusable any-image scene and recording workflow.

The **Launch VZX Player** control opens the separately installed VZX Player through Steam. VZX listens to the computer's active audio output, so Signal Vault can keep playing the selected local track while VZX renders it in its native OpenGL engine. VZX is a third-party product by Vovoid Media Technologies and is not bundled with Signal Vault.

See [VZX Integration Architecture](docs/VZX_INTEGRATION.md) for the planned local companion, Artiste workflow, and public visual-release path.

## Build and verify

```powershell
npm run build
npm run verify
```

Verification fails if the production output contains audio, a prebuilt catalog, a Windows user path, or personal archive branding.

## Optional Foobar playlist generation

The browser can export selected keepers as an M3U8 playlist. For a full set of metadata-driven Foobar playlists, run:

```powershell
npm run catalog -- "C:\path\to\music-folder"
```

Generated playlists are local-only and Git-ignored.

## Publishing

The application is a static Vite site with `vercel.json` and `.vercelignore` already included. A public GitHub/Vercel deployment publishes only the application code. Visitors analyze and play their own local files.

Public audio sharing is a separate, opt-in feature and is intentionally not part of the default privacy model.

## License

Signal Vault is available under the [MIT License](LICENSE).
