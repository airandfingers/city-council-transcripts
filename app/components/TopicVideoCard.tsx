import Image from "next/image";
import type { TopicVideo } from "@/app/lib/topicVideos";

/**
 * A topic video as a thumbnail link to YouTube (FEAT-TOPIC-VIDEOS-001).
 * Deliberately not an embedded player: no third-party script or iframe
 * loads until the reader chooses to watch.
 */
export default function TopicVideoCard({ video }: { video: TopicVideo }) {
  const href = `https://www.youtube.com/watch?v=${video.youtubeId}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col sm:flex-row gap-4 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:border-gray-400 dark:hover:border-gray-500"
    >
      <div className="relative aspect-video w-full sm:w-56 shrink-0 overflow-hidden rounded-lg bg-black">
        <Image
          src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
          alt=""
          fill
          sizes="(min-width: 640px) 14rem, 100vw"
          className="object-cover"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/70 text-white text-xl group-hover:bg-red-600"
        >
          ▶
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-medium group-hover:underline">{video.title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{video.summary}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Clips from public meetings, {video.dateRange} · Watch on YouTube ↗
        </p>
      </div>
    </a>
  );
}
