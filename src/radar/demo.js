import { lerp } from "../utils/timeSeries";

const SAMPLE_MS = 1000;

export const DEMO_SENSORS = [
  { id: "r1", name: "Radar 1", color: "#3498db", symbol: "circle" },
  { id: "r2", name: "Radar 2", color: "#e74c3c", symbol: "diamond" },
  { id: "r3", name: "Radar 3", color: "#2ecc71", symbol: "square" },
];

function timeStamps(first, last, step = SAMPLE_MS) {
  const stamps = [];

  for (let timestamp = first; timestamp <= last; timestamp += step) {
    stamps.push(timestamp);
  }

  if (stamps[stamps.length - 1] !== last) {
    stamps.push(last);
  }

  return stamps;
}

function detectionSamples({ radarId, trackId, stamps, rangeAt, azimuthAt, severityAt }) {
  const span = Math.max(1, stamps[stamps.length - 1] - stamps[0]);

  return stamps.map((timestamp) => {
    const amount = (timestamp - stamps[0]) / span;
    const sample = {
      id: `${radarId}-${trackId}-${timestamp}`,
      timestamp,
      trackId,
      range: rangeAt(amount),
      azimuth: azimuthAt(amount),
    };
    const severity = severityAt?.(amount);

    if (severity) sample.severity = severity;

    return sample;
  });
}

export const DEMO_MESSAGES = {
  r1: [
    ...detectionSamples({
      radarId: "r1",
      trackId: 101,
      stamps: timeStamps(0, 6400),
      rangeAt: (amount) => lerp(210, 36, amount),
      azimuthAt: (amount) => lerp(-18, -58, amount),
      severityAt: (amount) => (amount >= 0.34 && amount <= 0.8 ? "HIGH" : null),
    }),
    ...detectionSamples({
      radarId: "r1",
      trackId: 104,
      stamps: timeStamps(1600, 4300),
      rangeAt: (amount) => lerp(150, 78, amount),
      azimuthAt: (amount) => lerp(-120, 28, amount),
    }),
  ],
  r2: detectionSamples({
    radarId: "r2",
    trackId: 202,
    stamps: timeStamps(2000, 9000),
    rangeAt: (amount) =>
      amount < 0.5 ? lerp(190, 48, amount / 0.5) : lerp(48, 230, (amount - 0.5) / 0.5),
    azimuthAt: (amount) => lerp(35, 128, amount),
    severityAt: (amount) => (amount >= 0.42 && amount <= 0.68 ? "MEDIUM" : null),
  }),
  r3: detectionSamples({
    radarId: "r3",
    trackId: 303,
    stamps: timeStamps(4800, 10800),
    rangeAt: (amount) => lerp(42, 230, amount),
    azimuthAt: (amount) => lerp(175, 205, amount),
  }),
};
