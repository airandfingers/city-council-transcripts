import { TOPIC, MEETINGS } from "../data";

function MBottomNav({ active = 0 }: { active?: number }) {
  const items = ["Summary", "History", "People", "Refs"];
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      borderTop: "1px solid var(--rule)", background: "var(--paper)",
      display: "flex", justifyContent: "space-around", padding: "8px 0 18px",
    }}>
      {items.map((l, i) => (
        <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: i === active ? "var(--ink)" : "var(--ink-3)", fontSize: 9.5 }}>
          <span style={{ width: 18, height: 18, border: "1.2px solid currentColor", borderRadius: i === 0 ? 4 : 9, opacity: i === active ? 1 : 0.55 }} />
          <span style={{ fontWeight: i === active ? 600 : 400 }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

export default function PrototypeM1() {
  const MW = 390;
  const MH = 844;

  return (
    <div className="wf-stage-mobile">
      <div>
        <div className="wf-proto-label">M1 · Spine — Timeline IS the page</div>
        <div className="wf" style={{ width: MW, height: MH, borderRadius: 38, padding: 0, overflow: "hidden", position: "relative" }}>
          {/* Status bar */}
          <div style={{ height: 38, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 22px 0", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-2)" }}>
            <span>9:41</span>
            <span>●●● ▮</span>
          </div>

          {/* Title bar */}
          <div style={{ padding: "4px 18px 8px", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-3)", fontSize: 10.5 }}>
              <span style={{ display: "inline-block", width: 12, height: 12, border: "1.2px solid var(--ink)" }} />
              <span>Topics</span><span style={{ opacity: 0.5 }}>›</span>
            </div>
            <div className="hand" style={{ fontSize: 22, lineHeight: 1.05, marginTop: 4 }}>{TOPIC.title}</div>
          </div>

          {/* Header */}
          <div style={{ padding: "10px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="lbl">7 meetings</div>
            <div style={{ display: "flex", gap: 4 }}>
              <span className="pill active" style={{ fontSize: 9.5 }}>newest</span>
              <span className="pill" style={{ fontSize: 9.5 }}>oldest</span>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ padding: "8px 16px 140px", overflow: "hidden", flex: 1 }}>
            <div className="vtl">
              {MEETINGS.slice().reverse().slice(0, 5).map((m, i) => (
                <div key={m.id} className={`vtl-node ${i === 0 ? "now" : ""}`} style={{ paddingBottom: i === 1 ? 18 : 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600 }}>{m.short}</div>
                    {m.timestamps[0] && <span className="ts">{m.timestamps[0]}</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}>{m.tag}</div>
                  {/* expanded card at i===1 */}
                  {i === 1 && (
                    <div className="card" style={{ marginTop: 8, padding: "10px 12px", background: "var(--hl)" }}>
                      <div style={{ fontSize: 11, color: "var(--ink-2)", lineHeight: 1.5 }}>
                        {m.summary}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {m.timestamps.map((t) => <span key={t} className="ts">{t}</span>)}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        {m.speakers.slice(0, 3).map((s) => (
                          <span key={s} style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--ink-4)", color: "var(--paper)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 600 }}>{s.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pinned status footer */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 60, padding: "10px 16px", background: "var(--paper)", borderTop: "1px solid var(--rule)" }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Where it stands</div>
            <div className="hand" style={{ fontSize: 15, lineHeight: 1.1 }}>Awaiting outreach plan · May &lsquo;26</div>
          </div>
          <MBottomNav active={1} />
        </div>
      </div>
    </div>
  );
}
