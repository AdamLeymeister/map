import { useQuery } from "@tanstack/react-query";
import { getRecordingMessages } from "../mockData";

export function useRecording(recordingId) {
  return useQuery({
    queryKey: ["recording", recordingId ?? "mock"],
    queryFn: () => getRecordingMessages(recordingId),
  });
}
