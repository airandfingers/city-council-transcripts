import {
  TopicHeader, VideoSlot, SpeakerRow, NextStepsList, SentimentBar,
  MEETINGS, SPEAKERS, RELATED,
} from "../components";

export default function Prototype7() {
  const W = 1200;
  const H = 900;

  return (
    <div className="wf-stage">
      <div>
        <div className="wf-proto-label">7 · Living Brief — status-forward, history collapsed</div>
        <div className="wf" style={{ width: W }}>
          <TopicHeader />

          {/* Hero status block */}
          <div className="row" style={{ borderBottom: "1px solid var(--rule)" }}>
            <div className="col" style={{ flex: 1.4, padding: "20px 22px", gap: 12 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Where it stands today</div>
                <div className="hand" style={{ fontSize: 28, lineHeight: 1.05 }}>
                  Awaiting <span className="scribble">community-outreach plan</span> before next reading.
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.5 }}>
                  On Apr 15 &lsquo;26, Council asked staff to return in May with a plan before voting on construction.
                  The Professional Services agreement with BOA Architecture (≤ $89,000) was already approved 5–0
                  on Dec 17 &lsquo;25.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span className="ts">Apr 15 &lsquo;26 · 55:30</span>
                <span className="ts">Dec 17 &lsquo;25 · 32:18</span>
              </div>
            </div>
            <div className="col" style={{ width: 380, padding: "20px 22px", borderLeft: "1px solid var(--rule)", gap: 10 }}>
              <div className="eyebrow">What&apos;s next</div>
              <NextStepsList />
              <div className="hrule dashed" />
              <SentimentBar />
            </div>
          </div>

          {/* Lower section */}
          <div className="row" style={{ height: H - 320 }}>
            {/* LEFT — history timeline */}
            <div className="col" style={{ flex: 1, padding: "16px 22px", gap: 12, borderRight: "1px solid var(--rule)" }}>
              <div className="tabs">
                <span className="tab active">History</span>
                <span className="tab">All discussion</span>
                <span className="tab">Public comment</span>
                <span className="tab">Documents</span>
              </div>
              <div className="vtl" style={{ marginTop: 4 }}>
                {MEETINGS.slice().reverse().map((m, i) => (
                  <div key={m.id} className={`vtl-node ${i === 0 ? "now" : ""}`} style={{ paddingBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600 }}>
                        {m.short} · <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>{m.tag}</span>
                      </div>
                      {m.timestamps[0] && <span className="ts">{m.timestamps[0]}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.45 }}>{m.summary}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — sidebar */}
            <div className="col" style={{ width: 360, padding: "16px 22px", gap: 12 }}>
              <VideoSlot empty height={150} />
              <div className="hand-tight" style={{ fontSize: 11, color: "var(--ink-3)" }}>video opens on first timestamp tap</div>
              <div className="hrule dashed" />
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Speakers</div>
                {SPEAKERS.slice(0, 4).map((s) => <SpeakerRow key={s.name} s={s} showStance />)}
                <span className="btn" style={{ marginTop: 4 }}>see all 8 →</span>
              </div>
              <div className="hrule dashed" />
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Related</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {RELATED.map((r) => <span key={r} className="tag">{r}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
