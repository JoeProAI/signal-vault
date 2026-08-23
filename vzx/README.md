# Signal Vault VZX Lab

This folder contains the native VZX Creative side of Signal Vault. It is deliberately separate from the public Vercel app and does not contain private music, ratings, catalog data, or local playlist paths.

## Cathedral Engine V02

`states/signal-cathedral-v02` is the current VZX Artiste scene. Unlike V01's flat image plus analyzer traces, V02 composites four synchronized image passes and a native procedural effects layer:

- bass drives the central portal shockwave and a smaller camera push through octave 0;
- mids rotate the architectural filament pass through octave 3;
- high frequencies expose and expand the filament and atmosphere passes through octaves 6 and 7;
- waveform and spectrum data form a radial structure inside the portal instead of straight analyzer overlays;
- 650 native VZX particles respond to the high-frequency band; and
- a render surface, blur pass, and low-alpha feedback loop create glow and trails.

V02 also has zero-centered idle motion for the base architecture, portal, filaments, and atmosphere. The cathedral therefore keeps moving when Artiste's separate Visualization Audio service is stopped. When audio is active, the octave bands add stronger frequency-specific motion on top of that baseline.

The three V02 effect images are AI-generated, composition-matched passes derived from the original Astral Cathedral artwork. All state files use VZX resource-relative paths. Launching Artiste with this folder as its `data_path` keeps the scene portable and leaves the Steam installation untouched. V01 remains available as the simpler diagnostic scene.

## Controls

- Double-click `OPEN SIGNAL CATHEDRAL IN VZX.cmd` in the repository root. It starts Artiste with this portable data folder and loads Cathedral Engine V02 automatically.
- Play audio through the configured VZX visualization input.
- Press `Ctrl+F` for the native preview window/fullscreen view.
- Artiste can stop its separate audio-server process when it is restarted. If the radial waveform is flat, open **Input/Output > Visualization Audio**, select **WASAPI** and **Speakers (Realtek(R) Audio)**, then press **Start**. The idle architecture will move before that, but bass/mid/treble reaction requires the audio service.

## Privacy

Only visual source assets and VZX project files belong here. Do not add SUNO audio, Foobar playlists, the local catalog, keeper staging, ratings, or absolute audio-file paths.
