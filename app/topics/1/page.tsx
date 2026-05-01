import {
  TopicHeader, TopicSummary, VideoSlot, SpeakerRow, EmptyHint, SentimentBar,
  MEETINGS, SPEAKERS,
} from "../components";

export default function Prototype1() {
  const W = 1200;
  const H = 900;

  return (
    <div className="wf-stage">
      <div>
        <div className="wf-proto-label">1 · Timeline Spine — closest to existing meeting page</div>
        <div className="wf" style={{ width: W }}>
          <TopicHeader />

          {/* Upper context strip */}
          <div className="row" style={{ borderBottom: "1px solid var(--rule)" }}>
            <div style={{ flex: 1, padding: "16px 22px", borderRight: "1px solid var(--rule)" }}>
              <TopicSummary />
            </div>
            <div style={{ width: 360, padding: "16px 18px" }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Where we are</div>
              <div className="status">
                <span className="badge">Pending</span>
                <span style={{ fontSize: 12 }}>Outreach plan due back to Council in May.</span>
              </div>
              <div style={{ marginTop: 10 }}><SentimentBar /></div>
            </div>
          </div>

          {/* 3-column body */}
          <div className="row" style={{ height: H - 220 }}>
            {/* LEFT — vertical meeting timeline */}
            <div className="col" style={{ width: 280, borderRight: "1px solid var(--rule)", padding: "14px 14px 14px 18px", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="lbl">Meetings</div>
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{MEETINGS.length}</span>
              </div>
              <div className="vtl" style={{ marginTop: 12 }}>
                {MEETINGS.slice().reverse().map((m, i) => (
                  <div key={m.id} className={`vtl-node ${i === 0 ? "now" : ""}`}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: i === 1 ? "var(--accent)" : "var(--ink)" }}>{m.short}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-3)", lineHeight: 1.35 }}>{m.tag}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CENTER — active meeting context */}
            <div className="col" style={{ flex: 1, padding: 18, gap: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div>
                  <div className="lbl">Dec 17 '25 · Vote 5–0</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Approved Professional Services agreement, BOA Architecture (≤ $89,000)</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="btn">← prev</span>
                  <span className="btn">next →</span>
                </div>
              </div>
              <VideoSlot label="Dec 17 '25 · 32:18 — Motion" height={210} />
              <div className="tabs">
                <span className="tab active">Discussion</span>
                <span className="tab">Transcript</span>
                <span className="tab">Motion</span>
                <span className="tab">Public Comment</span>
              </div>
              <div className="col" style={{ gap: 10, overflow: "hidden" }}>
                <div className="quote">
                  &ldquo;I personally would want to see this come to fruition.&rdquo;
                  <span className="who">Jose Sanchez · 32:44</span>
                </div>
                <div className="quote">
                  &ldquo;I feel like this is going to have a pretty big impact on the community.&rdquo;
                  <span className="who">Elizabeth Yang · 35:02</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="ts">32:18</span>
                  <span className="ts">33:40</span>
                  <span className="ts">35:02</span>
                  <span className="ts">44:02</span>
                </div>
              </div>
            </div>

            {/* RIGHT — tabbed reference */}
            <div className="col" style={{ width: 320, borderLeft: "1px solid var(--rule)", padding: 16, gap: 10 }}>
              <div className="lbl">Reference</div>
              <div className="tabs">
                <span className="tab">Docs</span>
                <span className="tab active">Speakers</span>
                <span className="tab">Public</span>
                <span className="tab">Related</span>
              </div>
              <div className="col" style={{ marginTop: 4 }}>
                {SPEAKERS.slice(0, 6).map((s) => <SpeakerRow key={s.name} s={s} showStance />)}
              </div>
              <div className="hrule dashed" />
              <EmptyHint title="no documents on this date">
                Filter is set to &ldquo;this meeting.&rdquo; Try All meetings.
              </EmptyHint>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
