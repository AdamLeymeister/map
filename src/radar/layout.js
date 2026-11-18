import { jetLayoutImage } from "./jetIcon";

export const radarPlotConfig = {
  responsive: true,
  displayModeBar: false,
  scrollZoom: true,
};

const AXIS = {
  gridcolor: "#1e293b",
  zerolinecolor: "#334155",
  fixedrange: false,
};

export function buildRadarLayout(viewRange) {
  return {
    autosize: true,
    margin: { l: 48, r: 48, t: 48, b: 48 },
    paper_bgcolor: "#0f172a",
    plot_bgcolor: "#0f172a",
    font: { color: "#e2e8f0" },
    xaxis: {
      title: "X (meters)",
      range: viewRange.x,
      ...AXIS,
    },
    yaxis: {
      title: "Y (meters)",
      range: viewRange.y,
      ...AXIS,
    },
    showlegend: false,
    hovermode: "closest",
    images: [jetLayoutImage(viewRange)],
  };
}
