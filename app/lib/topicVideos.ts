/**
 * Videos made about a tracked topic (FEAT-TOPIC-VIDEOS-001): hand-made
 * supercuts that pull public comment and council discussion from many
 * meetings. Each video's YouTube description links back to the topic page,
 * and the topic page lists the video, so the two link to each other.
 *
 * A checked-in list rather than a database table: there are a handful of
 * these, they're added by hand after a manual YouTube upload, and a static
 * list costs no Neon reads on a crawler-facing page. Move this to the
 * database if videos start being published automatically.
 */

export type TopicVideo = {
  youtubeId: string;
  title: string;
  /** One line under the title: what's in it. */
  summary: string;
  /** Meetings the clips come from, e.g. "Oct 2025 – Oct 2026". */
  dateRange: string;
};

/** Keyed by `${state}/${city}/${topic slug}` (the topic page's URL params). */
const TOPIC_VIDEOS: Record<string, TopicVideo[]> = {
  "co/fort-collins/climate_goals": [
    {
      youtubeId: "VGBsxi4CUSA",
      title: "Fort Collins and its 2030 climate goals, in their own words",
      summary:
        "17 residents, plus city staff and the mayor, on the city's 2030 targets and Platte River Power Authority's non-carbon goal.",
      dateRange: "Oct 2025 – Oct 2026",
    },
  ],
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function getTopicVideos(state: string, city: string, slug: string): TopicVideo[] {
  const videos = TOPIC_VIDEOS[`${state.toLowerCase()}/${city.toLowerCase()}/${slug}`] ?? [];
  return videos.filter((v) => YOUTUBE_ID.test(v.youtubeId));
}
