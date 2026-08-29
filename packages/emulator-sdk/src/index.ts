export type EmulatorPlatform = "ps1" | "ps2" | "custom-wasm";

export interface LawfulGameImage {
  contentHash: string;
  byteLength: number;
  displayName: string;
  ownershipAttestedAt: number;
  source: "user-upload" | "licensed-library";
}

export interface EmulatorInputState {
  buttons: Readonly<Record<string, boolean>>;
  axes: Readonly<Record<string, number>>;
}

export interface EmulatorVideoFrame {
  width: number;
  height: number;
  timestamp: number;
  pixels?: Uint8Array;
}

export interface EmulatorCoreAdapter {
  readonly id: string;
  readonly platform: EmulatorPlatform;
  readonly version: string;
  load(image: LawfulGameImage, bytes: ArrayBuffer): Promise<void>;
  setInput(port: number, state: EmulatorInputState): void;
  runFrame(): Promise<EmulatorVideoFrame | null>;
  saveState(): Promise<ArrayBuffer>;
  loadState(state: ArrayBuffer): Promise<void>;
  dispose(): Promise<void>;
}

export interface EmulatorCapabilityReport {
  webAssembly: boolean;
  sharedArrayBuffer: boolean;
  webGl2: boolean;
  webGpu: boolean;
  gamepad: boolean;
}

export function probeEmulatorCapabilities(): EmulatorCapabilityReport {
  const globalObject = globalThis as typeof globalThis & {
    WebAssembly?: unknown;
    SharedArrayBuffer?: unknown;
    navigator?: Navigator & { gpu?: unknown };
    document?: Document;
  };
  const canvas = globalObject.document?.createElement("canvas");
  return {
    webAssembly: typeof globalObject.WebAssembly !== "undefined",
    sharedArrayBuffer: typeof globalObject.SharedArrayBuffer !== "undefined",
    webGl2: Boolean(canvas?.getContext("webgl2")),
    webGpu: Boolean(globalObject.navigator?.gpu),
    gamepad: typeof globalObject.navigator?.getGamepads === "function",
  };
}
