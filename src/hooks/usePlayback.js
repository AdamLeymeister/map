import { useCallback, useEffect, useRef, useState } from "react";
import { clampTime } from "../utils/time";

export function usePlayback({ startTime, endTime, value, onChange }) {
  const [uncontrolledTime, setUncontrolledTime] = useState(startTime);
  const [playing, setPlaying] = useState(false);
  const timeMs = value ?? uncontrolledTime;
  const timeMsRef = useRef(timeMs);
  timeMsRef.current = timeMs;

  const setTime = useCallback(
    (next) => {
      const clamped = clampTime(next, startTime, endTime);

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

  const togglePlay = useCallback(() => {
    setPlaying((current) => {
      const nextPlaying = !current;

      if (nextPlaying && timeMsRef.current >= endTime) {
        timeMsRef.current = startTime;
        setTime(startTime);
      }

      return nextPlaying;
    });
  }, [endTime, setTime, startTime]);

  return { timeMs, setTime, playing, togglePlay };
}
