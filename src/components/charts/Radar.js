import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-dist";

const Plot = createPlotlyComponent(Plotly);

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const INITIAL_RANGE = {
  x: [-50, 350],
  y: [-50, 300],
};

const RANGE_RINGS = [50, 100, 150];

// Custom SVG marker paths.
// You can replace these with your own SVG paths.
const SENSOR_SYMBOLS = {
  r1: "M0 -12 L10 9 L0 4 L-10 9 Z",
  r2: "M-10 -10 L10 -10 L10 10 L-10 10 Z",
  r3: "M0 -12 L12 0 L0 12 L-12 0 Z",
};

// All coordinates are in meters.
// Heading: 0° = +Y, 90° = +X.
const DEMO_SENSORS = [
  {
    id: "r1",
    name: "Radar 1",
    x: 20,
    y: 20,
    heading: 0,
    color: "#3498db",
  },
  {
    id: "r2",
    name: "Radar 2",
    x: 280,
    y: 30,
    heading: -45,
    color: "#e74c3c",
  },
  {
    id: "r3",
    name: "Radar 3",
    x: 130,
    y: 210,
    heading: 160,
    color: "#2ecc71",
  },
];

// --------------------------------------------------
// DEMO API RESPONSE
//
// Messages are grouped by radar ID.
// Each radar's array must be sorted by timestamp.
// Timestamps are relative milliseconds in this demo.
// --------------------------------------------------

const DEMO_MESSAGES = {
  r1: [
    {
      id: "r1-1001",
      timestamp: 0,
      messageType: "DETECTION",
      trackId: 101,
      body: {
        range: 145,
        azimuth: 42,
      },
    },
    {
      id: "r1-1002",
      timestamp: 3000,
      messageType: "TRACK_ALERT",
      trackId: 101,
      body: {
        range: 145,
        azimuth: 42,
        severity: "HIGH",
      },
    },
    {
      id: "r1-1003",
      timestamp: 6500,
      messageType: "ALERT_CLEAR",
      trackId: 101,
      body: {},
    },
  ],

  r2: [
    {
      id: "r2-1001",
      timestamp: 1000,
      messageType: "DETECTION",
      trackId: 101,
      body: {
        range: 171,
        azimuth: -10,
      },
    },
    {
      id: "r2-1002",
      timestamp: 7500,
      messageType: "DETECTION",
      trackId: 101,
      body: {
        range: 160,
        azimuth: -4,
      },
    },
  ],

  r3: [
    {
      id: "r3-1001",
      timestamp: 2000,
      messageType: "DETECTION",
      trackId: 102,
      body: {
        range: 110,
        azimuth: 20,
      },
    },
    {
      id: "r3-1002",
      timestamp: 9000,
      messageType: "STATUS",
      body: {
        operational: false,
      },
    },
    {
      id: "r3-1003",
      timestamp: 11500,
      messageType: "STATUS",
      body: {
        operational: true,
      },
    },
  ],
};

const DEMO_TRACKS = [
  {
    id: 101,
    x: 120,
    y: 125,
    label: "Fused 101",
  },
  {
    id: 102,
    x: 168,
    y: 108,
    label: "Fused 102",
  },
];

// --------------------------------------------------
// COORDINATE UTILITIES
// --------------------------------------------------

function toXY(sensor, range, azimuth) {
  const angle = ((sensor.heading + azimuth) * Math.PI) / 180;

  return {
    x: sensor.x + range * Math.sin(angle),
    y: sensor.y + range * Math.cos(angle),
  };
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

function createRangeRing(sensor, radius) {
  const x = [];
  const y = [];

  for (let i = 0; i <= 72; i++) {
    const angle = (i * Math.PI) / 36;

    x.push(sensor.x + radius * Math.cos(angle));

    y.push(sensor.y + radius * Math.sin(angle));
  }

  return createLine(x, y, sensor.color, 1, "dot");
}

function createAzimuthArc(sensor, azimuth, radius = 25) {
  const steps = Math.max(2, Math.ceil(Math.abs(azimuth) / 3));

  const x = [];
  const y = [];

  for (let i = 0; i <= steps; i++) {
    const angle = ((sensor.heading + (azimuth * i) / steps) * Math.PI) / 180;

    x.push(sensor.x + radius * Math.sin(angle));

    y.push(sensor.y + radius * Math.cos(angle));
  }

  return createLine(x, y, "#f59e0b", 2);
}

// --------------------------------------------------
// TIMELINE SNAPSHOT
//
// Input:
// {
//   r1: [...],
//   r2: [...],
//   r3: [...]
// }
//
// Output:
// {
//   detections: [],
//   alerts: [],
//   status: Map
// }
//
// The radarId is added internally so the original
// API messages do not need that field.
// --------------------------------------------------

function getSnapshot(messagesByRadar, timeMs) {
  const detections = new Map();
  const alerts = new Map();
  const status = new Map();

  for (const [radarId, messages] of Object.entries(messagesByRadar || {})) {
    if (!Array.isArray(messages)) continue;

    for (const msg of messages) {
      if (msg.timestamp > timeMs) {
        break;
      }

      const key = `${radarId}:${msg.trackId}`;

      switch (msg.messageType) {
        case "DETECTION":
          detections.set(key, {
            ...msg,
            radarId,
          });
          break;

        case "TRACK_ALERT":
          alerts.set(key, {
            ...msg,
            radarId,
          });
          break;

        case "ALERT_CLEAR":
          alerts.delete(key);
          break;

        case "STATUS":
          status.set(radarId, msg.body);
          break;

        default:
          break;
      }
    }
  }

  return {
    detections: [...detections.values()],
    alerts: [...alerts.values()],
    status,
  };
}

// --------------------------------------------------
// PLOTLY TRACE BUILDERS
// --------------------------------------------------

function createSensorTrace(sensor, operational) {
  return {
    type: "scatter",
    mode: "markers+text",

    x: [sensor.x],
    y: [sensor.y],

    text: [sensor.name + (operational ? "" : " OFFLINE")],

    textposition: "bottom center",

    textfont: {
      color: operational ? sensor.color : "#94a3b8",
      size: 12,
    },

    marker: {
      symbol: SENSOR_SYMBOLS[sensor.id] || "diamond",

      size: 22,

      color: operational ? sensor.color : "#64748b",

      line: {
        color: "#ffffff",
        width: 1,
      },
    },

    hovertemplate:
      `${sensor.name}` +
      `<br>X: ${sensor.x} m` +
      `<br>Y: ${sensor.y} m` +
      `<br>Heading: ${sensor.heading}°` +
      "<extra></extra>",

    showlegend: false,
  };
}

function createDetectionTrace(sensor, message) {
  const { range, azimuth } = message.body;

  const target = toXY(sensor, range, azimuth);

  return {
    type: "scatter",
    mode: "markers",

    x: [target.x],
    y: [target.y],

    marker: {
      size: 10,
      color: sensor.color,
      symbol: "circle",
    },

    customdata: [[sensor.name, range, azimuth, message.trackId ?? "N/A"]],

    hovertemplate:
      "%{customdata[0]}" +
      "<br>Range: %{customdata[1]:.1f} m" +
      "<br>Azimuth: %{customdata[2]:.1f}°" +
      "<br>Track: %{customdata[3]}" +
      "<extra></extra>",

    showlegend: false,
  };
}

function createAlertTrace(sensor, message) {
  const { range, azimuth, severity } = message.body;

  const target = toXY(sensor, range, azimuth);

  return {
    type: "scatter",
    mode: "markers+text",

    x: [target.x],
    y: [target.y],

    text: [`ALERT ${message.trackId}`],
    textposition: "bottom center",

    textfont: {
      color: "#ef4444",
      size: 12,
    },

    marker: {
      size: 28,
      symbol: "circle-open",
      color: "#ef4444",
      line: {
        width: 2,
      },
    },

    hovertemplate: `Severity: ${severity || "UNKNOWN"}` + "<extra></extra>",

    showlegend: false,
  };
}

function createFusedTrackTrace(tracks) {
  return {
    type: "scatter",
    mode: "markers+text",

    x: tracks.map((t) => t.x),
    y: tracks.map((t) => t.y),

    text: tracks.map((t) => t.label || `Track ${t.id}`),

    textposition: "top center",

    marker: {
      size: 12,
      color: "#f59e0b",
      line: {
        color: "#92400e",
        width: 1,
      },
    },

    hovertemplate:
      "X: %{x:.1f} m" + "<br>Y: %{y:.1f} m" + "<extra>Fused track</extra>",

    showlegend: false,
  };
}

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function RadarPlot({
  sensors = DEMO_SENSORS,
  messages = DEMO_MESSAGES,
  tracks = DEMO_TRACKS,
  durationMs = 12000,
  timeMs: controlledTime,
  onTimeChange,
}) {
  const graphRef = useRef(null);

  const [localTime, setLocalTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [showRings, setShowRings] = useState(true);
  const [showBearings, setShowBearings] = useState(true);
  const [showAzimuthArcs, setShowAzimuthArcs] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showConnections, setShowConnections] = useState(false);

  const [zoomLabel, setZoomLabel] = useState("100%");

  const timeMs = controlledTime ?? localTime;

  // ------------------------------------------------
  // PLAYBACK
  // ------------------------------------------------

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

  // ------------------------------------------------
  // SENSOR LOOKUP
  // ------------------------------------------------

  const sensorById = useMemo(() => {
    return Object.fromEntries(sensors.map((sensor) => [sensor.id, sensor]));
  }, [sensors]);

  // ------------------------------------------------
  // GET CURRENT TIMELINE STATE
  // ------------------------------------------------

  const snapshot = useMemo(() => {
    return getSnapshot(messages, timeMs);
  }, [messages, timeMs]);

  // ------------------------------------------------
  // BUILD PLOTLY DATA
  // ------------------------------------------------

  const traces = useMemo(() => {
    const result = [];

    // 1. Sensor range rings and headings.
    for (const sensor of sensors) {
      if (showRings) {
        for (const radius of RANGE_RINGS) {
          result.push(createRangeRing(sensor, radius));
        }
      }

      const forward = toXY(sensor, 30, 0);

      result.push(
        createLine(
          [sensor.x, forward.x],
          [sensor.y, forward.y],
          sensor.color,
          2,
        ),
      );
    }

    // 2. Detections from each radar.
    for (const message of snapshot.detections) {
      const sensor = sensorById[message.radarId];

      if (!sensor) continue;

      const { range, azimuth } = message.body || {};

      if (!Number.isFinite(range) || !Number.isFinite(azimuth)) {
        continue;
      }

      const target = toXY(sensor, range, azimuth);

      if (showBearings) {
        result.push(
          createLine(
            [sensor.x, target.x],
            [sensor.y, target.y],
            sensor.color,
            1.8,
            "dash",
          ),
        );
      }

      if (showAzimuthArcs) {
        result.push(createAzimuthArc(sensor, azimuth));
      }

      result.push(createDetectionTrace(sensor, message));
    }

    // 3. Sensor-to-fused-track connections.
    if (showConnections) {
      for (const message of snapshot.detections) {
        const sensor = sensorById[message.radarId];

        const track = tracks.find((t) => t.id === message.trackId);

        if (!sensor || !track) continue;

        result.push(
          createLine(
            [sensor.x, track.x],
            [sensor.y, track.y],
            sensor.color,
            1,
            "dot",
          ),
        );
      }
    }

    // 4. Fused tracks.
    result.push(createFusedTrackTrace(tracks));

    // 5. Transient alert overlays.
    if (showAlerts) {
      for (const message of snapshot.alerts) {
        const sensor = sensorById[message.radarId];

        if (!sensor) continue;

        if (
          !Number.isFinite(message.body?.range) ||
          !Number.isFinite(message.body?.azimuth)
        ) {
          continue;
        }

        result.push(createAlertTrace(sensor, message));
      }
    }

    // 6. Custom sensor markers.
    for (const sensor of sensors) {
      const sensorStatus = snapshot.status.get(sensor.id);

      const operational = sensorStatus?.operational !== false;

      result.push(createSensorTrace(sensor, operational));
    }

    return result;
  }, [
    sensors,
    tracks,
    sensorById,
    snapshot,
    showRings,
    showBearings,
    showAzimuthArcs,
    showAlerts,
    showConnections,
  ]);

  // ------------------------------------------------
  // PLOTLY LAYOUT
  // ------------------------------------------------

  const layout = useMemo(
    () => ({
      autosize: true,

      margin: {
        l: 60,
        r: 20,
        t: 25,
        b: 55,
      },

      paper_bgcolor: "#0f172a",
      plot_bgcolor: "#0f172a",

      font: {
        color: "#e2e8f0",
      },

      xaxis: {
        title: "X (meters)",
        range: INITIAL_RANGE.x,
        gridcolor: "#263448",
        zerolinecolor: "#475569",
        constrain: "domain",
      },

      yaxis: {
        title: "Y (meters)",
        range: INITIAL_RANGE.y,
        gridcolor: "#263448",
        zerolinecolor: "#475569",
        scaleanchor: "x",
        scaleratio: 1,
      },

      showlegend: false,
      hovermode: "closest",

      // Preserve zoom while the data changes.
      uirevision: "radar-view",
    }),
    [],
  );

  // ------------------------------------------------
  // ZOOM CONTROLS
  // ------------------------------------------------

  async function zoom(factor) {
    const graph = graphRef.current;

    if (!graph) return;

    const x = graph._fullLayout.xaxis.range;
    const y = graph._fullLayout.yaxis.range;

    const centerX = (x[0] + x[1]) / 2;
    const centerY = (y[0] + y[1]) / 2;

    const halfWidth = ((x[1] - x[0]) * factor) / 2;

    const halfHeight = ((y[1] - y[0]) * factor) / 2;

    await Plotly.relayout(graph, {
      "xaxis.range": [centerX - halfWidth, centerX + halfWidth],

      "yaxis.range": [centerY - halfHeight, centerY + halfHeight],
    });

    const originalWidth = INITIAL_RANGE.x[1] - INITIAL_RANGE.x[0];

    const currentWidth = halfWidth * 2;

    setZoomLabel(`${Math.round((originalWidth / currentWidth) * 100)}%`);
  }

  async function resetZoom() {
    if (!graphRef.current) return;

    await Plotly.relayout(graphRef.current, {
      "xaxis.range": [...INITIAL_RANGE.x],
      "yaxis.range": [...INITIAL_RANGE.y],
    });

    setZoomLabel("100%");
  }

  // ------------------------------------------------
  // UI STYLES
  // ------------------------------------------------

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

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------

  return (
    <div
      style={{
        background: "#0f172a",
        color: "#e2e8f0",
        borderRadius: 12,
        padding: 14,
        fontFamily: "system-ui, sans-serif",
      }}>
      {/* HEADER AND ZOOM CONTROLS */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}>
        <strong>Radar Range / Azimuth Display</strong>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
          <button style={buttonStyle} onClick={() => zoom(1.25)}>
            −
          </button>

          <button style={buttonStyle} onClick={resetZoom}>
            Reset
          </button>

          <button style={buttonStyle} onClick={() => zoom(0.8)}>
            +
          </button>

          <span
            style={{
              minWidth: 45,
              textAlign: "right",
            }}>
            {zoomLabel}
          </span>
        </div>
      </div>

      {/* PLOTLY GRAPH */}

      <Plot
        data={traces}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: false,
          scrollZoom: true,
        }}
        useResizeHandler
        style={{
          width: "100%",
          height: 480,
        }}
        onInitialized={(_, graph) => {
          graphRef.current = graph;
        }}
        onUpdate={(_, graph) => {
          graphRef.current = graph;
        }}
      />

      {/* DISPLAY OPTIONS */}

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
            checked={showBearings}
            onChange={(e) => setShowBearings(e.target.checked)}
          />
          Bearing lines
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={showAzimuthArcs}
            onChange={(e) => setShowAzimuthArcs(e.target.checked)}
          />
          Azimuth arcs
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={showAlerts}
            onChange={(e) => setShowAlerts(e.target.checked)}
          />
          Alerts
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={showConnections}
            onChange={(e) => setShowConnections(e.target.checked)}
          />
          Fusion connections
        </label>
      </div>

      {/* TIMELINE PLAYBACK */}

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}>
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
          style={{
            flex: 1,
            minWidth: 100,
          }}
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

      {/* MESSAGE STATUS */}

      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          color: "#94a3b8",
        }}>
        Active detections: {snapshot.detections.length}
        {" | "}
        Active alerts: {snapshot.alerts.length}
        {" | "}
        Radars: {Object.keys(messages).length}
      </div>
    </div>
  );
}
