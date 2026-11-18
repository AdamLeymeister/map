import jetUrl from "./jet.svg";

export function egoIconLength(viewRange) {
  const viewSpan = viewRange.x[1] - viewRange.x[0];
  return Math.max(viewSpan * 0.07, 1);
}

export function jetLayoutImage(viewRange) {
  const length = egoIconLength(viewRange);

  return {
    source: jetUrl,
    xref: "x",
    yref: "y",
    x: 0,
    y: 0,
    sizex: length,
    sizey: length,
    xanchor: "center",
    yanchor: "middle",
    sizing: "contain",
    layer: "above",
  };
}
