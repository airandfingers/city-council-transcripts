import { TOPIC, MEETINGS, NEXT_STEPS } from "../data";

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

export default function PrototypeM7b() {
  const MW = 390;
  const MH = 844;

  return (
    <div className="wf-stage-mobile">
      <div>
        <div className="wf-proto-label">M7b · Brief + Action — Status hero, then take action</div>
        <div className="wf" style={{ width: MW, height: MH, borderRadius: 38, padding: 0, overflow: "hidden", position: "relative" }}>
          {/* Status bar */}
          <div style={{ height: 38, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 22px 0", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--ink-2)" }}>
            <span>9:41</span>
            <span>●●● ▮</span>
          </div>

          {/* Status hero — yellow bg */}
          <div style={{ padding: "10px 18px 14px", background: "var(--hl)", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: 10 }}>
              <span style={{ display: "inline-block", width: 12, height: 12, border: "1.2px solid var(--ink)" }} />
              <span>Topics</span><span style={{ opacity: 0.5 }}>›</span>
            </div>
            <div className="hand" style={{ fontSize: 20, lineHeight: 1.05, marginTop: 4 }}>{TOPIC.title}</div>
            <div className="eyebrow" style={{ marginTop: 10 }}>Where it stands</div>
            <div className="hand" style={{ fontSize: 20, lineHeight: 1.05, marginTop: 2 }}>
              Awaiting <span className="scribble">outreach plan</span> · May &lsquo;26
            </div>
          </div>

          {/* Take action section */}
          <div style={{ padding: "12px 14px 4px" }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Take action</div>

            {/* Email form */}
            <div className="card" style={{ padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>📬 Email alerts</div>
              <div style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 6 }}>Notify me when this returns to an agenda.</div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1, height: 26, border: "1px solid var(--rule)", borderRadius: 3, background: "var(--paper)", display: "flex", alignItems: "center", padding: "0 8px", fontSize: 10.5, color: "var(--ink-3)" }}>your@email</div>
                <span className="btn solid" style={{ padding: "4px 10px" }}>Subscribe</span>
              </div>
            </div>

            {/* Contact council */}
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600 }}>✉ Contact your council member</div>
                <div style={{ fontSize: 10, color: "var(--ink-3)" }}>District 3 · Henry Lo</div>
              </div>
              <span style={{ fontSize: 16, color: "var(--ink-3)" }}>›</span>
            </div>

            {/* Organize */}
            <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px" }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600 }}>👥 Organize online</div>
                <div style={{ fontSize: 10, color: "var(--ink-3)" }}>2 active groups · 47 residents</div>
              </div>
              <span style={{ fontSize: 16, color: "var(--ink-3)" }}>›</span>
            </div>
          </div>

          {/* Collapsed history */}
          <div style={{ padding: "12px 16px 4px", marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px solid var(--rule)" }}>
            <div className="eyebrow">History · 7</div>
            <span className="hand-tight" style={{ fontSize: 11, color: "var(--accent)" }}>expand ↓</span>
          </div>
          <div style={{ padding: "0 16px 70px", overflow: "hidden" }}>
            {MEETINGS.slice().reverse().slice(0, 2).map((m) => (
              <div key={m.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--rule-soft)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{m.short}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-3)" }}>{m.tag}</div>
                </div>
                <span style={{ fontSize: 14, color: "var(--ink-3)" }}>›</span>
              </div>
            ))}
          </div>

          <MBottomNav active={0} />
        </div>
      </div>
    </div>
  );
}
