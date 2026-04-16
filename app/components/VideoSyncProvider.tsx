"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type VideoSyncContextValue = {
  /** Current playback time in seconds, updated ~4× per second. */
  currentTime: number;
  /** Whether the video is currently playing. */
  isPlaying: boolean;
  /** Seek the video to a specific time (seconds). */
  seekTo: (seconds: number) => void;
  /** Register the YT.Player instance – called by YouTubePlayer. */
  registerPlayer: (player: YT.Player) => void;
};

const VideoSyncContext = createContext<VideoSyncContextValue | null>(null);

export function useVideoSync() {
  const ctx = useContext(VideoSyncContext);
  if (!ctx) {
    throw new Error("useVideoSync must be used within <VideoSyncProvider>");
  }
  return ctx;
}

export default function VideoSyncProvider({
  children,
}: {
  children: ReactNode;
}) {
  const playerRef = useRef<YT.Player | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      const player = playerRef.current;
      if (player?.getCurrentTime) {
        setCurrentTime(player.getCurrentTime());
      }
    }, 250);
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const registerPlayer = useCallback(
    (player: YT.Player) => {
      playerRef.current = player;

      // Listen for state changes to start/stop polling
      player.addEventListener("onStateChange", ((event: { data: number }) => {
        const state = event.data;
        if (state === YT.PlayerState.PLAYING) {
          setIsPlaying(true);
          startPolling();
        } else {
          setIsPlaying(false);
          stopPolling();
          // One final time update when pausing
          if (player.getCurrentTime) {
            setCurrentTime(player.getCurrentTime());
          }
        }
      }) as unknown as YT.PlayerEventHandler<YT.OnStateChangeEvent>);
    },
    [startPolling, stopPolling],
  );

  const seekTo = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (player?.seekTo) {
      player.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  }, []);

  return (
    <VideoSyncContext.Provider
      value={{ currentTime, isPlaying, seekTo, registerPlayer }}
    >
      {children}
    </VideoSyncContext.Provider>
  );
}
