import { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist";

export function usePlotlyChart(graphRef, { traces, layout, config, onRelayout }) {
  const plotQueue = useRef(Promise.resolve());
  const applyingRange = useRef(false);
  const onRelayoutRef = useRef(onRelayout);
  onRelayoutRef.current = onRelayout;

  useEffect(() => {
    const el = graphRef.current;
    if (!el) return undefined;

    let active = true;

    plotQueue.current = plotQueue.current
      .then(() => {
        const node = graphRef.current;

        if (!active || !node) return undefined;

        applyingRange.current = true;

        return Plotly.react(node, traces, layout, config)
          .then(() => {
            if (!active || !node.on) return;

            if (node._onRange) {
              node.removeListener("plotly_relayout", node._onRange);
            }

            const handler = (event) => {
              if (applyingRange.current) return;
              onRelayoutRef.current?.(event, node);
            };

            node.on("plotly_relayout", handler);
            node._onRange = handler;
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
  }, [graphRef, traces, layout, config]);

  useEffect(() => {
    const node = graphRef.current;

    return () => {
      if (node) Plotly.purge(node);
    };
  }, [graphRef]);
}
