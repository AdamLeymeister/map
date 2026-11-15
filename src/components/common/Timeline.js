import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(1),
  },
  play: {
    fontFamily: theme.typography.button.fontFamily,
    fontSize: theme.typography.pxToRem(13),
    fontWeight: theme.typography.button.fontWeight,
    letterSpacing: theme.typography.button.letterSpacing,
    textTransform: "uppercase",
    lineHeight: 1.75,
    minWidth: 64,
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
  slider: {
    flex: 1,
    minWidth: 100,
    accentColor: theme.palette.primary.main,
    cursor: "pointer",
  },
  readout: {
    minWidth: 110,
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },
}));

function formatSeconds(timeMs) {
  return (timeMs / 1000).toFixed(1);
}

export default function Timeline({
  startTime,
  endTime,
  value,
  onChange,
  step = 100,
}) {
  const classes = useStyles();
  const [uncontrolledTime, setUncontrolledTime] = useState(startTime);
  const [playing, setPlaying] = useState(false);
  const timeMs = value ?? uncontrolledTime;
  const timeMsRef = useRef(timeMs);
  timeMsRef.current = timeMs;

  const setTime = useCallback(
    (next) => {
      const clamped = Math.max(startTime, Math.min(endTime, next));

      if (value === undefined) {
        setUncontrolledTime(clamped);
      }

      onChange?.(clamped);
    },
    [startTime, endTime, value, onChange],
  );

  useEffect(() => {
    if (!playing) return undefined;

    let frameId;
    let previousTime;

    function tick(now) {
      if (previousTime !== undefined) {
        const next = Math.min(endTime, timeMsRef.current + (now - previousTime));
        setTime(next);

        if (next >= endTime) {
          setPlaying(false);
          return;
        }
      }

      previousTime = now;
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [playing, endTime, setTime]);

  return (
    <Box className={classes.root}>
      <button
        type="button"
        className={classes.play}
        onClick={() => {
          setPlaying((current) => {
            const nextPlaying = !current;

            if (nextPlaying && timeMsRef.current >= endTime) {
              timeMsRef.current = startTime;
              setTime(startTime);
            }

            return nextPlaying;
          });
        }}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <input
        className={classes.slider}
        type="range"
        min={startTime}
        max={endTime}
        step={step}
        value={Math.min(endTime, Math.max(startTime, timeMs))}
        onChange={(event) => setTime(Number(event.target.value))}
        aria-label="Timeline"
      />
      <Typography variant="body2" className={classes.readout}>
        {formatSeconds(timeMs)} / {formatSeconds(endTime)} s
      </Typography>
    </Box>
  );
}
