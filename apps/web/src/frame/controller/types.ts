export type Variables = Record<string, number | string | boolean>;
export type MutableState = Record<string, unknown>;
export type Cleanup = () => void;
