"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

// Public, read-only VEHICLE EVIDENCE REPORT for the customer:  /evidence/<token>
// Put this file at  src/app/evidence/[token]/page.jsx  (OUTSIDE the (admin) group, so it needs no login).
// Logo: public/images/mainlogo.jpeg  (served as /images/mainlogo.jpeg)
// API: NEXT_PUBLIC_API_URL, else NEXT_PUBLIC_BASE_URL (backend address)  +  NEXT_PUBLIC_EVIDENCE_API_PATH (default "/evidence")
const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
const PREFIX = process.env.NEXT_PUBLIC_EVIDENCE_API_PATH ?? "/evidence";
const LOGO = "/images/mainlogo.jpeg";
const COMPANY = "AUTO PRO MAX";

const COND = { OK: ["Satisfactory", "ok"], DAMAGED: ["Damage noted", "bad"], NA: ["Not applicable", "na"] };

const css = `
:root{--ink:#1c1917;--muted:#78716c;--line:#e7e2dc;--paper:#ffffff;--bg:#f6f4f1;--brand:#8f0b0b;--brand-d:#5e0404;--gold:#a8864f;--ok:#2f6f4f;--ok-bg:#eaf3ee;--bad:#a61b1b;--bad-bg:#fbeaea;--na:#6b7280;--na-bg:#f0f0f0}
*{box-sizing:border-box}
body{margin:0;background:var(--bg)}
.ev{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);line-height:1.5;-webkit-font-smoothing:antialiased}
.ev .serif{font-family:"Playfair Display","Cormorant Garamond",Georgia,"Times New Roman",serif}
.ev-top{background:var(--paper);border-bottom:1px solid var(--line)}
.ev-top-in{max-width:960px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.ev-logo{height:46px;width:auto;display:block;object-fit:contain}
.ev-brand{letter-spacing:.28em;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase}
.ev-hero{background:linear-gradient(135deg,var(--brand) 0%,var(--brand-d) 100%);color:#fff;position:relative}
.ev-hero:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
.ev-hero-in{max-width:960px;margin:0 auto;padding:44px 24px 40px}
.ev-eyebrow{letter-spacing:.3em;font-size:11px;text-transform:uppercase;color:#f1d9d9;font-weight:600}
.ev-title{font-size:clamp(28px,5vw,40px);font-weight:600;margin:8px 0 0;letter-spacing:.01em}
.ev-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:20px;margin-top:28px}
.ev-meta dt{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#f1d9d9;margin:0 0 4px}
.ev-meta dd{margin:0;font-size:17px;font-weight:600;letter-spacing:.02em}
.ev-wrap{max-width:960px;margin:0 auto;padding:0 24px 56px}
.ev-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:-26px 0 28px;position:relative;z-index:2}
.ev-stat{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:16px 18px;box-shadow:0 8px 24px rgba(28,25,23,.06)}
.ev-stat b{display:block;font-size:28px;line-height:1.1;font-weight:700}
.ev-stat span{font-size:12px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase}
.ev-stat.ok b{color:var(--ok)} .ev-stat.bad b{color:var(--bad)}
.ev-banner{display:flex;align-items:center;gap:12px;border-radius:14px;padding:14px 18px;margin-bottom:28px;font-weight:600}
.ev-banner.ok{background:var(--ok-bg);color:var(--ok)} .ev-banner.bad{background:var(--bad-bg);color:var(--bad)}
.ev-sec{margin-top:36px}
.ev-h{display:flex;align-items:center;gap:14px;margin:0 0 6px;font-size:22px;font-weight:600}
.ev-h:after{content:"";flex:1;height:1px;background:var(--line)}
.ev-sub{color:var(--muted);font-size:13px;margin:0 0 16px}
.ev-card{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.ev-row{padding:16px 20px;border-bottom:1px solid var(--line)}
.ev-row:last-child{border-bottom:0}
.ev-row-h{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.ev-row-n{font-weight:600;font-size:16px}
.ev-pill{font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;letter-spacing:.02em;white-space:nowrap}
.ev-pill.ok{background:var(--ok-bg);color:var(--ok)} .ev-pill.bad{background:var(--bad-bg);color:var(--bad)} .ev-pill.na{background:var(--na-bg);color:var(--na)}
.ev-tags{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);margin-top:4px}
.ev-note{margin-top:8px;font-size:14.5px;background:#faf8f5;border-left:3px solid var(--gold);padding:8px 12px;border-radius:0 8px 8px 0}
.ev-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-top:12px}
.ev-th{position:relative;aspect-ratio:1/1;border-radius:10px;overflow:hidden;background:#1c1917;border:1px solid var(--line);cursor:pointer;padding:0}
.ev-th img,.ev-th video{width:100%;height:100%;object-fit:cover;display:block}
.ev-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(0,0,0,.25);font-size:30px}
.ev-list{margin:0;padding:0;list-style:none;counter-reset:d}
.ev-list li{counter-increment:d;display:flex;gap:14px;padding:14px 20px;border-bottom:1px solid var(--line)}
.ev-list li:last-child{border-bottom:0}
.ev-list li:before{content:counter(d,lower-alpha) ".";font-weight:700;color:var(--brand);min-width:20px}
.ev-empty{padding:18px 20px;color:var(--muted)}
.ev-text{padding:18px 20px;white-space:pre-wrap}
.ev-foot{margin-top:44px;padding-top:22px;border-top:1px solid var(--line);color:var(--muted);font-size:12.5px;text-align:center}
.ev-foot b{color:var(--ink);letter-spacing:.2em}
.ev-btn{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;color:var(--ink)}
.ev-btn:hover{border-color:var(--brand);color:var(--brand)}
.ev-lb{position:fixed;inset:0;z-index:50;background:rgba(10,8,7,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px}
.ev-lb img,.ev-lb video{max-width:100%;max-height:82vh;border-radius:8px}
.ev-lb-x{position:absolute;top:14px;right:16px;color:#fff;background:transparent;border:0;font-size:34px;cursor:pointer;line-height:1}
.ev-lb-c{color:#d6d3d1;font-size:12px;margin-top:10px;word-break:break-all;text-align:center}
.ev-center{max-width:520px;margin:12vh auto;padding:0 24px;text-align:center}
.ev-skel{height:14px;border-radius:7px;background:linear-gradient(90deg,#eee,#f7f5f2,#eee);background-size:200% 100%;animation:sk 1.2s infinite}
@keyframes sk{to{background-position:-200% 0}}
@media print{body{background:#fff}.ev-noprint{display:none!important}.ev-hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}.ev-card,.ev-stat{box-shadow:none}.ev-row,.ev-list li{break-inside:avoid}.ev-stats{margin-top:16px}}
`;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "");
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");

function Gallery({ files, onOpen }) {
  if (!files.length) return null;
  return (
    <div className="ev-gal">
      {files.map((f) => (
        <button key={f.id} type="button" className="ev-th" onClick={() => onOpen(f)} title={f.fileName} aria-label={`Open ${f.fileType === "VIDEO" ? "video" : "photo"}`}>
          {f.fileType === "VIDEO" ? (
            <>
              <video src={f.fileUrl} muted playsInline preload="metadata" style={{ pointerEvents: "none" }} />
              <span className="ev-play">&#9658;</span>
            </>
          ) : (
            <img src={f.fileUrl} alt={f.fileName} loading="lazy" />
          )}
        </button>
      ))}
    </div>
  );
}

export default function EvidenceReportPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    fetch(`${API}${PREFIX}/public/vehicle-evidence/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.message || "Report not found");
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const c = (k) => data.items.filter((i) => i.condition === k).length;
    return {
      total: data.items.length, ok: c("OK"), bad: c("DAMAGED"),
      media: (data.files || []).length,
      damaged: c("DAMAGED") > 0 || data.damages.length > 0,
    };
  }, [data]);

  const header = (
    <header className="ev-top">
      <div className="ev-top-in">
        {logoOk ? <img className="ev-logo" src={LOGO} alt={COMPANY} onError={() => setLogoOk(false)} /> : <span className="serif" style={{ fontSize: 22, fontWeight: 700, letterSpacing: ".12em" }}>{COMPANY}</span>}
        <span className="ev-brand">Vehicle Evidence Report</span>
      </div>
    </header>
  );

  if (error) {
    return (
      <div className="ev"><style>{css}</style>{header}
        <div className="ev-center">
          <h2 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Report unavailable</h2>
          <p style={{ color: "var(--muted)" }}>{error === "Report not found" ? "This link is not valid or the report is no longer available. Please contact us for a new link." : error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ev"><style>{css}</style>{header}
        <div className="ev-center" style={{ textAlign: "left" }}>
          <div className="ev-skel" style={{ width: "60%", marginBottom: 14 }} />
          <div className="ev-skel" style={{ width: "90%", marginBottom: 14 }} />
          <div className="ev-skel" style={{ width: "75%" }} />
        </div>
      </div>
    );
  }

  const byItem = (id) => (id ? (data.files || []).filter((f) => f.itemId === id) : []);
  const isProp = (f) => f.category === "PROPERTY";
  const general = (data.files || []).filter((f) => !isProp(f) && (!f.itemId || data.evidenceMode === "UPLOAD_ONLY"));
  const propFiles = (data.files || []).filter(isProp);
  const uploadOnly = data.evidenceMode === "UPLOAD_ONLY"; // photos / videos per checklist area (no conditions)
  const photosOnly = data.evidenceMode === "PHOTOS_ONLY" || uploadOnly; // the department only records photos / videos
  const areas = []; // (not used any more: UPLOAD_ONLY shows every photo / video in one gallery)

  return (
    <div className="ev">
      <style>{css}</style>
      {header}

      <section className="ev-hero">
        <div className="ev-hero-in">
          <div className="ev-eyebrow">{data.departmentName ? `${data.departmentName} Department` : "Service Department"}</div>
          <h1 className="ev-title serif">Vehicle Evidence Report</h1>
          <dl className="ev-meta">
            <div><dt>Vehicle</dt><dd>{data.regNo}</dd></div>
            <div><dt>Job number</dt><dd>{data.jobNo}</dd></div>
            <div><dt>Inspection date</dt><dd>{fmtDate(data.updatedAt)}</dd></div>
            <div><dt>Time</dt><dd>{fmtTime(data.updatedAt)}</dd></div>
          </dl>
        </div>
      </section>

      <main className="ev-wrap">
        {photosOnly ? (
          <div className="ev-stats" style={{ marginBottom: 8 }}>
            <div className="ev-stat"><b>{(data.files || []).length}</b><span>Photos &amp; videos</span></div>
          </div>
        ) : (
          <>
        <div className="ev-stats">
          <div className="ev-stat"><b>{stats.total}</b><span>Areas inspected</span></div>
          <div className="ev-stat ok"><b>{stats.ok}</b><span>Satisfactory</span></div>
          <div className="ev-stat bad"><b>{stats.bad + data.damages.length}</b><span>Damages noted</span></div>
          <div className="ev-stat"><b>{stats.media}</b><span>Photos &amp; videos</span></div>
        </div>

        <div className={`ev-banner ${stats.damaged ? "bad" : "ok"}`}>
          <span style={{ fontSize: 20 }}>{stats.damaged ? "!" : "✓"}</span>
          {stats.damaged ? "Damage was recorded during the initial inspection of your vehicle." : "No damage was recorded during the initial inspection of your vehicle."}
        </div>

        <section className="ev-sec" style={{ marginTop: 0 }}>
          <h2 className="ev-h serif">Initial vehicle inspection</h2>
          <p className="ev-sub">The condition of your vehicle when it was received, with photographs and videos taken by our team.</p>
          <div className="ev-card">
            {data.items.map((i) => {
              const [label, cls] = COND[i.condition] || [i.condition, "na"];
              return (
                <div className="ev-row" key={i.itemId ?? i.itemName}>
                  <div className="ev-row-h">
                    <div className="ev-row-n">{i.itemName}</div>
                    <span className={`ev-pill ${cls}`}>{label}</span>
                  </div>
                  <div className="ev-tags">
                    <span>{i.photosTaken ? "● Photographs taken" : "○ No photographs"}</span>
                    <span>{i.videosTaken ? "● Videos taken" : "○ No videos"}</span>
                  </div>
                  {i.note && <div className="ev-note">{i.note}</div>}
                  <Gallery files={byItem(i.itemId)} onOpen={setOpen} />
                </div>
              );
            })}
          </div>
        </section>

        {data.evidenceMode === "FULL" && (
        <section className="ev-sec">
          <h2 className="ev-h serif">Additional damages found</h2>
          <p className="ev-sub">Damages found in addition to those mentioned by the customer.</p>
          <div className="ev-card">
            {data.damages.length === 0 ? <div className="ev-empty">No additional damages were found.</div> : (
              <ol className="ev-list">{data.damages.map((d, n) => <li key={n}>{d}</li>)}</ol>
            )}
          </div>
        </section>
        )}

          </>
        )}

        {(data.subConcerns || []).length > 0 && (
          <section className="ev-sec">
            <h2 className="ev-h serif">Sub concerns</h2>
            <p className="ev-sub">Work you confirmed after the damages report.</p>
            <div className="ev-card">
              <ol className="ev-list">
                {data.subConcerns.map((c, n) => (
                  <li key={n}>{c.description} <span className="ev-pill na" style={{ marginLeft: 8 }}>{{ REPAIR: "Repair", DEEP_CHECK: "Deep check", BOTH: "Repair + Deep check" }[c.action] || c.action}</span></li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {areas.length > 0 && (
          <section className="ev-sec">
            <h2 className="ev-h serif">Initial vehicle inspection</h2>
            <p className="ev-sub">Photographs and videos taken by our team when your vehicle was received.</p>
            <div className="ev-card">
              {areas.map((a) => (
                <div className="ev-row" key={a.id}>
                  <div className="ev-row-n">{a.name}</div>
                  <Gallery files={a.files} onOpen={setOpen} />
                </div>
              ))}
            </div>
          </section>
        )}

        {general.length > 0 && (
          <section className="ev-sec">
            <h2 className="ev-h serif">Photographs &amp; videos</h2>
            <div className="ev-card" style={{ padding: "4px 20px 18px" }}><Gallery files={general} onOpen={setOpen} /></div>
          </section>
        )}

        {data.propertyInside != null && (
          <section className="ev-sec">
            <h2 className="ev-h serif">Property inside the vehicle</h2>
            {data.propertyInside ? (
              <div className="ev-card" style={{ padding: "4px 20px 18px" }}>
                {propFiles.length ? <Gallery files={propFiles} onOpen={setOpen} /> : <div className="ev-text" style={{ paddingTop: 14 }}>Property was reported inside the vehicle.</div>}
              </div>
            ) : (
              <div className="ev-card"><div className="ev-text">No property inside the vehicle.</div></div>
            )}
          </section>
        )}

        {data.moreDetails && (
          <section className="ev-sec">
            <h2 className="ev-h serif">{data.departmentName ? "Additional details" : "Remark"}</h2>
            <div className="ev-card"><div className="ev-text">{data.moreDetails}</div></div>
          </section>
        )}

        <div className="ev-noprint" style={{ textAlign: "center", marginTop: 32 }}>
          <button type="button" className="ev-btn" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>

        <footer className="ev-foot">
          <b className="serif">{COMPANY}</b>
          <div style={{ marginTop: 6 }}>This report records the visible condition of the vehicle at the time of inspection and was prepared for the vehicle owner.</div>
        </footer>
      </main>

      {open && (
        <div className="ev-lb" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button type="button" className="ev-lb-x" aria-label="Close" onClick={() => setOpen(null)}>&times;</button>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%" }}>
            {open.fileType === "VIDEO" ? <video src={open.fileUrl} controls autoPlay playsInline /> : <img src={open.fileUrl} alt={open.fileName} />}
          </div>
          <div className="ev-lb-c">{open.fileName}</div>
        </div>
      )}
    </div>
  );
}