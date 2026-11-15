import { egoToXY } from "./coordinates";
import { outerRadius, ringRadii } from "./geometry";

export function createLine(x, y, color, width = 1.5, dash = "solid") {
  return {
    type: "scatter",
    mode: "lines",
    x,
    y,
    line: { color, width, dash },
    hoverinfo: "skip",
    showlegend: false,
  };
}

export function createRing(radius, isOuter) {
  const x = [];
  const y = [];

  for (let i = 0; i <= 90; i++) {
    const angle = (i / 90) * Math.PI * 2;
    x.push(radius * Math.cos(angle));
    y.push(radius * Math.sin(angle));
  }

  return createLine(x, y, isOuter ? "#475569" : "#334155", 1);
}

export function createAzimuthScale(outer, inner) {
  const x = [];
  const y = [];

  for (let deg = 0; deg < 360; deg += 10) {
    const major = deg % 30 === 0;
    const start = egoToXY(major ? inner : outer * 0.96, deg);
    const end = egoToXY(outer, deg);

    x.push(start.x, end.x, null);
    y.push(start.y, end.y, null);
  }

  return createLine(x, y, "#64748b", 1);
}

export function createAzimuthLabels(outer) {
  const x = [];
  const y = [];
  const text = [];

  for (let deg = 0; deg < 360; deg += 30) {
    const point = egoToXY(outer * 0.97, deg);
    x.push(point.x);
    y.push(point.y);
    text.push(`${deg}°`);
  }

  return {
    type: "scatter",
    mode: "text",
    x,
    y,
    text,
    textfont: { color: "#94a3b8", size: 11 },
    cliponaxis: false,
    hoverinfo: "skip",
    showlegend: false,
  };
}

export function createRingLabels(radii) {
  const x = [];
  const y = [];
  const text = [];

  for (const radius of radii) {
    const point = egoToXY(radius, 100);
    x.push(point.x);
    y.push(point.y);
    text.push(`${radius}m`);
  }

  return {
    type: "scatter",
    mode: "text",
    x,
    y,
    text,
    textposition: "top right",
    textfont: { color: "#64748b", size: 10 },
    hoverinfo: "skip",
    showlegend: false,
  };
}

export function createCarTraces(lengthM) {
  const scale = lengthM / 64;
  const sx = (value) => value * scale;
  const body = {
    type: "scatter",
    mode: "lines",
    x: [0, 10, 10, 16, 16, 10, 10, 16, 16, 10, 10, -10, -10, -16, -16, -10, -10, -16, -16, -10, -10, 0].map(sx),
    y: [34, 28, 18, 18, 8, 8, -6, -6, -16, -16, -30, -30, -16, -16, -6, -6, 8, 8, 18, 18, 28, 34].map(sx),
    fill: "toself",
    fillcolor: "#e2e8f0",
    line: { color: "#38bdf8", width: 2 },
    hovertemplate: "Ego vehicle<extra></extra>",
    showlegend: false,
  };
  const cabin = {
    type: "scatter",
    mode: "lines",
    x: [7, 7, -7, -7, 7].map(sx),
    y: [16, -2, -2, 16, 16].map(sx),
    fill: "toself",
    fillcolor: "#38bdf8",
    line: { color: "#0284c7", width: 1 },
    hoverinfo: "skip",
    showlegend: false,
  };

  return [body, cabin];
}

export function createTrackTrace(sensor, detection) {
  const point = egoToXY(detection.range, detection.azimuth);

  return {
    type: "scatter",
    mode: "markers+text",
    x: [point.x],
    y: [point.y],
    text: [`${detection.trackId}`],
    textposition: "top center",
    textfont: { color: sensor.color, size: 12 },
    marker: {
      size: 12,
      symbol: sensor.symbol || "circle",
      color: sensor.color,
      line: { color: "#f8fafc", width: 1 },
    },
    hovertemplate: `${sensor.name}<br>Track ${detection.trackId}<br>Range: ${detection.range.toFixed(0)} m<br>Azimuth: ${detection.azimuth.toFixed(0)}°<extra></extra>`,
    showlegend: false,
  };
}

export function createAlertTrace(detection) {
  const point = egoToXY(detection.range, detection.azimuth);
  const severity = detection.severity || "UNKNOWN";

  return {
    type: "scatter",
    mode: "markers",
    x: [point.x],
    y: [point.y],
    marker: {
      size: 28,
      symbol: "circle-open",
      color: "#ef4444",
      line: { width: 2 },
    },
    hovertemplate: `Severity: ${severity}<extra></extra>`,
    showlegend: false,
  };
}

function sensorFor(sensorById, radarId) {
  return (
    sensorById[radarId] || {
      id: radarId,
      name: String(radarId),
      color: "#f59e0b",
      symbol: "circle",
    }
  );
}

export function buildRadarTraces({ snapshot, sensorById, viewRange, layers }) {
  const result = [];
  const radii = ringRadii(viewRange);
  const outer = radii[radii.length - 1];
  const viewSpan = viewRange.x[1] - viewRange.x[0];
  const carLength = Math.max(viewSpan * 0.07, 1);
  const spokeInner = Math.min(carLength * 0.6, outerRadius(viewRange) * 0.35);

  if (layers.rings) {
    radii.forEach((radius, index) => {
      result.push(createRing(radius, index === radii.length - 1));
    });
    result.push(createRingLabels(radii));
  }

  if (layers.azimuth && outer) {
    result.push(createAzimuthScale(outer, Math.max(spokeInner, outer * 0.08)));
    result.push(createAzimuthLabels(outer));
  }

  for (const detection of snapshot.detections) {
    const sensor = sensorFor(sensorById, detection.radarId);

    if (layers.trails && detection.trail.length > 1) {
      result.push(
        createLine(
          detection.trail.map((point) => point.x),
          detection.trail.map((point) => point.y),
          sensor.color,
          2,
        ),
      );
    }

    if (layers.bearings) {
      const origin = egoToXY(Math.min(spokeInner, detection.range), detection.azimuth);
      const target = egoToXY(detection.range, detection.azimuth);

      result.push(createLine([origin.x, target.x], [origin.y, target.y], sensor.color, 1, "dot"));
    }

    if (layers.alerts && detection.severity) {
      result.push(createAlertTrace(detection));
    }

    result.push(createTrackTrace(sensor, detection));
  }

  result.push(...createCarTraces(carLength));

  return result;
}
