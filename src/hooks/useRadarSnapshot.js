import { useMemo } from "react";
import { TRAIL_MS } from "../radar/constants";
import { getSnapshot, indexMessages } from "../radar/tracks";

export function useRadarSnapshot(messages, timeMs, viewRange, trailMs = TRAIL_MS) {
  const trackIndex = useMemo(() => indexMessages(messages), [messages]);

  return useMemo(
    () => getSnapshot(trackIndex, timeMs, viewRange, trailMs),
    [trackIndex, timeMs, viewRange, trailMs],
  );
}
