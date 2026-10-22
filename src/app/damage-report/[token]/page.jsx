"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

// Public page where the customer CONFIRMS what was agreed after the vehicle damages report:  /damage-report/<token>
// Put this file at  src/app/damage-report/[token]/page.jsx  (OUTSIDE the (admin) group, so it needs no login).
// API: NEXT_PUBLIC_API_URL, else NEXT_PUBLIC_BASE_URL  +  NEXT_PUBLIC_DAMAGE_API_PATH (default: same prefix as the evidence report, "/evidence")
const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
// The page finds the backend route by itself: it tries the configured prefix first, then "/evidence" and "/api".
// (A "route does not exist" 404 moves on to the next prefix; only the API's own "Report not found" ends the search.)
const CONFIGURED = process.env.NEXT_PUBLIC_DAMAGE_API_PATH ?? process.env.NEXT_PUBLIC_EVIDENCE_API_PATH;
const PREFIXES = [...new Set([CONFIGURED, "/damagereport", "/api"].filter((p) => p !== undefined))];
const LOGO = "/images/mainlogo.jpeg";
const COMPANY = "AUTO PRO MAX";
const ACTION = { REPAIR: "Repair", DEEP_CHECK: "Deep check", BOTH: "Repair + Deep check" };

const css = `
:root{--ink:#1c1917;--muted:#78716c;--line:#e7e2dc;--paper:#fff;--bg:#f6f4f1;--brand:#8f0b0b;--brand-d:#5e0404;--gold:#a8864f;--ok:#2f6f4f;--ok-bg:#eaf3ee;--bad:#a61b1b;--bad-bg:#fbeaea}
*{box-sizing:border-box}
body{margin:0;background:var(--bg)}
.dr{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);line-height:1.5;-webkit-font-smoothing:antialiased}
.dr .serif{font-family:"Playfair Display","Cormorant Garamond",Georgia,"Times New Roman",serif}
.dr-top{background:var(--paper);border-bottom:1px solid var(--line)}
.dr-top-in{max-width:720px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.dr-logo{height:44px;width:auto;display:block;object-fit:contain}
.dr-brand{letter-spacing:.28em;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase}
.dr-hero{background:linear-gradient(135deg,var(--brand),var(--brand-d));color:#fff;position:relative}
.dr-hero:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
.dr-hero-in{max-width:720px;margin:0 auto;padding:36px 20px 34px}
.dr-eyebrow{letter-spacing:.3em;font-size:11px;text-transform:uppercase;color:#f1d9d9;font-weight:600}
.dr-title{font-size:clamp(26px,5vw,36px);font-weight:600;margin:8px 0 0}
.dr-meta{display:flex;gap:28px;flex-wrap:wrap;margin-top:22px}
.dr-meta dt{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#f1d9d9;margin:0 0 3px}
.dr-meta dd{margin:0;font-size:17px;font-weight:600}
.dr-wrap{max-width:720px;margin:0 auto;padding:26px 20px 56px}
.dr-h{display:flex;align-items:center;gap:14px;margin:26px 0 6px;font-size:20px;font-weight:600}
.dr-h:after{content:"";flex:1;height:1px;background:var(--line)}
.dr-sub{color:var(--muted);font-size:13px;margin:0 0 12px}
.dr-card{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.dr-list{margin:0;padding:0;list-style:none;counter-reset:d}
.dr-list li{counter-increment:d;display:flex;gap:12px;align-items:flex-start;padding:14px 18px;border-bottom:1px solid var(--line)}
.dr-list li:last-child{border-bottom:0}
.dr-list li:before{content:counter(d,lower-alpha) ".";font-weight:700;color:var(--brand);min-width:20px}
.dr-list .t{flex:1}
.dr-media{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.dr-media a{position:relative;display:block;width:84px;height:84px;border-radius:10px;overflow:hidden;background:#1c1917;border:1px solid var(--line)}
.dr-media img,.dr-media video{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.dr-media i{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-style:normal;font-size:24px;background:rgba(0,0,0,.25)}
.dr-pill{font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;white-space:nowrap;background:#f3ede4;color:#6b5320}
.dr-q{display:flex;flex-wrap:wrap;gap:10px;margin-top:2px}
.dr-chip{font-size:13px;font-weight:600;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:#fff}
.dr-chip.yes{background:var(--ok-bg);color:var(--ok);border-color:transparent}
.dr-note{width:100%;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;resize:vertical;min-height:70px}
.dr-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
@media(max-width:480px){.dr-actions{grid-template-columns:1fr}}
.dr-btn{border:0;border-radius:14px;padding:15px 18px;font-size:16px;font-weight:700;cursor:pointer}
.dr-btn:disabled{opacity:.6;cursor:default}
.dr-yes{background:var(--ok);color:#fff}
.dr-no{background:#fff;color:var(--bad);border:1.5px solid var(--bad)}
.dr-done{display:flex;gap:12px;align-items:center;border-radius:14px;padding:16px 18px;font-weight:600;margin-top:18px}
.dr-done.ok{background:var(--ok-bg);color:var(--ok)} .dr-done.bad{background:var(--bad-bg);color:var(--bad)}
.dr-err{color:var(--bad);font-size:14px;margin-top:10px}
.dr-foot{margin-top:40px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:12.5px;text-align:center}
.dr-foot b{color:var(--ink);letter-spacing:.2em}
.dr-center{max-width:480px;margin:14vh auto;padding:0 24px;text-align:center}
`;

export default function DamageReportConfirmPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | notfound | error
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const prefixRef = useRef(PREFIXES[0]); // the prefix that worked
  const [tried, setTried] = useState([]); // what was tried (shown only with ?debug=1 at the end of the address)

  const load = async () => {
    try {
      let reportMissing = false;
      const log = [];
      setTried(log);
      for (const prefix of PREFIXES) {
        const url = `${API}${prefix}/public/damage-report/${encodeURIComponent(token)}`;
        let res;
        try {
          res = await fetch(url, { cache: "no-store" });
        } catch (e) {
          log.push(`${url} -> network error (${e.message})`);
          continue;
        }
        log.push(`${url} -> ${res.status}`);
        if (res.ok) {
          prefixRef.current = prefix;
          setData(await res.json());
          return setState("ready");
        }
        if (res.status === 404) {
          const body = await res.json().catch(() => null);
          if (body?.message === "Report not found") reportMissing = true; // the route exists, this token does not
          continue; // route not found at this prefix -> try the next one
        }
        continue; // 401 / 403 / 500 ...: note it and try the next prefix
      }
      setState(reportMissing ? "notfound" : "error");
    } catch (_) {
      setState("error");
    }
  };
  useEffect(() => { if (token) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const answer = async (decision) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}${prefixRef.current}/public/damage-report/${encodeURIComponent(token)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 409) throw new Error(body.message || "Could not save your answer.");
      await load();
    } catch (e) {
      setError(e.message || "Could not save your answer.");
    } finally {
      setBusy(false);
    }
  };

  const Shell = ({ children }) => (
    <div className="dr">
      <style>{css}</style>
      {children}
    </div>
  );

  if (state === "loading") return <Shell><div className="dr-center">Loading...</div></Shell>;
  if (state === "notfound") return <Shell><div className="dr-center"><h2 className="serif">Link not found</h2><p style={{ color: "var(--muted)" }}>This link is not valid or is no longer available. Please contact {COMPANY}.</p></div></Shell>;
  if (state === "error") {
    const debug = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
    return (
      <Shell>
        <div className="dr-center">
          <h2 className="serif">Something went wrong</h2>
          <p style={{ color: "var(--muted)" }}>Please try again in a moment.</p>
          {debug && <pre style={{ textAlign: "left", fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "var(--muted)" }}>{tried.join("\n")}</pre>}
        </div>
      </Shell>
    );
  }

  const d = data;
  const asked = [d.needDeepCheck && "a deep check of the damage", d.needRepair && "repair of the damage"].filter(Boolean).join(" and ");

  return (
    <Shell>
      <header className="dr-top">
        <div className="dr-top-in">
          <img className="dr-logo" src={LOGO} alt={COMPANY} />
          <span className="dr-brand">{COMPANY}</span>
        </div>
      </header>

      <section className="dr-hero">
        <div className="dr-hero-in">
          <div className="dr-eyebrow">{d.agreed?.length ? "Please confirm" : "Vehicle report"}</div>
          <h1 className="dr-title serif">{d.agreed?.length ? "Agreed work on your vehicle" : "Damages found on your vehicle"}</h1>
          <dl className="dr-meta">
            <div><dt>Vehicle</dt><dd>{d.regNo || "-"}</dd></div>
            <div><dt>Job</dt><dd>{d.jobNo}</dd></div>
            {d.departmentName && <div><dt>Department</dt><dd>{d.departmentName}</dd></div>}
          </dl>
        </div>
      </section>

      <main className="dr-wrap">
        {d.damages?.length > 0 && (
          <>
            <h2 className="dr-h serif">Damage found</h2>
            <div className="dr-card">
              <ol className="dr-list">
                {d.damages.map((x, i) => (
                  <li key={i}>
                    <span className="t">
                      {x.description}
                      {x.files?.length > 0 && (
                        <span className="dr-media">
                          {x.files.map((f, k) => (
                            <a key={k} href={f.fileUrl} target="_blank" rel="noopener noreferrer" title={f.fileName}>
                              {f.fileType === "VIDEO"
                                ? <video src={f.fileUrl} muted playsInline preload="metadata" />
                                : <img src={f.fileUrl} alt={f.fileName} />}
                              {f.fileType === "VIDEO" && <i>▶</i>}
                            </a>
                          ))}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        {!d.agreed?.length ? (
          <p className="dr-sub">Our team will contact you about the next steps.</p>
        ) : (
          <>
        <h2 className="dr-h serif">What was agreed</h2>
        <p className="dr-sub">You asked for {asked || "the work below"}. Please check the list and confirm.</p>
        <div className="dr-card">
          <ol className="dr-list">
            {d.agreed.map((a, i) => (
              <li key={i}><span className="t">{a.description}</span><span className="dr-pill">{ACTION[a.action] || a.action}</span></li>
            ))}
          </ol>
        </div>

        {d.decision ? (
          <div className={`dr-done ${d.decision === "CONFIRMED" ? "ok" : "bad"}`}>
            <span style={{ fontSize: 26 }}>{d.decision === "CONFIRMED" ? "✓" : "✕"}</span>
            <span>
              {d.decision === "CONFIRMED" ? "Thank you. You confirmed this work." : "You declined this work. Our team will contact you."}
              {d.decidedAt && <div style={{ fontWeight: 400, fontSize: 13 }}>{new Date(d.decidedAt).toLocaleString()}</div>}
              {d.customerNote && <div style={{ fontWeight: 400, fontSize: 14 }}>“{d.customerNote}”</div>}
            </span>
          </div>
        ) : (
          <>
            <h2 className="dr-h serif">Your answer</h2>
            <textarea className="dr-note" maxLength={500} placeholder="Add a message (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="dr-actions">
              <button className="dr-btn dr-yes" disabled={busy} onClick={() => answer("CONFIRMED")}>Yes, I confirm</button>
              <button className="dr-btn dr-no" disabled={busy} onClick={() => answer("DECLINED")}>No, I do not agree</button>
            </div>
            {error && <div className="dr-err">{error}</div>}
          </>
        )}

          </>
        )}

        <footer className="dr-foot"><b>{COMPANY}</b><div>This page is private to you. Please do not share the link.</div></footer>
      </main>
    </Shell>
  );
}