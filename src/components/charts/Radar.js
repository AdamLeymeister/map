import { useMemo, useRef, useState } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import { usePlotlyChart } from "../../hooks/usePlotlyChart";
import { useRadarSnapshot } from "../../hooks/useRadarSnapshot";
import { useSquareView } from "../../hooks/useSquareView";
import { INITIAL_RANGE, VIEW_LIMITS, VIEW_METERS } from "../../radar/constants";
import { DEMO_MESSAGES, DEMO_SENSORS } from "../../radar/demo";
import { buildRadarLayout, radarPlotConfig } from "../../radar/layout";
import { buildRadarTraces } from "../../radar/traces";

const LAYER_OPTIONS = [
  { key: "rings", label: "Range rings" },
  { key: "azimuth", label: "Azimuth" },
  { key: "trails", label: "Trails" },
  { key: "bearings", label: "Bearing lines" },
  { key: "alerts", label: "Alerts" },
];

const useStyles = makeStyles((theme) => ({
  panel: {
    background: theme.palette.background.default,
    color: theme.palette.text.primary,
    borderRadius: 12,
    padding: theme.spacing(1.75),
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(1.25),
  },
  zoom: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
  },
  button: {
    fontFamily: theme.typography.button.fontFamily,
    fontSize: theme.typography.pxToRem(13),
    lineHeight: 1.75,
    padding: theme.spacing(0.5, 1.25),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.primary.main}`,
    background: "transparent",
    color: theme.palette.primary.main,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: "rgba(56, 189, 248, 0.12)",
    },
  },
  zoomLabel: {
    minWidth: 45,
    textAlign: "right",
  },
  plot: {
    width: "min(100%, 680px)",
    aspectRatio: "1",
    margin: "0 auto",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1.75),
    marginBottom: theme.spacing(1),
  },
  layers: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1.75),
    marginBottom: theme.spacing(1.75),
  },
  layer: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    fontSize: theme.typography.pxToRem(13),
  },
  status: {
    marginTop: theme.spacing(1.5),
    color: theme.palette.text.secondary,
  },
}));

export default function RadarPlot({
  sensors = DEMO_SENSORS,
  messages = DEMO_MESSAGES,
  timeMs = 0,
  children,
}) {
  const classes = useStyles();
  const graphRef = useRef(null);
  const { viewRange, zoom, reset, onRelayout } = useSquareView(INITIAL_RANGE, VIEW_LIMITS);
  const [layers, setLayers] = useState({
    rings: true,
    azimuth: true,
    trails: true,
    bearings: true,
    alerts: true,
  });

  const sensorById = useMemo(() => {
    return Object.fromEntries(sensors.map((sensor) => [sensor.id, sensor]));
  }, [sensors]);

  const snapshot = useRadarSnapshot(messages, timeMs, viewRange);
  const traces = useMemo(
    () => buildRadarTraces({ snapshot, sensorById, viewRange, layers }),
    [snapshot, sensorById, viewRange, layers],
  );
  const layout = useMemo(() => buildRadarLayout(viewRange), [viewRange]);

  usePlotlyChart(graphRef, {
    traces,
    layout,
    config: radarPlotConfig,
    onRelayout,
  });

  const viewSpan = viewRange.x[1] - viewRange.x[0];
  const zoomLabel = `${Math.round(((VIEW_METERS * 2) / viewSpan) * 100)}%`;

  function toggleLayer(key) {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <Box className={classes.panel}>
      <div className={classes.toolbar}>
        <Typography variant="subtitle1" component="strong">
          Radar Range / Azimuth Display
        </Typography>
        <div className={classes.zoom}>
          <button type="button" className={classes.button} onClick={() => zoom(1.25)}>
            −
          </button>
          <button type="button" className={classes.button} onClick={reset}>
            Reset
          </button>
          <button type="button" className={classes.button} onClick={() => zoom(0.8)}>
            +
          </button>
          <Typography variant="body2" className={classes.zoomLabel}>
            {zoomLabel}
          </Typography>
        </div>
      </div>

      <div ref={graphRef} className={classes.plot} />

      <div className={classes.legend}>
        {sensors.map((sensor) => (
          <Typography key={sensor.id} variant="caption" style={{ color: sensor.color }}>
            {sensor.name}
          </Typography>
        ))}
      </div>

      <div className={classes.layers}>
        {LAYER_OPTIONS.map((layer) => (
          <label key={layer.key} className={classes.layer}>
            <input
              type="checkbox"
              checked={layers[layer.key]}
              onChange={() => toggleLayer(layer.key)}
            />
            {layer.label}
          </label>
        ))}
      </div>

      {children}

      <Typography variant="caption" component="div" className={classes.status}>
        On screen: {snapshot.detections.length} of {snapshot.activeCount}
        {" | "}
        Alerts: {snapshot.alerts.length}
      </Typography>
    </Box>
  );
}
