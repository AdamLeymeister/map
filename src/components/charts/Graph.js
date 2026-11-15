import { useQuery } from "@tanstack/react-query";
import { getRecordingMessages } from "../../mockData";
import RadarPlot from "./Radar";

function RadarPage({ recordingId }) {
  const { data: messages } = useQuery({
    queryKey: ["radar-messages", recordingId ?? "mock"],
    queryFn: () => getRecordingMessages(recordingId),
  });

  if (!messages) return null;

  return <RadarPlot messages={messages} durationMs={12000} />;
}

export default RadarPage;
