import { useCallback, useState } from "react";
import { rangeFromRelayout, rangesEqual, zoomRange } from "../utils/viewRange";

export function useSquareView(initialRange, limits) {
  const [viewRange, setViewRange] = useState(initialRange);

  const onRelayout = useCallback(
    (event, graph) => {
      const next = rangeFromRelayout(event, graph, initialRange, limits);

      if (!next) return;

      setViewRange((current) => (rangesEqual(current, next) ? current : next));
    },
    [initialRange, limits],
  );

  const zoom = useCallback(
    (factor) => {
      setViewRange((current) => zoomRange(current, factor, limits));
    },
    [limits],
  );

  const reset = useCallback(() => {
    setViewRange(initialRange);
  }, [initialRange]);

  return { viewRange, zoom, reset, onRelayout };
}
