import {
  TopicHeader, VideoSlot, SpeakerRow,
  MEETINGS, SPEAKERS, RELATED,
} from "../components";

const QUOTES = [
  { who: "Jose Sanchez", when: "Dec 17 '25 · 32:44", q: "I personally would want to see this come to fruition.", st: "support" },
  { who: "Elizabeth Yang", when: "Sep 17 '24 · 24:10", q: "I feel like this is going to have a pretty big impact on the community.", st: "concern" },
  { who: "Henry Lo", when: "Dec 17 '25 · 33:21", q: "We still have not gone, I think, a lot of clarity about…", st: "support" },
  { who: "Shawn Igoe", when: "Sep 17 '24 · 58:02", q: "We could fold this into the larger re-striping project to reduce cost.", st: "neutral" },
  { who: "Thomas Wong", when: "Sep 17 '24 · 25:30", q: "I don't want isolated, non-connected segments creating backlash.", st: "concern" },
];

const stanceColor: Record<string, string> = {
  support: "var(--hl-2)",
  concern: "var(--hl-3)",
  neutral: "var(--rule-soft)",
};

export default function Prototype5() {
  const W = 1200;
  const H = 900;

  return (
    <div className="wf-stage">
      <div>
        <div className="wf-proto-label">5 · Stakeholder-Forward — people are the entry point</div>
        <div className="wf" style={{ width: W }}>
          <TopicHeader />

          {/* Speakers band up top */}
          <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--rule)", background: "rgba(0,0,0,.015)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <div className="lbl">Who&apos;s been saying what</div>
              <div className="hand-tight" style={{ fontSize: 12, color: "var(--ink-3)" }}>tap a person → filter the page to their moments</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 }}>
              {SPEAKERS.map((s) => (
                <div key={s.name} className="card" style={{ padding: "8px 10px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--ink-4)", color: "var(--paper)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{s.init}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                      <div style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{s.role}</div>
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 4, borderRadius: 2, background: stanceColor[s.stance] ?? "var(--rule-soft)" }} />
                  <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{s.mentions} mentions</div>
                </div>
              ))}
            </div>
          </div>

          <div className="row" style={{ height: H - 290 }}>
            {/* LEFT — quotes & moments */}
            <div className="col" style={{ flex: 1.4, padding: 18, gap: 10, borderRight: "1px solid var(--rule)" }}>
              <div className="lbl">Quotes &amp; moments</div>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="pill active">all speakers</span>
                <span className="pill">support</span>
                <span className="pill">concern</span>
                <span className="pill">staff</span>
              </div>
              <div className="col" style={{ gap: 10, overflow: "hidden" }}>
                {QUOTES.map((q, i) => (
                  <div key={i} className="card" style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontWeight: 600, fontSize: 11.5 }}>{q.who}</div>
                      <span className="ts">{q.when.split(" · ")[1]}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{q.when.split(" · ")[0]}</div>
                    <div className="hand" style={{ fontSize: 17, lineHeight: 1.15, marginTop: 6 }}>&ldquo;{q.q}&rdquo;</div>
                    <div style={{ marginTop: 6, width: 36, height: 4, borderRadius: 2, background: stanceColor[q.st] ?? "var(--rule-soft)" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — video + meeting list */}
            <div className="col" style={{ width: 320, padding: 18, gap: 12 }}>
              <VideoSlot empty height={170} />
              <div className="tabs">
                <span className="tab active">Meetings</span>
                <span className="tab">Docs</span>
                <span className="tab">Public</span>
              </div>
              <div className="vtl" style={{ marginTop: 4 }}>
                {MEETINGS.slice(-4).reverse().map((m, i) => (
                  <div key={m.id} className={`vtl-node ${i === 0 ? "now" : ""}`}>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{m.short}</div>
                    <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{m.tag}</div>
                  </div>
                ))}
              </div>
              <div className="hrule dashed" />
              <div>
                <div className="eyebrow" style={{ marginBottom: 6 }}>Related topics</div>
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
