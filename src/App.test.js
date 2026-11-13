import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/charts/Graph', () => () => (
  <div>Radar Range / Azimuth Display</div>
));

test('renders radar graph', () => {
  render(<App />);
  expect(screen.getByText(/radar range \/ azimuth display/i)).toBeInTheDocument();
});
