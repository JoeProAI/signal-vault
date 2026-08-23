# Signal Vault VZX Lab

This folder contains the native VZX Creative side of Signal Vault. It is deliberately separate from the public Vercel app and does not contain private music, ratings, catalog data, or local playlist paths.

## Cathedral Engine V02

`states/signal-cathedral-v02` is the current VZX Artiste scene. Unlike V01's flat image plus analyzer traces, V02 continuously crossfades six aligned cathedral states and composites native procedural effects over them:

- sub, bass, mid, treble, transient, and decay images change the cathedral's color, filament length, portal energy, and architectural detail;
- bass, mids, and highs independently expose their matching image states through octaves 0, 3, 6, and 7;
- slow phase-shifted cycles keep the architecture evolving between beats instead of behaving like one uniformly pulsing image;
- bass still drives the central portal shockwave, while mids rotate the separate architectural filament pass;
- waveform and spectrum data form a radial structure inside the portal instead of straight analyzer overlays;
- 650 native VZX particles respond to the high-frequency band; and
- a render surface, blur pass, and low-alpha feedback loop create glow and trails.

V02 also has zero-centered idle motion for the base architecture, portal, filaments, and atmosphere. The old full-frame scale pulse has been reduced to a very small accent, so the visible movement now comes primarily from image-state morphing, portal motion, filament sway, atmosphere, radial waveforms, and particles. The cathedral therefore keeps changing when Artiste's separate Visualization Audio service is stopped. When audio is active, the octave bands add stronger frequency-specific morphing on top of that baseline.

The V02 effect images and six-state morph bank are AI-generated, composition-matched passes derived from the original Astral Cathedral artwork. All state files use VZX resource-relative paths. Launching Artiste with this folder as its `data_path` keeps the scene portable and leaves the Steam installation untouched. V01 remains available as the simpler diagnostic scene.

## Controls

- Double-click `OPEN SIGNAL CATHEDRAL IN VZX.cmd` in the repository root. It starts Artiste with this portable data folder and loads Cathedral Engine V02 automatically.
- Play audio through the configured VZX visualization input.
- Press `Ctrl+F` for the native preview window/fullscreen view.
- Artiste can stop its separate audio-server process when it is restarted. If the radial waveform is flat, open **Input/Output > Visualization Audio**, select **WASAPI** and **Speakers (Realtek(R) Audio)**, then press **Start**. The idle architecture will move before that, but bass/mid/treble reaction requires the audio service.

## Privacy

Only visual source assets and VZX project files belong here. Do not add SUNO audio, Foobar playlists, the local catalog, keeper staging, ratings, or absolute audio-file paths.
