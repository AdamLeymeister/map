import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import { usePlayback } from "../../hooks/usePlayback";
import { clampTime, formatSeconds } from "../../utils/time";

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

export default function Timeline({ startTime, endTime, value, onChange, step = 100 }) {
  const classes = useStyles();
  const { timeMs, setTime, playing, togglePlay } = usePlayback({
    startTime,
    endTime,
    value,
    onChange,
  });

  return (
    <Box className={classes.root}>
      <button type="button" className={classes.play} onClick={togglePlay}>
        {playing ? "Pause" : "Play"}
      </button>
      <input
        className={classes.slider}
        type="range"
        min={startTime}
        max={endTime}
        step={step}
        value={clampTime(timeMs, startTime, endTime)}
        onChange={(event) => setTime(Number(event.target.value))}
        aria-label="Timeline"
      />
      <Typography variant="body2" className={classes.readout}>
        {formatSeconds(timeMs)} / {formatSeconds(endTime)} s
      </Typography>
    </Box>
  );
}
