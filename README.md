# Signal Vault

Signal Vault is a local-first music curation console for large folders of AI generations, demos, alternate takes, and unfinished tracks. It turns an overwhelming directory into focused audition decks without uploading the audio.

## Try it

[Open Signal Vault](https://signal-vault-coral.vercel.app/), choose a music folder, and start reviewing. Analysis, playback, and ratings stay in your browser.

## What it does

- Opens a music folder through the browser's directory picker
- Reads titles, artists, albums, comments, genres, duration, bitrate, and BPM cues locally
- Groups tracks with matching artist and title as alternate cuts
- Builds eight themed crates plus a 250-track priority audition deck
- Supports private local playback, search, energy sorting, and keyboard review
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
