# Signal Vault + VZX Integration Architecture

Signal Vault uses a dual-engine visual strategy. The browser and VZX do different jobs, and forcing one to impersonate the other would weaken both.

## Engine A: Signal Theater

Signal Theater is the portable layer that runs inside the public Signal Vault application.

- Web Audio API analysis of the locally playing track
- Original Canvas visual scenes that can ship with the application
- Fullscreen, scene selection, shuffle, and intensity controls
- No audio upload and no dependency on desktop software
- Suitable for public release pages, embeds, phones, and shared listening rooms

The scene registry in `src/visualizer.js` is deliberately modular. New scenes should be added as named renderers with their own visual identity rather than as minor color variations.

## Engine B: VZX

VZX Player remains the heavyweight native performance engine.

- Native OpenGL rendering and high-resolution display support
- Captures the active system audio output independently of Signal Vault
- Existing VZX visual packs and user preferences remain managed by VZX
- Signal Vault launches VZX through its registered Steam URL

Signal Vault must not copy, bundle, or redistribute VZX visual packs. VZX is a registered trademark and third-party product of Vovoid Media Technologies AB.

## Why VZX is not embedded in the hosted app

VZX Player is a Windows native OpenGL application. A Vercel-hosted browser application cannot embed that executable, inspect local VZX licenses, or safely rewrite files under a user's VZX profile. The browser can launch the registered application, while VZX independently listens to the same system audio.

Custom VZX visual creation belongs to VZX Artiste, which is part of VZX Creative. The consumer VZX Player is installed on the current development machine; VZX Creative and Artiste are not currently installed there.

## Phase 2: optional local companion

A small local Signal Bridge can deepen the integration without weakening the hosted privacy model.

1. Detect whether VZX Player or VZX Creative is installed.
2. Read the user's VZX playlist and tweak JSON into a Signal Vault inventory.
3. Match Signal Vault crates and track energy to preferred VZX visuals.
4. Launch VZX and display the recommended visual or preset beside the current track.
5. Write only to a Signal Vault-managed projection or backup copy. Never overwrite the user's VZX profile by default.

The browser application would communicate with Signal Bridge only over localhost with an explicit connection indicator and narrowly scoped commands.

## Phase 3: Artiste creation pipeline

With VZX Creative installed, Signal Vault can become a visual A&R system:

- Maintain a visual family tree alongside each song family
- Associate Artiste projects, visual handles, palettes, and tweak presets with tracks
- Run visual-versus-visual review battles
- Score visual compatibility by energy, frequency profile, structure, and user ratings
- Build performance sets that sequence music and visuals together

Original Artiste projects remain local unless the user explicitly packages or publishes them under terms compatible with VZX.

## Phase 4: visual releases

Approved music can be promoted from the private vault into a release package containing:

- The selected audio master
- Artwork and release metadata
- A chosen Signal Theater scene and palette
- Optional VZX performance notes or Artiste project reference
- A public browser player with an original portable visualizer

Audio publication remains a separate opt-in action. A visualizer selection never grants permission to upload a track.
