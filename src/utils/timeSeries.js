function bound(samples, timeMs, isBefore, timeOf) {
  let low = 0;
  let high = samples.length;

  while (low < high) {
    const mid = (low + high) >> 1;

    if (isBefore(timeOf(samples[mid]), timeMs)) low = mid + 1;
    else high = mid;
  }

  return low;
}

export function upperBound(samples, timeMs, timeOf = (sample) => sample.timestamp) {
  return bound(samples, timeMs, (time, target) => time <= target, timeOf);
}

export function lowerBound(samples, timeMs, timeOf = (sample) => sample.timestamp) {
  return bound(samples, timeMs, (time, target) => time < target, timeOf);
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function lerpAngle(start, end, amount) {
  const delta = ((end - start + 540) % 360) - 180;
  return start + delta * amount;
}
