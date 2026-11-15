import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CssBaseline from "@material-ui/core/CssBaseline";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import "./App.css";
import RadarPage from "./components/charts/Graph";

const queryClient = new QueryClient();

const theme = createMuiTheme({
  palette: {
    type: "dark",
    primary: { main: "#38bdf8" },
    background: {
      default: "#0f172a",
      paper: "#1e293b",
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <div className="App">
          <RadarPage />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
