const DEFAULT_LIMITS = {
  minHalf: 20,
  maxHalf: 2000,
};

function round(value) {
  return Math.round(value * 100) / 100;
}

export function rangesEqual(a, b) {
  const left = [a.x[0], a.x[1], a.y[0], a.y[1]];
  const right = [b.x[0], b.x[1], b.y[0], b.y[1]];

  return left.every((value, index) => {
    const other = right[index];
    return Math.abs(value - other) <= Math.max(0.05, Math.abs(value) * 0.001);
  });
}

export function squareRange(range, limits = DEFAULT_LIMITS) {
  const { minHalf, maxHalf } = { ...DEFAULT_LIMITS, ...limits };
  const centerX = (range.x[0] + range.x[1]) / 2;
  const centerY = (range.y[0] + range.y[1]) / 2;
  let half = Math.max(range.x[1] - range.x[0], range.y[1] - range.y[0]) / 2;

  half = Math.max(minHalf, Math.min(maxHalf, half));

  return {
    x: [round(centerX - half), round(centerX + half)],
    y: [round(centerY - half), round(centerY + half)],
  };
}

export function rangeFromRelayout(event, graph, fallbackRange, limits = DEFAULT_LIMITS) {
  if (!event) return null;

  if (event["xaxis.autorange"] || event["yaxis.autorange"]) {
    return fallbackRange;
  }

  const full = graph?._fullLayout;
  const x0 = event["xaxis.range[0]"] ?? event["xaxis.range"]?.[0] ?? full?.xaxis?.range?.[0];
  const x1 = event["xaxis.range[1]"] ?? event["xaxis.range"]?.[1] ?? full?.xaxis?.range?.[1];
  const y0 = event["yaxis.range[0]"] ?? event["yaxis.range"]?.[0] ?? full?.yaxis?.range?.[0];
  const y1 = event["yaxis.range[1]"] ?? event["yaxis.range"]?.[1] ?? full?.yaxis?.range?.[1];

  if (![x0, x1, y0, y1].every((value) => Number.isFinite(value))) {
    return null;
  }

  return squareRange({ x: [x0, x1], y: [y0, y1] }, limits);
}

export function zoomRange(current, factor, limits = DEFAULT_LIMITS) {
  const centerX = (current.x[0] + current.x[1]) / 2;
  const centerY = (current.y[0] + current.y[1]) / 2;
  const half = ((current.x[1] - current.x[0]) * factor) / 2;

  return squareRange(
    {
      x: [centerX - half, centerX + half],
      y: [centerY - half, centerY + half],
    },
    limits,
  );
}
