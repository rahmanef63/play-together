# Emulator roadmap

## Boundary already present

`packages/emulator-sdk` defines:

- emulator/core identity and declared capabilities;
- lawful game-image metadata and content hash;
- input mapping from the Play Together controller protocol;
- lifecycle methods for load, start, pause, reset, save state, and dispose;
- capability negotiation for WebAssembly, threads, graphics, audio, storage, and device limits.

It deliberately ships no BIOS, firmware, copyrighted game image, or emulator core.

## Product model

An emulator-backed title is still a versioned game plugin. Its controller and display use the normal browser contract, and its server policy declares one of:

- local emulation with shared controller input;
- host-browser emulation streamed to other participants;
- server-side emulation with encoded video/audio and authoritative input;
- unsupported on the current device.

The platform must not infer compatibility from a console name alone. A specific core + game image + browser + operating system + hardware combination is the compatibility unit.

## Phases

1. **Capability probe** — WebAssembly, cross-origin isolation, SharedArrayBuffer, WebGL/WebGPU, AudioWorklet, storage, and gamepad support.
2. **Legal image registry** — user-owned/homebrew/public-domain metadata, SHA-256, region, required BIOS declaration, and access policy.
3. **PS1-class pilot** — one audited core, one lawful test title, local save state, remote controller mapping, performance telemetry.
4. **Streaming fallback** — authoritative host/server execution for devices that cannot emulate locally.
5. **PS2 research gate** — benchmark per-device and per-title before any support claim; use server streaming where browser execution is not viable.

## Safety and rights

- Users must have lawful access to every game image and required firmware.
- Do not provide scraping, decryption, DRM circumvention, BIOS download, or copyrighted ROM distribution features.
- Store content hashes and access metadata, not hidden shared ROM URLs.
- Make unsupported/slow states explicit instead of silently degrading or overstating compatibility.
