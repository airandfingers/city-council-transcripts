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

/** YouTube IFrame API's own "playing" state code (YT.PlayerState.PLAYING). */
const PLAYER_STATE_PLAYING = 1;

/**
 * Minimal player shape VideoSyncProvider needs — satisfied structurally by
 * both a real `YT.Player` (YouTubePlayer) and a plain `<video>`-backed
 * adapter (Mp4Player), so any auto-seekable provider (see
 * app/lib/videoSeek.ts::canAutoSeek) can register itself the same way.
 */
export type SyncablePlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  getCurrentTime: () => number;
  addEventListener: (
    event: "onStateChange",
    handler: (event: { data: number }) => void,
  ) => void;
};

/** A request to scroll the transcript to a given reference-time moment.
 * `nonce` increments on every call so clicking the same timecode twice in a
 * row (e.g. after scrolling away) still re-triggers the effect that consumes
 * it — a plain `seconds` value wouldn't change and React would skip it. */
type ScrollRequest = { seconds: number; nonce: number };

type VideoSyncContextValue = {
  /** Current playback time in seconds, updated ~4× per second. */
  currentTime: number;
  /** Whether the video is currently playing. */
  isPlaying: boolean;
  /** Seek the video to a specific time (seconds). */
  seekTo: (seconds: number) => void;
  /** Start playback. */
  play: () => void;
  /** Register the active player — called by YouTubePlayer/Mp4Player once their player is ready. */
  registerPlayer: (player: SyncablePlayer) => void;
  /**
   * Ask any mounted transcript view to scroll to `seconds` (reference /
   * transcript time, unmapped). Independent of `seekTo` — works even when
   * there's no seekable player (e.g. a Granicus link-out meeting), which is
   * the whole point: a citation click should always be able to move the
   * transcript, whether or not it can also move a video
   * (FIX-TIMECODE-SEEK-GRANICUS-001).
   */
  scrollToTime: (seconds: number) => void;
  /** Latest pending scroll-to-time request, or null before the first one. */
  scrollRequest: ScrollRequest | null;
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
  const playerRef = useRef<SyncablePlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(null);
  const scrollNonceRef = useRef(0);

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
    (player: SyncablePlayer) => {
      playerRef.current = player;

      // Listen for state changes to start/stop polling. Uses YouTube's own
      // numeric state codes (1 = playing) rather than referencing the
      // global `YT.PlayerState` object, since that global only exists once
      // the YouTube IFrame API script has loaded — never true on an
      // mp4-only page, whose Mp4Player adapter emits these same codes.
      player.addEventListener("onStateChange", (event: { data: number }) => {
        const state = event.data;
        if (state === PLAYER_STATE_PLAYING) {
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
      });
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

  const play = useCallback(() => {
    const player = playerRef.current;
    if (player?.playVideo) {
      player.playVideo();
    }
  }, []);

  const scrollToTime = useCallback((seconds: number) => {
    scrollNonceRef.current += 1;
    setScrollRequest({ seconds, nonce: scrollNonceRef.current });
  }, []);

  return (
    <VideoSyncContext.Provider
      value={{
        currentTime,
        isPlaying,
        seekTo,
        play,
        registerPlayer,
        scrollToTime,
        scrollRequest,
      }}
    >
      {children}
    </VideoSyncContext.Provider>
  );
}
