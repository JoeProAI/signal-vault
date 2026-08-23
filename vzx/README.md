# Signal Vault VZX Lab

This folder contains the native VZX Creative side of Signal Vault. It is deliberately separate from the public Vercel app and does not contain private music, ratings, catalog data, or local playlist paths.

## Cathedral Engine V04

`states/signal-cathedral-v04` is the current VZX Artiste scene. It uses a dark stable cathedral base and 20 separately composited RGBA architectural plates:

- sub energy opens the portal core and pushes the central floor forward;
- bass drives the main columns, structural roots, and lower architecture;
- low mids move the outer arches and stairs;
- mids open the crown and paired inner ribs;
- high mids lift the crown apex and upper rib vaults;
- treble activates the side-aisle light and reflective floor wings; and
- every plate combines smoothed audio response with its own low-amplitude phase motion.

The scene intentionally has no particle field, oscilloscope overlay, rotation jitter, blur loop, or whole-frame pulse. The stable shadow base prevents holes when the luminous plates separate, while independent phase offsets make the cathedral open and contract as a coordinated structure rather than one breathing image.

The V04 master is an AI-generated, composition-matched evolution of the original Astral Cathedral artwork. `scripts/build-vzx-cathedral-v04.py` deterministically rebuilds the base, the 20 transparent plates, the layer map, and the VZX state. All state files use VZX resource-relative paths. Launching Artiste with this folder as its `data_path` keeps the scene portable and leaves the Steam installation untouched. Earlier scene versions remain available for comparison.

## Controls

- Double-click `OPEN SIGNAL CATHEDRAL IN VZX.cmd` in the repository root. It starts Artiste with this portable data folder and loads Cathedral Engine V04 automatically.
- Play audio through the configured VZX visualization input.
- Press `Ctrl+F` for the native preview window/fullscreen view.
- Artiste can stop its separate audio-server process when it is restarted. If the architecture only follows its slow idle phases, open **Input/Output > Visualization Audio**, select **WASAPI** and **Speakers (Realtek(R) Audio)**, then enable **Recording**. VZX's selector backgrounds can render black in this build; use the visible label and verify the status changes from **Stopped**. The architecture will move before that, but spectral reaction requires the audio service.

## Privacy

Only visual source assets and VZX project files belong here. Do not add SUNO audio, Foobar playlists, the local catalog, keeper staging, ratings, or absolute audio-file paths.
