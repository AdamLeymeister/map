export function egoToXY(range, azimuth) {
  const angle = (azimuth * Math.PI) / 180;

  return {
    x: range * Math.sin(angle),
    y: range * Math.cos(angle),
  };
}
