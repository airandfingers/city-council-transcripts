import { TOPIC, MEETINGS, SPEAKERS, RELATED, NEXT_STEPS, Meeting, Speaker } from "./data";

export function TopicHeader({ compact }: { compact?: boolean }) {
  return (
    <div className="wf-hdr" style={compact ? { padding: "10px 18px" } : undefined}>
      <div>
        <div className="crumb">
          <span className="sq" /> <span>Monterey Park</span>
          <span style={{ opacity: 0.5 }}>›</span>
          <span>Topics</span>
          <span style={{ opacity: 0.5 }}>›</span>
          <span style={{ color: "var(--ink)" }}>{TOPIC.title}</span>
        </div>
        <h1>{TOPIC.title}</h1>
        <div className="meta" style={{ marginTop: 6 }}>
          <span>{TOPIC.meetingsCount} meetings</span>
          <span>·</span>
          <span>{TOPIC.speakersCount} speakers</span>
          <span>·</span>
          <span>First seen {TOPIC.firstSeen}</span>
          <span>·</span>
          <span>Last activity {TOPIC.lastSeen}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span className="pill hl"><span className="dot" /> Active</span>
        <span className="btn">Follow</span>
        <span className="btn">Share</span>
      </div>
    </div>
  );
}

export function TopicSummary({ short }: { short?: boolean }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Summary</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
        {short
          ? TOPIC.blurb.split(". ").slice(0, 2).join(". ") + "."
          : (
            <>
              {TOPIC.blurb}{" "}
              The conversation has covered <span className="hl-text">parking impact</span>,{" "}
              <span className="hl-text blue">connectivity to existing bike infrastructure</span>, and{" "}
              <span className="hl-text red">facility upgrades</span> over seven meetings.
            </>
          )}
      </div>
    </div>
  );
}

export function WireMeetingCard({ m, dense }: { m: Meeting; dense?: boolean }) {
  return (
    <div className="card" style={dense ? { padding: "9px 11px" } : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 12 }}>{m.title}</div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{m.date}</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        <span className="tag">{m.tag}</span>
        {m.decision && <span className="tag hot">decision</span>}
        {m.pending && <span className="tag" style={{ background: "var(--hl-3)" }}>pending</span>}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.5 }}>
        {m.summary}
      </div>
      {m.timestamps.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {m.timestamps.map((t) => <span key={t} className="ts">{t}</span>)}
        </div>
      )}
      {m.speakers.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {m.speakers.slice(0, 4).map((s) => (
            <span key={s} className="spkr">
              <span className="av">{s.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function VideoSlot({
  empty,
  label,
  height,
}: {
  empty?: boolean;
  label?: string;
  height?: number;
}) {
  if (empty) {
    return (
      <div className="vid empty-vid" style={{ height: height || 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 8 }}>
          <div className="hand" style={{ fontSize: 16 }}>video appears here</div>
          <div className="mono" style={{ fontSize: 9.5, marginTop: 2 }}>click any timestamp →</div>
        </div>
      </div>
    );
  }
  return (
    <div className="vid" style={height ? { height, aspectRatio: "unset" } : undefined}>
      <span className="vlbl">{label || "Dec 17 '25 · 32:18"}</span>
    </div>
  );
}

export function SpeakerRow({ s, showStance }: { s: Speaker; showStance?: boolean }) {
  const stanceColor: Record<string, string> = {
    support: "var(--hl-2)",
    concern: "var(--hl-3)",
    neutral: "var(--rule-soft)",
    mixed: "linear-gradient(90deg,var(--hl-2),var(--hl-3))",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--ink-4)", color: "var(--paper)", fontSize: 9.5, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--rule)", flexShrink: 0 }}>{s.init}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 500 }}>{s.name}</div>
        <div style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{s.role} · {s.mentions} mentions</div>
      </div>
      {showStance && <span style={{ width: 20, height: 5, borderRadius: 3, background: stanceColor[s.stance], flexShrink: 0 }} />}
    </div>
  );
}

export function EmptyHint({ children, title }: { children?: React.ReactNode; title?: string }) {
  return (
    <div className="empty">
      <div className="empty-h">{title || "nothing here yet"}</div>
      <div>{children}</div>
    </div>
  );
}

export function NextStepsList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {NEXT_STEPS.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", minWidth: 60 }}>{s.when}</span>
          <span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{s.what}</span>
        </div>
      ))}
    </div>
  );
}

export function SentimentBar() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>
        <span>support · 6</span><span>neutral · 2</span><span>concern · 4</span>
      </div>
      <div className="sent">
        <span className="pos" style={{ width: "50%" }} />
        <span className="neu" style={{ width: "16%" }} />
        <span className="neg" style={{ width: "34%" }} />
      </div>
    </div>
  );
}

export { TOPIC, MEETINGS, SPEAKERS, RELATED, NEXT_STEPS };
