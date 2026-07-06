"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TranscriptSegment {
  endMs: number;
  startMs: number;
  text: string;
}

interface UseAudioTranscriptionOptions {
  onTranscript: (text: string) => void;
  workspaceUuid: string;
}

const METER_SAMPLE_COUNT = 72;

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

  return (
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ??
    ""
  );
}

async function transcribeBlob(input: { audio: Blob; workspaceUuid: string }) {
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
  const discardRecordingRef = useRef(false);
  const meterFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [meterLevels, setMeterLevels] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supported =
    typeof window !== "undefined" && typeof MediaRecorder !== "undefined";

  const cleanupMeter = useCallback((clearLevels: boolean) => {
    if (meterFrameRef.current !== null) {
      cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
    }

    meterSourceRef.current?.disconnect();
    meterSourceRef.current = null;

    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close().catch(() => undefined);
    }

    if (clearLevels) {
      setMeterLevels([]);
    }
  }, []);

  const startMeter = useCallback(
    (stream: MediaStream) => {
      if (typeof AudioContext === "undefined") {
        return;
      }

      cleanupMeter(true);

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      meterSourceRef.current = source;

      const samples = new Uint8Array(analyser.fftSize);
      let lastUpdate = 0;

      const updateMeter = (now: number) => {
        if (now - lastUpdate >= 80) {
          lastUpdate = now;
          analyser.getByteTimeDomainData(samples);
          const bucketSize = Math.max(
            1,
            Math.floor(samples.length / METER_SAMPLE_COUNT)
          );
          const levels = Array.from({ length: METER_SAMPLE_COUNT }, (_, i) => {
            const start = i * bucketSize;
            const end = Math.min(start + bucketSize, samples.length);
            let peak = 0;
            for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
              peak = Math.max(
                peak,
                Math.abs((samples[sampleIndex] ?? 128) - 128) / 128
              );
            }
            return Math.min(1, peak * 3.2);
          });
          setMeterLevels(levels);
        }

        meterFrameRef.current = requestAnimationFrame(updateMeter);
      };

      meterFrameRef.current = requestAnimationFrame(updateMeter);
    },
    [cleanupMeter]
  );

  const cleanupStream = useCallback(() => {
    cleanupMeter(false);
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
  }, [cleanupMeter]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    discardRecordingRef.current = false;
    recorder.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      audioChunksRef.current = [];
      cleanupStream();
      setMeterLevels([]);
      setIsRecording(false);
      return;
    }

    discardRecordingRef.current = true;
    recorder.stop();
  }, [cleanupStream]);

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
    discardRecordingRef.current = false;
    setMeterLevels([]);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      startMeter(stream);

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

        const shouldDiscard = discardRecordingRef.current;
        discardRecordingRef.current = false;
        setIsRecording(false);
        const audio = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        cleanupStream();

        if (shouldDiscard) {
          setMeterLevels([]);
          return;
        }

        if (audio.size === 0) {
          setMeterLevels([]);
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
            setMeterLevels([]);
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
  }, [cleanupStream, onTranscript, startMeter, supported, workspaceUuid]);

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
    cancelRecording,
    error,
    isRecording,
    isTranscribing,
    meterLevels,
    startRecording,
    stopRecording,
    supported,
  };
}
