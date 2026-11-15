// Readings for one recording. Range is meters. Azimuth is degrees:
// 0 is forward, 90 is to the right. Timestamps are milliseconds
// on the same clock as the chart playhead.
export const mockData = {
  r1: [
    { name: "r1", trackId: 101, timestamp: 0, range: 210, azimuth: -18 },
    { name: "r1", trackId: 101, timestamp: 1000, range: 183, azimuth: -24 },
    { name: "r1", trackId: 101, timestamp: 2000, range: 156, azimuth: -30, severity: "HIGH" },
    { name: "r1", trackId: 101, timestamp: 3000, range: 128, azimuth: -37, severity: "HIGH" },
    { name: "r1", trackId: 101, timestamp: 4000, range: 101, azimuth: -43, severity: "HIGH" },
    { name: "r1", trackId: 101, timestamp: 5000, range: 74, azimuth: -49, severity: "HIGH" },
    { name: "r1", trackId: 101, timestamp: 6000, range: 47, azimuth: -55 },
    { name: "r1", trackId: 101, timestamp: 6400, range: 36, azimuth: -58 },
    { name: "r1", trackId: 104, timestamp: 1600, range: 150, azimuth: -120 },
    { name: "r1", trackId: 104, timestamp: 2500, range: 126, azimuth: -71 },
    { name: "r1", trackId: 104, timestamp: 3400, range: 102, azimuth: -22 },
    { name: "r1", trackId: 104, timestamp: 4300, range: 78, azimuth: 28 },
  ],
  r2: [
    { name: "r2", trackId: 202, timestamp: 2000, range: 190, azimuth: 35 },
    { name: "r2", trackId: 202, timestamp: 3000, range: 149, azimuth: 48 },
    { name: "r2", trackId: 202, timestamp: 4000, range: 109, azimuth: 62 },
    { name: "r2", trackId: 202, timestamp: 5000, range: 68, azimuth: 75, severity: "MEDIUM" },
    { name: "r2", trackId: 202, timestamp: 5500, range: 48, azimuth: 82, severity: "MEDIUM" },
    { name: "r2", trackId: 202, timestamp: 6500, range: 84, azimuth: 95, severity: "MEDIUM" },
    { name: "r2", trackId: 202, timestamp: 7500, range: 139, azimuth: 108 },
    { name: "r2", trackId: 202, timestamp: 9000, range: 230, azimuth: 128 },
  ],
  r3: [
    { name: "r3", trackId: 303, timestamp: 4800, range: 42, azimuth: 175 },
    { name: "r3", trackId: 303, timestamp: 6000, range: 80, azimuth: 181 },
    { name: "r3", trackId: 303, timestamp: 7200, range: 117, azimuth: 187 },
    { name: "r3", trackId: 303, timestamp: 8400, range: 155, azimuth: 193 },
    { name: "r3", trackId: 303, timestamp: 9600, range: 192, azimuth: 199 },
    { name: "r3", trackId: 303, timestamp: 10800, range: 230, azimuth: 205 },
  ],
};

export function getRecordingMessages(recordingId = "mock") {
  if (!recordingId) return Promise.resolve(mockData);

  return Promise.resolve(mockData);
}
