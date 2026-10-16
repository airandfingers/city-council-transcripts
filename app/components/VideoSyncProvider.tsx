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
  /** True once a seekable player (YouTube/mp4) has registered. Until then a
   * citation click can't play the moment, so it jumps to the transcript. */
  hasPlayer: boolean;
  /** Ask DockableVideo to pop the player into the corner if it's off-screen,
   * so a citation click plays the moment without moving the page
   * (FEAT-TRANSCRIPT-DOCK-PLAYER-001). Bumped once per request. */
  requestDock: () => void;
  dockNonce: number;
  /** Scroll the page to *target*, remembering where the reader was, and show
   * a "Back to where you were" button that returns there. */
  jumpWithReturn: (target: Element | null) => void;
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
  const [hasPlayer, setHasPlayer] = useState(false);
  const [dockNonce, setDockNonce] = useState(0);
  const [returnTo, setReturnTo] = useState<number | null>(null);

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
      setHasPlayer(true);

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

  const requestDock = useCallback(() => setDockNonce((n) => n + 1), []);

  const jumpWithReturn = useCallback((target: Element | null) => {
    if (!target) return;
    // Keep the first saved spot across repeated jumps, so "back" always
    // returns to where the reader actually was.
    setReturnTo((saved) => saved ?? window.scrollY);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
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
        hasPlayer,
        requestDock,
        dockNonce,
        jumpWithReturn,
      }}
    >
      {children}
      {returnTo != null && (
        <div className="fixed z-50 top-[max(1rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 flex items-center whitespace-nowrap rounded-full bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow-lg text-sm">
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: returnTo, behavior: "smooth" });
              setReturnTo(null);
            }}
            className="pl-4 pr-2 py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded-l-full"
          >
            ↑ Back to where you were
          </button>
          <button
            type="button"
            onClick={() => setReturnTo(null)}
            aria-label="Dismiss"
            className="pl-1 pr-3 py-2 opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 rounded-r-full"
          >
            ×
          </button>
        </div>
      )}
    </VideoSyncContext.Provider>
  );
}
