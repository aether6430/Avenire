"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TranscriptSegment = {
  endMs: number;
  startMs: number;
  text: string;
};

type UseAudioTranscriptionOptions = {
  onTranscript: (text: string) => void;
  workspaceUuid: string;
};

function getSupportedMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

async function transcribeBlob(input: {
  audio: Blob;
  workspaceUuid: string;
}) {
  const formData = new FormData();
  formData.append("workspaceUuid", input.workspaceUuid);
  formData.append("audio", input.audio, "recording.webm");

  const response = await fetch("/api/transcriptions", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    segments?: TranscriptSegment[];
    text?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to transcribe audio.");
  }

  return {
    segments: payload.segments ?? [],
    text: payload.text?.trim() ?? "",
  };
}

export function useAudioTranscription({
  onTranscript,
  workspaceUuid,
}: UseAudioTranscriptionOptions) {
  const disposedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported =
    typeof window !== "undefined" && typeof MediaRecorder !== "undefined";

  const cleanupStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (!supported) {
      setError("Audio recording is not available in this browser.");
      return;
    }

    if (!workspaceUuid.trim()) {
      setError("Workspace context is required for transcription.");
      return;
    }

    setError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        if (disposedRef.current) {
          audioChunksRef.current = [];
          cleanupStream();
          return;
        }

        setIsRecording(false);
        const audio = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        cleanupStream();

        if (audio.size === 0) {
          setError("No audio was captured.");
          return;
        }

        setIsTranscribing(true);
        void transcribeBlob({
          audio,
          workspaceUuid,
        })
          .then((result) => {
            if (!result.text) {
              setError("No speech was detected.");
              return;
            }

            onTranscript(result.text);
          })
          .catch((transcriptionError) => {
            setError(
              transcriptionError instanceof Error
                ? transcriptionError.message
                : "Unable to transcribe audio."
            );
          })
          .finally(() => {
            setIsTranscribing(false);
          });
      });

      recorder.start();
      setIsRecording(true);
    } catch (recordingError) {
      cleanupStream();
      setIsRecording(false);
      setError(
        recordingError instanceof Error
          ? recordingError.message
          : "Microphone access was denied."
      );
    }
  }, [cleanupStream, onTranscript, supported, workspaceUuid]);

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    error,
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    supported,
  };
}
