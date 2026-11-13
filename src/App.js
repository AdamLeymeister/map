import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import RadarPage from "./components/charts/Graph";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <RadarPage />
      </div>
    </QueryClientProvider>
  );
}

export default App;
