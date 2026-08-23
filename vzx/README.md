# Signal Vault VZX Lab

This folder contains the native VZX Creative side of Signal Vault. It is deliberately separate from the public Vercel app and does not contain private music, ratings, catalog data, or local playlist paths.

## Cathedral Engine V02

`states/signal-cathedral-v02` is the current VZX Artiste scene. Unlike V01's flat image plus analyzer traces, the current engine uses an inpainted background plate and three separately composited RGBA architectural layers:

- the background cathedral remains stable instead of zooming with every beat;
- bass flexes the isolated foreground arch and changes the depth of the inner portal;
- mids rotate the foreground pillars and pointed arch independently from the nave;
- treble expands the isolated stairs and reflective floor to create a perspective ripple;
- waveform and spectrum data form a radial structure inside the portal instead of straight analyzer overlays;
- 650 native VZX particles respond to the high-frequency band; and
- a render surface, blur pass, and low-alpha feedback loop create glow and trails.

The old full-frame scale pulse and opaque image-state crossfades are disabled. The visible movement now comes from separately transformed architecture, portal depth, floor perspective, radial waveforms, particles, glow, and feedback. Slow zero-centered motion keeps the layers alive when the separate Visualization Audio service is stopped, while live octave bands add much stronger frequency-specific movement.

The background plate and transparent architectural layers are AI-generated, composition-matched passes derived from the original Astral Cathedral artwork. All state files use VZX resource-relative paths. Launching Artiste with this folder as its `data_path` keeps the scene portable and leaves the Steam installation untouched. V01 remains available as the simpler diagnostic scene.

## Controls

- Double-click `OPEN SIGNAL CATHEDRAL IN VZX.cmd` in the repository root. It starts Artiste with this portable data folder and loads Cathedral Engine V02 automatically.
- Play audio through the configured VZX visualization input.
- Press `Ctrl+F` for the native preview window/fullscreen view.
- Artiste can stop its separate audio-server process when it is restarted. If the radial waveform is flat, open **Input/Output > Visualization Audio**, select **WASAPI** and **Speakers (Realtek(R) Audio)**, then enable **Recording**. VZX's selector backgrounds can render black in this build; use the visible label and verify the status changes from **Stopped**. The idle architecture will move before that, but bass/mid/treble reaction requires the audio service.

## Privacy

Only visual source assets and VZX project files belong here. Do not add SUNO audio, Foobar playlists, the local catalog, keeper staging, ratings, or absolute audio-file paths.
