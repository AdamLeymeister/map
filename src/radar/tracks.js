import { TRAIL_MS } from "./constants";
import { egoToXY } from "./coordinates";
import { isInView } from "./geometry";
import { lerp, lerpAngle, lowerBound, upperBound } from "../utils/timeSeries";

function messageGroups(messages) {
  if (Array.isArray(messages)) return [["track", messages]];
  return Object.entries(messages || {});
}

export function indexMessages(messages) {
  const tracks = new Map();

  for (const [radarId, group] of messageGroups(messages)) {
    if (!Array.isArray(group)) continue;

    for (const msg of group) {
      if (msg?.trackId == null) continue;
      if (msg.messageType && msg.messageType !== "DETECTION") continue;

      const range = msg.range ?? msg.body?.range;
      const azimuth = msg.azimuth ?? msg.body?.azimuth;

      if (!Number.isFinite(msg.timestamp) || !Number.isFinite(range) || !Number.isFinite(azimuth)) {
        continue;
      }

      const key = `${radarId}:${msg.trackId}`;
      let track = tracks.get(key);

      if (!track) {
        track = { radarId, trackId: msg.trackId, samples: [] };
        tracks.set(key, track);
      }

      track.samples.push({
        timestamp: msg.timestamp,
        range,
        azimuth,
        severity: msg.severity ?? msg.body?.severity ?? null,
      });
    }
  }

  for (const track of tracks.values()) {
    track.samples.sort((a, b) => a.timestamp - b.timestamp);
  }

  return tracks;
}

export function getSnapshot(trackIndex, timeMs, viewRange, trailMs = TRAIL_MS) {
  const detections = [];
  let activeCount = 0;

  for (const track of trackIndex.values()) {
    const samples = track.samples;
    const nextIndex = upperBound(samples, timeMs);
    const prevIndex = nextIndex - 1;

    if (prevIndex < 0) continue;

    const prev = samples[prevIndex];
    const next = samples[nextIndex];

    if (!next && timeMs > prev.timestamp) continue;

    activeCount += 1;

    let range = prev.range;
    let azimuth = prev.azimuth;

    if (next && next.timestamp > prev.timestamp) {
      const amount = (timeMs - prev.timestamp) / (next.timestamp - prev.timestamp);
      range = lerp(range, next.range, amount);
      azimuth = lerpAngle(azimuth, next.azimuth, amount);
    }

    const head = egoToXY(range, azimuth);

    if (!isInView(head.x, head.y, range, viewRange)) continue;

    const trail = [];
    const trailStart = lowerBound(samples, timeMs - trailMs);

    for (let i = trailStart; i <= prevIndex; i++) {
      const point = egoToXY(samples[i].range, samples[i].azimuth);

      if (isInView(point.x, point.y, samples[i].range, viewRange)) {
        trail.push(point);
      }
    }

    trail.push(head);

    detections.push({
      radarId: track.radarId,
      trackId: track.trackId,
      range,
      azimuth,
      trail,
      severity: prev.severity,
    });
  }

  return {
    detections,
    activeCount,
    alerts: detections.filter((detection) => detection.severity),
  };
}
