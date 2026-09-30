export type SensorSourceStatus = 'simulated' | 'not-connected' | 'connected';

export type Esp32Reading = {
  ppm: number;
  capturedAt: string;
  source: 'esp32-c3';
};

export const ESP32_C3_STATUS: SensorSourceStatus = 'not-connected';

export function createEsp32C3Source() {
  return {
    status: ESP32_C3_STATUS,
    async read(): Promise<Esp32Reading | null> {
      return null;
    },
  };
}

// Integration boundary for a future BLE service. No radio connection is claimed in the demo.
export const esp32C3Source = createEsp32C3Source();