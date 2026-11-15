export function outerRadius(range) {
  return (
    Math.min(
      Math.abs(range.x[0]),
      Math.abs(range.x[1]),
      Math.abs(range.y[0]),
      Math.abs(range.y[1]),
    ) * 0.9
  );
}

export function ringRadii(range) {
  const outer = outerRadius(range);
  const rough = outer / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-6)));
  const residual = rough / magnitude;
  const nice = residual >= 7.5 ? 10 : residual >= 3.5 ? 5 : residual >= 1.5 ? 2 : 1;
  const step = nice * magnitude;
  const rings = [];

  for (let radius = step; radius < outer * 0.98 + step * 0.01; radius += step) {
    rings.push(Math.round(radius * 1000) / 1000);
  }

  return rings.length ? rings : [step];
}

export function isOnScreen(x, y, viewRange) {
  const padX = (viewRange.x[1] - viewRange.x[0]) * 0.02;
  const padY = (viewRange.y[1] - viewRange.y[0]) * 0.02;

  return (
    x >= viewRange.x[0] - padX &&
    x <= viewRange.x[1] + padX &&
    y >= viewRange.y[0] - padY &&
    y <= viewRange.y[1] + padY
  );
}

export function isInView(x, y, range, viewRange) {
  return isOnScreen(x, y, viewRange) || range <= outerRadius(viewRange);
}
