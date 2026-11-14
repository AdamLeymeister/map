import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Plotly from "plotly.js-dist";

// --------------------------------------------------
// CONFIGURATION
//
// The display is ego-centric. The car sits at the
// origin, 0° azimuth is forward (+Y), and 90° is +X.
// --------------------------------------------------

const VIEW_M = 250;
const STEP_MS = 200;
const TRAIL_MS = 2200;

const INITIAL_RANGE = {
  x: [-VIEW_M, VIEW_M],
  y: [-VIEW_M, VIEW_M],
};

function rangesEqual(a, b) {
  const left = [a.x[0], a.x[1], a.y[0], a.y[1]];
  const right = [b.x[0], b.x[1], b.y[0], b.y[1]];

  return left.every((value, index) => {
    const other = right[index];
    return Math.abs(value - other) <= Math.max(0.05, Math.abs(value) * 0.001);
  });
}

function squareRange(range) {
  const centerX = (range.x[0] + range.x[1]) / 2;
  const centerY = (range.y[0] + range.y[1]) / 2;
  let half = Math.max(range.x[1] - range.x[0], range.y[1] - range.y[0]) / 2;

  half = Math.max(20, Math.min(2000, half));

  const round = (value) => Math.round(value * 100) / 100;

  return {
    x: [round(centerX - half), round(centerX + half)],
    y: [round(centerY - half), round(centerY + half)],
  };
}

function rangeFromRelayout(event, graph) {
  if (!event) return null;

  if (event["xaxis.autorange"] || event["yaxis.autorange"]) {
    return INITIAL_RANGE;
  }

  const full = graph?._fullLayout;
  const x0 = event["xaxis.range[0]"] ?? event["xaxis.range"]?.[0] ?? full?.xaxis?.range?.[0];
  const x1 = event["xaxis.range[1]"] ?? event["xaxis.range"]?.[1] ?? full?.xaxis?.range?.[1];
  const y0 = event["yaxis.range[0]"] ?? event["yaxis.range"]?.[0] ?? full?.yaxis?.range?.[0];
  const y1 = event["yaxis.range[1]"] ?? event["yaxis.range"]?.[1] ?? full?.yaxis?.range?.[1];

  if (![x0, x1, y0, y1].every((value) => Number.isFinite(value))) {
    return null;
  }

  return squareRange({ x: [x0, x1], y: [y0, y1] });
}

function outerRadius(range) {
  return (
    Math.min(
      Math.abs(range.x[0]),
      Math.abs(range.x[1]),
      Math.abs(range.y[0]),
      Math.abs(range.y[1]),
    ) * 0.9
  );
}

function ringRadii(range) {
  const outer = outerRadius(range);
  const rough = outer / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-6)));
  const residual = rough / magnitude;
  const nice = residual >= 7.5 ? 10 : residual >= 3.5 ? 5 : residual >= 1.5 ? 2 : 1;
  const step = nice * magnitude;
  const rings = [];

  for (let radius = step; radius < outer * 0.98 + step * 0.01; radius += step) {
    rings.push(Math.round(radius * 1000) / 1000);
  }

  return rings.length ? rings : [step];
}

const DEMO_SENSORS = [
  { id: "r1", name: "Radar 1", color: "#3498db", symbol: "circle" },
  { id: "r2", name: "Radar 2", color: "#e74c3c", symbol: "diamond" },
  { id: "r3", name: "Radar 3", color: "#2ecc71", symbol: "square" },
];

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function movingTrack({ radarId, trackId, startMs, endMs, rangeAt, azimuthAt }) {
  const messages = [];
  const span = Math.max(1, endMs - startMs);

  for (let timestamp = startMs; timestamp <= endMs; timestamp += STEP_MS) {
    const amount = (timestamp - startMs) / span;

    messages.push({
      id: `${radarId}-${trackId}-${timestamp}`,
      timestamp,
      messageType: "DETECTION",
      trackId,
      body: {
        range: rangeAt(amount),
        azimuth: azimuthAt(amount),
      },
    });
  }

  messages.push({
    id: `${radarId}-${trackId}-end`,
    timestamp: endMs + STEP_MS,
    messageType: "TRACK_END",
    trackId,
    body: {},
  });

  return messages;
}

function withEvents(samples, events) {
  return [...samples, ...events].sort((a, b) => a.timestamp - b.timestamp);
}

// Tracks are range/azimuth from the car. Each one starts at a
// different time, moves, then drops so targets come and go.
const DEMO_MESSAGES = {
  r1: withEvents(
    [
      ...movingTrack({
        radarId: "r1",
        trackId: 101,
        startMs: 0,
        endMs: 6400,
        rangeAt: (amount) => lerp(210, 36, amount),
        azimuthAt: (amount) => lerp(-18, -58, amount),
      }),
      ...movingTrack({
        radarId: "r1",
        trackId: 104,
        startMs: 1600,
        endMs: 4300,
        rangeAt: (amount) => lerp(150, 78, amount),
        azimuthAt: (amount) => lerp(-120, 28, amount),
      }),
    ],
    [
      {
        id: "r1-101-alert",
        timestamp: 2200,
        messageType: "TRACK_ALERT",
        trackId: 101,
        body: { severity: "HIGH" },
      },
      {
        id: "r1-101-clear",
        timestamp: 5200,
        messageType: "ALERT_CLEAR",
        trackId: 101,
        body: {},
      },
    ],
  ),

  r2: withEvents(
    movingTrack({
      radarId: "r2",
      trackId: 202,
      startMs: 2000,
      endMs: 9000,
      rangeAt: (amount) =>
        amount < 0.5
          ? lerp(190, 48, amount / 0.5)
          : lerp(48, 230, (amount - 0.5) / 0.5),
      azimuthAt: (amount) => lerp(35, 128, amount),
    }),
    [
      {
        id: "r2-202-alert",
        timestamp: 5000,
        messageType: "TRACK_ALERT",
        trackId: 202,
        body: { severity: "MEDIUM" },
      },
      {
        id: "r2-202-clear",
        timestamp: 6800,
        messageType: "ALERT_CLEAR",
        trackId: 202,
        body: {},
      },
    ],
  ),

  r3: movingTrack({
    radarId: "r3",
    trackId: 303,
    startMs: 4800,
    endMs: 10800,
    rangeAt: (amount) => lerp(42, 230, amount),
    azimuthAt: (amount) => lerp(175, 205, amount),
  }),
};

// --------------------------------------------------
// COORDINATE UTILITIES
// --------------------------------------------------

function egoToXY(range, azimuth) {
  const angle = (azimuth * Math.PI) / 180;

  return {
    x: range * Math.sin(angle),
    y: range * Math.cos(angle),
  };
}

function lerpAngle(start, end, amount) {
  const delta = ((end - start + 540) % 360) - 180;
  return start + delta * amount;
}

function createLine(x, y, color, width = 1.5, dash = "solid") {
  return {
    type: "scatter",
    mode: "lines",
    x,
    y,
    line: {
      color,
      width,
      dash,
    },
    hoverinfo: "skip",
    showlegend: false,
  };
}

function createRing(radius, isOuter) {
  const x = [];
  const y = [];

  for (let i = 0; i <= 90; i++) {
    const angle = (i / 90) * Math.PI * 2;
    x.push(radius * Math.cos(angle));
    y.push(radius * Math.sin(angle));
  }

  return createLine(x, y, isOuter ? "#475569" : "#334155", 1);
}

function createAzimuthScale(outer, inner) {
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

function createAzimuthLabels(outer) {
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
    textfont: {
      color: "#94a3b8",
      size: 11,
    },
    cliponaxis: false,
    hoverinfo: "skip",
    showlegend: false,
  };
}

function createRingLabels(radii) {
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
    textfont: {
      color: "#64748b",
      size: 10,
    },
    hoverinfo: "skip",
    showlegend: false,
  };
}

function createCarTraces(lengthM) {
  // Screen-sized icon. Ring and track coordinates stay in true meters.
  const scale = lengthM / 64;
  const sx = (value) => value * scale;
  const body = {
    type: "scatter",
    mode: "lines",
    x: [0, 10, 10, 16, 16, 10, 10, 16, 16, 10, 10, -10, -10, -16, -16, -10, -10, -16, -16, -10, -10, 0].map(sx),
    y: [34, 28, 18, 18, 8, 8, -6, -6, -16, -16, -30, -30, -16, -16, -6, -6, 8, 8, 18, 18, 28, 34].map(sx),
    fill: "toself",
    fillcolor: "#e2e8f0",
    line: {
      color: "#38bdf8",
      width: 2,
    },
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
    line: {
      color: "#0284c7",
      width: 1,
    },
    hoverinfo: "skip",
    showlegend: false,
  };

  return [body, cabin];
}

// --------------------------------------------------
// TIMELINE SNAPSHOT
//
// Detections are interpolated between samples so a
// track slides instead of jumping. TRACK_END drops it.
// --------------------------------------------------

function getSnapshot(messagesByRadar, timeMs) {
  const tracks = new Map();

  function ensure(radarId, trackId) {
    const key = `${radarId}:${trackId}`;
    let track = tracks.get(key);

    if (!track) {
      track = {
        key,
        radarId,
        trackId,
        samples: [],
        ended: false,
        alert: null,
      };
      tracks.set(key, track);
    }

    return track;
  }

  for (const [radarId, messages] of Object.entries(messagesByRadar || {})) {
    if (!Array.isArray(messages)) continue;

    const ordered = [...messages].sort((a, b) => a.timestamp - b.timestamp);

    for (const msg of ordered) {
      if (msg.trackId == null) continue;

      const track = ensure(radarId, msg.trackId);

      if (msg.messageType === "DETECTION") {
        track.samples.push(msg);
        continue;
      }

      if (msg.timestamp > timeMs) continue;

      if (msg.messageType === "TRACK_END") {
        track.ended = true;
      } else if (msg.messageType === "TRACK_ALERT") {
        track.alert = msg;
      } else if (msg.messageType === "ALERT_CLEAR") {
        track.alert = null;
      }
    }
  }

  const detections = [];

  for (const track of tracks.values()) {
    if (track.ended || !track.samples.length) continue;

    track.samples.sort((a, b) => a.timestamp - b.timestamp);

    let prevIndex = -1;

    for (let i = 0; i < track.samples.length; i++) {
      if (track.samples[i].timestamp <= timeMs) prevIndex = i;
      else break;
    }

    if (prevIndex < 0) continue;

    const prev = track.samples[prevIndex];
    const next = track.samples[prevIndex + 1];
    let range = prev.body?.range;
    let azimuth = prev.body?.azimuth;

    if (!Number.isFinite(range) || !Number.isFinite(azimuth)) continue;

    if (
      next &&
      next.timestamp > prev.timestamp &&
      Number.isFinite(next.body?.range) &&
      Number.isFinite(next.body?.azimuth)
    ) {
      const amount =
        (timeMs - prev.timestamp) / (next.timestamp - prev.timestamp);
      range = lerp(range, next.body.range, amount);
      azimuth = lerpAngle(azimuth, next.body.azimuth, amount);
    }

    const trail = [];

    for (let i = 0; i <= prevIndex; i++) {
      const sample = track.samples[i];
      if (sample.timestamp < timeMs - TRAIL_MS) continue;
      if (!Number.isFinite(sample.body?.range)) continue;
      trail.push(egoToXY(sample.body.range, sample.body.azimuth));
    }

    trail.push(egoToXY(range, azimuth));

    detections.push({
      radarId: track.radarId,
      trackId: track.trackId,
      range,
      azimuth,
      trail,
      alert: track.alert,
    });
  }

  return {
    detections,
    alerts: detections.filter((detection) => detection.alert),
  };
}

function createTrackTrace(sensor, detection) {
  const point = egoToXY(detection.range, detection.azimuth);

  return {
    type: "scatter",
    mode: "markers+text",
    x: [point.x],
    y: [point.y],
    text: [`${detection.trackId}`],
    textposition: "top center",
    textfont: {
      color: sensor.color,
      size: 12,
    },
    marker: {
      size: 12,
      symbol: sensor.symbol || "circle",
      color: sensor.color,
      line: {
        color: "#f8fafc",
        width: 1,
      },
    },
    hovertemplate: `${sensor.name}<br>Track ${detection.trackId}<br>Range: ${detection.range.toFixed(0)} m<br>Azimuth: ${detection.azimuth.toFixed(0)}°<extra></extra>`,
    showlegend: false,
  };
}

function createAlertTrace(detection) {
  const point = egoToXY(detection.range, detection.azimuth);
  const severity = detection.alert?.body?.severity || "UNKNOWN";

  return {
    type: "scatter",
    mode: "markers",
    x: [point.x],
    y: [point.y],
    marker: {
      size: 28,
      symbol: "circle-open",
      color: "#ef4444",
      line: {
        width: 2,
      },
    },
    hovertemplate: `Severity: ${severity}<extra></extra>`,
    showlegend: false,
  };
}

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function RadarPlot({
  sensors = DEMO_SENSORS,
  messages = DEMO_MESSAGES,
  durationMs = 12000,
  timeMs: controlledTime,
  onTimeChange,
}) {
  const graphRef = useRef(null);
  const plotQueue = useRef(Promise.resolve());

  const [localTime, setLocalTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [showRings, setShowRings] = useState(true);
  const [showAzimuth, setShowAzimuth] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showBearings, setShowBearings] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [viewRange, setViewRange] = useState(INITIAL_RANGE);

  const timeMs = controlledTime ?? localTime;
  const onRelayout = useRef(() => {});
  const applyingRange = useRef(false);

  onRelayout.current = (event) => {
    if (applyingRange.current) return;

    const next = rangeFromRelayout(event, graphRef.current);

    if (!next) return;

    setViewRange((current) => (rangesEqual(current, next) ? current : next));
  };

  const updateTime = useCallback(
    (next) => {
      const value = Math.max(0, Math.min(durationMs, next));

      if (controlledTime === undefined) {
        setLocalTime(value);
      }

      onTimeChange?.(value);
    },
    [controlledTime, durationMs, onTimeChange],
  );

  useEffect(() => {
    if (!playing) return;

    let frameId;
    let previousTime;

    function tick(now) {
      if (previousTime !== undefined) {
        const delta = now - previousTime;
        const next = Math.min(durationMs, timeMsRef.current + delta);

        updateTime(next);

        if (next >= durationMs) {
          setPlaying(false);
          return;
        }
      }

      previousTime = now;
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [playing, durationMs, updateTime]);

  const timeMsRef = useRef(timeMs);
  timeMsRef.current = timeMs;

  const sensorById = useMemo(() => {
    return Object.fromEntries(sensors.map((sensor) => [sensor.id, sensor]));
  }, [sensors]);

  const snapshot = useMemo(() => {
    return getSnapshot(messages, timeMs);
  }, [messages, timeMs]);

  const radii = useMemo(() => ringRadii(viewRange), [viewRange]);
  const viewSpan = viewRange.x[1] - viewRange.x[0];
  const carLength = Math.max(viewSpan * 0.07, 1);
  const spokeInner = Math.min(carLength * 0.6, outerRadius(viewRange) * 0.35);

  const traces = useMemo(() => {
    const result = [];
    const outer = radii[radii.length - 1];

    if (showRings) {
      radii.forEach((radius, index) => {
        result.push(createRing(radius, index === radii.length - 1));
      });

      result.push(createRingLabels(radii));
    }

    if (showAzimuth && outer) {
      result.push(createAzimuthScale(outer, Math.max(spokeInner, outer * 0.08)));
      result.push(createAzimuthLabels(outer));
    }

    for (const detection of snapshot.detections) {
      const sensor = sensorById[detection.radarId] || {
        id: detection.radarId,
        name: String(detection.radarId),
        color: "#f59e0b",
        symbol: "circle",
      };

      if (showTrails && detection.trail.length > 1) {
        result.push(
          createLine(
            detection.trail.map((point) => point.x),
            detection.trail.map((point) => point.y),
            sensor.color,
            2,
          ),
        );
      }

      if (showBearings) {
        const origin = egoToXY(
          Math.min(spokeInner, detection.range),
          detection.azimuth,
        );
        const target = egoToXY(detection.range, detection.azimuth);

        result.push(
          createLine(
            [origin.x, target.x],
            [origin.y, target.y],
            sensor.color,
            1,
            "dot",
          ),
        );
      }

      if (showAlerts && detection.alert) {
        result.push(createAlertTrace(detection));
      }

      result.push(createTrackTrace(sensor, detection));
    }

    result.push(...createCarTraces(carLength));

    return result;
  }, [
    sensorById,
    snapshot,
    showRings,
    showAzimuth,
    showTrails,
    showBearings,
    showAlerts,
    radii,
    spokeInner,
    carLength,
  ]);

  const layout = useMemo(
    () => ({
      autosize: true,
      margin: {
        l: 48,
        r: 48,
        t: 48,
        b: 48,
      },
      paper_bgcolor: "#0f172a",
      plot_bgcolor: "#0f172a",
      font: {
        color: "#e2e8f0",
      },
      xaxis: {
        title: "X (meters)",
        range: viewRange.x,
        gridcolor: "#1e293b",
        zerolinecolor: "#334155",
        fixedrange: false,
      },
      yaxis: {
        title: "Y (meters)",
        range: viewRange.y,
        gridcolor: "#1e293b",
        zerolinecolor: "#334155",
        fixedrange: false,
      },
      showlegend: false,
      hovermode: "closest",
    }),
    [viewRange],
  );

  const plotConfig = useMemo(
    () => ({
      responsive: true,
      displayModeBar: false,
      scrollZoom: true,
    }),
    [],
  );

  useEffect(() => {
    const el = graphRef.current;
    if (!el) return undefined;

    let active = true;

    plotQueue.current = plotQueue.current
      .then(() => {
        const el = graphRef.current;

        if (!active || !el) return undefined;

        applyingRange.current = true;

        return Plotly.react(el, traces, layout, plotConfig)
          .then(() => {
            if (!active || !el.on) return;

            if (el._onRange) {
              el.removeListener("plotly_relayout", el._onRange);
            }

            const handler = (event) => onRelayout.current(event);
            el.on("plotly_relayout", handler);
            el._onRange = handler;
          })
          .finally(() => {
            applyingRange.current = false;
          });
      })
      .catch((error) => {
        if (active) console.error(error);
      });

    return () => {
      active = false;
    };
  }, [traces, layout, plotConfig]);

  useEffect(() => {
    const el = graphRef.current;
    return () => {
      if (el) Plotly.purge(el);
    };
  }, []);

  function zoom(factor) {
    setViewRange((current) => {
      const centerX = (current.x[0] + current.x[1]) / 2;
      const centerY = (current.y[0] + current.y[1]) / 2;
      const half = ((current.x[1] - current.x[0]) * factor) / 2;

      return squareRange({
        x: [centerX - half, centerX + half],
        y: [centerY - half, centerY + half],
      });
    });
  }

  function resetZoom() {
    setViewRange(INITIAL_RANGE);
  }

  const zoomLabel = `${Math.round(((VIEW_M * 2) / viewSpan) * 100)}%`;

  const buttonStyle = {
    background: "#1e293b",
    color: "#f8fafc",
    border: "1px solid #475569",
    borderRadius: 6,
    padding: "7px 11px",
    cursor: "pointer",
    fontSize: 14,
  };

  const checkboxStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 13,
  };

  return (
    <div
      style={{
        background: "#0f172a",
        color: "#e2e8f0",
        borderRadius: 12,
        padding: 14,
        fontFamily: "system-ui, sans-serif",
      }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}>
        <strong>Radar Range / Azimuth Display</strong>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button style={buttonStyle} onClick={() => zoom(1.25)}>
            −
          </button>
          <button style={buttonStyle} onClick={resetZoom}>
            Reset
          </button>
          <button style={buttonStyle} onClick={() => zoom(0.8)}>
            +
          </button>
          <span style={{ minWidth: 45, textAlign: "right" }}>{zoomLabel}</span>
        </div>
      </div>

      <div
        ref={graphRef}
        style={{ width: "min(100%, 680px)", aspectRatio: "1", margin: "0 auto" }}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 8,
          fontSize: 12,
        }}>
        {sensors.map((sensor) => (
          <span key={sensor.id} style={{ color: sensor.color }}>
            {sensor.name}
          </span>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 14,
        }}>
        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={showRings}
            onChange={(e) => setShowRings(e.target.checked)}
          />
          Range rings
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={showAzimuth}
            onChange={(e) => setShowAzimuth(e.target.checked)}
          />
          Azimuth
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={showTrails}
            onChange={(e) => setShowTrails(e.target.checked)}
          />
          Trails
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={showBearings}
            onChange={(e) => setShowBearings(e.target.checked)}
          />
          Bearing lines
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={showAlerts}
            onChange={(e) => setShowAlerts(e.target.checked)}
          />
          Alerts
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          style={buttonStyle}
          onClick={() => {
            if (timeMs >= durationMs) {
              updateTime(0);
            }

            setPlaying((p) => !p);
          }}>
          {playing ? "Pause" : "Play"}
        </button>

        <input
          type="range"
          min="0"
          max={durationMs}
          step="100"
          value={timeMs}
          onChange={(e) => updateTime(Number(e.target.value))}
          style={{ flex: 1, minWidth: 100 }}
        />

        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            minWidth: 90,
            textAlign: "right",
            fontSize: 13,
          }}>
          {(timeMs / 1000).toFixed(1)}
          {" / "}
          {(durationMs / 1000).toFixed(1)} s
        </span>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
        Active tracks: {snapshot.detections.length}
        {" | "}
        Active alerts: {snapshot.alerts.length}
      </div>
    </div>
  );
}
