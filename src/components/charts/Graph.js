import { useState } from "react";
import Timeline from "../common/Timeline";
import { useRecording } from "../../hooks/useRecording";
import RadarPlot from "./Radar";

const START_TIME = 0;
const END_TIME = 12000;

function RadarPage({ recordingId }) {
  const [timeMs, setTimeMs] = useState(START_TIME);
  const { data: messages } = useRecording(recordingId);

  if (!messages) return null;

  return (
    <RadarPlot messages={messages} timeMs={timeMs}>
      <Timeline
        startTime={START_TIME}
        endTime={END_TIME}
        value={timeMs}
        onChange={setTimeMs}
      />
    </RadarPlot>
  );
}

export default RadarPage;
