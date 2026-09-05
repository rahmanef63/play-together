export interface Metric {
  label: string;
  value: string;
  priority: number;
}

export interface MapPoint {
  x: number;
  z: number;
  own: boolean;
}

export interface TelemetryMap {
  route: Array<{ x: number; z: number }>;
  actors: MapPoint[];
}

export interface ConsoleTelemetrySummary {
  phase: string;
  detail: string;
  metrics: Metric[];
  map?: TelemetryMap;
}
