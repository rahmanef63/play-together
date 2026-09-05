import "core-js/actual/array/at";
import "core-js/actual/object/has-own";
import "core-js/actual/string/replace-all";
import "core-js/actual/structured-clone";
import "core-js/actual/promise/all-settled";
import { ResizeObserver as ResizeObserverFallback } from "@juggle/resize-observer";

// Platform/remote-controller helpers only; immutable game bundles are not rewritten.
if (typeof globalThis.ResizeObserver === "undefined")
  globalThis.ResizeObserver = ResizeObserverFallback;
