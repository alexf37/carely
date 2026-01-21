"use client";

import { cn } from "@/lib/utils";
import { Loader2Icon, MicIcon, SquareIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const WAVEFORM_BARS = 6;

export type SpeechInputProps = {
  className?: string;
  onTranscriptionChange?: (text: string) => void;
  onAudioRecorded?: (audioBlob: Blob) => Promise<string>;
  onRecordingComplete?: () => void;
  size?: "icon" | "icon-sm";
  variant?: "outline" | "ghost";
};

export function SpeechInput({
  className,
  onTranscriptionChange,
  onAudioRecorded,
  onRecordingComplete,
  size = "icon",
  variant = "outline",
}: SpeechInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [volumes, setVolumes] = useState<number[]>(Array(WAVEFORM_BARS).fill(0.1));
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const updateVolumes = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate overall volume - more sensitive scaling
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedVolume = Math.min((average / 64) ** 0.7, 1); // More sensitive: lower divisor + power curve

    // Create varied bar heights based on volume with some randomness for visual interest
    setVolumes((prev) =>
      prev.map((_, i) => {
        const variance = 0.5 + Math.random() * 0.5;
        const baseHeight = normalizedVolume * variance;
        // Add slight wave pattern
        const wave = Math.sin(Date.now() / 150 + i * 0.8) * 0.1;
        return Math.max(0.15, Math.min(1, baseHeight + wave + 0.2));
      })
    );

    animationFrameRef.current = requestAnimationFrame(updateVolumes);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start volume visualization
      updateVolumes();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Stop all tracks to release the microphone
        for (const track of stream.getTracks()) {
          track.stop();
        }

        if (onAudioRecorded) {
          setIsProcessing(true);
          try {
            const transcript = await onAudioRecorded(audioBlob);
            onTranscriptionChange?.(transcript);
          } catch (error) {
            console.error("Transcription failed:", error);
          } finally {
            setIsProcessing(false);
            onRecordingComplete?.();
          }
        } else {
          onRecordingComplete?.();
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  }, [onAudioRecorded, onTranscriptionChange, updateVolumes]);

  const stopRecording = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // Reset volumes
    setVolumes(Array(WAVEFORM_BARS).fill(0.1));
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  const buttonSize = size === "icon-sm" ? "h-8 min-w-8" : "h-9 min-w-9";
  const iconSize = size === "icon-sm" ? "size-4" : "size-4";

  const variantStyles =
    variant === "outline"
      ? "border border-border bg-background hover:bg-muted dark:bg-input/30 dark:border-input dark:hover:bg-input/50 shadow-xs"
      : "hover:bg-muted dark:hover:bg-muted/50";

  // Calculate expanded width based on content: waveform (6 bars * 4px + 5 gaps * 2px) + gap + stop button + padding
  const expandedWidth = 6 * 4 + 5 * 2 + 6 + 20 + 16; // ~76px
  const collapsedWidth = size === "icon-sm" ? 32 : 36;

  return (
    <motion.button
      type="button"
      disabled={isProcessing}
      onClick={toggleRecording}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-md text-sm font-medium transition-colors",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        buttonSize,
        variantStyles,
        isRecording && "bg-destructive/10 hover:bg-destructive/15 dark:bg-destructive/20 dark:hover:bg-destructive/25 border-destructive/30",
        className
      )}
      initial={false}
      animate={{
        width: isRecording ? expandedWidth : collapsedWidth,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isProcessing ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            <Loader2Icon className={cn(iconSize, "animate-spin text-muted-foreground")} />
          </motion.div>
        ) : isRecording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 px-2"
          >
            {/* Waveform visualization */}
            <div className="flex items-center gap-0.5 h-4">
              {volumes.map((volume, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full bg-destructive"
                  animate={{ height: Math.max(4, volume * 18) }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                  }}
                />
              ))}
            </div>
            
            {/* Stop button */}
            <div className="flex items-center justify-center size-5 rounded bg-destructive/20 hover:bg-destructive/30 transition-colors">
              <SquareIcon className="size-2.5 fill-destructive text-destructive" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            <MicIcon className={cn(iconSize, "text-muted-foreground")} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
