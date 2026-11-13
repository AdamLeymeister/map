import { useQuery } from "@tanstack/react-query";
import RadarPlot from "./Radar";

function RadarPage({ recordingId }) {
  const { data: messages } = useQuery({
    queryKey: ["radar-messages", recordingId],
    enabled: recordingId != null && recordingId !== "",
    queryFn: async () => {
      const response = await fetch(`/api/recordings/${recordingId}/messages`);

      if (!response.ok) {
        throw new Error("Failed to load radar messages");
      }

      return response.json();
    },
  });

  return <RadarPlot messages={messages} durationMs={12000} />;
}

export default RadarPage;
