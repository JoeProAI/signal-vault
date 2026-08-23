# Signal Vault VZX Lab

This folder contains the native VZX Creative side of Signal Vault. It is deliberately separate from the public Vercel app and does not contain private music, ratings, catalog data, or local playlist paths.

## First scene

`states/signal-cathedral-v01` is a text-based VZX Artiste state. It combines:

- the Astral Cathedral artwork as a native VZX texture;
- octave 0 bass energy driving image scale;
- the full FFT spectrum driving a cyan/violet oscilloscope field;
- the full waveform driving a separate magenta trace; and
- additive compositing in VZX.

The state uses a VZX resource-relative image path. Launching Artiste with this folder as its `data_path` keeps the whole scene portable and leaves the Steam installation untouched.

## Controls

- Double-click `OPEN SIGNAL CATHEDRAL IN VZX.cmd` in the repository root. It starts Artiste with this portable data folder and loads the scene automatically.
- Play audio through the configured VZX visualization input.
- Press `Ctrl+F` for the native preview window/fullscreen view.
- Use Artiste's Input/Output audio configuration if the waveform is flat.

## Privacy

Only visual source assets and VZX project files belong here. Do not add SUNO audio, Foobar playlists, the local catalog, keeper staging, ratings, or absolute audio-file paths.
