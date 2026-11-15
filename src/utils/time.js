export function clampTime(timeMs, startTime, endTime) {
  return Math.max(startTime, Math.min(endTime, timeMs));
}

export function formatSeconds(timeMs) {
  return (timeMs / 1000).toFixed(1);
}
