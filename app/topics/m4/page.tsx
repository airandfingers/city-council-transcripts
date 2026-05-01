import { TOPIC, MEETINGS } from "../data";
import { WireMeetingCard } from "../components";

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

export default function PrototypeM4() {
  const MW = 390;
  const MH = 844;

  return (
    <div className="wf-stage-mobile">
      <div>
        <div className="wf-proto-label">M4 · Feed — All meetings, scroll to read</div>
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

          {/* Filter row */}
          <div style={{ padding: "8px 16px", display: "flex", gap: 6, overflowX: "auto", borderBottom: "1px solid var(--rule)", background: "rgba(0,0,0,.015)", flexShrink: 0 }}>
            <span className="pill active">All · 7</span>
            <span className="pill">Decisions · 1</span>
            <span className="pill">Public · 1</span>
            <span className="pill">Pending · 1</span>
            <span className="pill">Discussion · 4</span>
          </div>

          {/* Meeting cards feed */}
          <div style={{ padding: "10px 14px 70px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 8 }}>
            <WireMeetingCard m={MEETINGS[6]} dense />
            <WireMeetingCard m={MEETINGS[5]} dense />
            <WireMeetingCard m={MEETINGS[4]} dense />
            <WireMeetingCard m={MEETINGS[3]} dense />
          </div>

          <MBottomNav active={1} />
        </div>
      </div>
    </div>
  );
}
