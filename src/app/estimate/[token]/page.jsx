"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

// Public ESTIMATE page for the customer:  /estimate/<token>   (the link in the estimate SMS)
// Put this file at  src/app/estimate/[token]/page.jsx  (OUTSIDE the (admin) group, so it needs no login).
// API: NEXT_PUBLIC_API_URL, else NEXT_PUBLIC_BASE_URL (backend address) + the prefix given in the link (?p=...) - the same way as /evidence/<token>.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
const DEFAULT_PREFIX = process.env.NEXT_PUBLIC_ESTIMATE_API_PATH ?? "/evidence";

// phone friendly: the estimate document is a fixed-width page, so on a small screen it is laid out in one column
const PHONE_CSS = "<style>@media(max-width:620px){.page{padding:14px 12px!important}.top{flex-wrap:wrap}.top>.doc{max-width:none!important;text-align:left!important}.parties{grid-template-columns:1fr!important}.meta{grid-template-columns:1fr 1fr!important}table{font-size:11px}}</style>";

export default function EstimatePage() {
  const { token } = useParams();
  const search = useSearchParams();
  const [state, setState] = useState({ loading: true, html: "", jobNo: "", error: "" });
  const [height, setHeight] = useState(900);
  const frame = useRef(null);

  useEffect(() => {
    // only a plain path is accepted as the prefix (like /evidence or /customer_approval)
    const p = search.get("p");
    const prefix = p && /^\/[A-Za-z0-9_\-/]*$/.test(p) ? p.replace(/\/+$/, "") : DEFAULT_PREFIX;
    let stop = false;
    (async () => {
      try {
        const res = await fetch(`${API}${prefix}/public/estimate-data/${token}`);
        const data = await res.json().catch(() => ({}));
        if (stop) return;
        if (!res.ok || !data.html) return setState({ loading: false, html: "", jobNo: "", error: data.message || "This estimate could not be found." });
        setState({ loading: false, html: String(data.html).replace("<head>", `<head>${PHONE_CSS}`), jobNo: data.jobNo || "", error: "" });
      } catch (_) { if (!stop) setState({ loading: false, html: "", jobNo: "", error: "Could not load the estimate. Please try again." }); }
    })();
    return () => { stop = true; };
  }, [token, search]);

  const fit = () => { try { const d = frame.current?.contentDocument; if (d) setHeight(Math.max(600, d.documentElement.scrollHeight + 8)); } catch (_) { /* ignore */ } };
  useEffect(() => { window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, []);
  const print = () => { try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); } catch (_) { window.print(); } };

  return (
    <div style={{ background: "#e9e6e1", minHeight: "100vh", fontFamily: "system-ui, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 840, margin: "0 auto", padding: "12px 12px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 700, color: "#8f0b0b", letterSpacing: ".04em" }}>Estimate{state.jobNo ? ` · ${state.jobNo}` : ""}</div>
        {state.html && <button type="button" onClick={print} style={{ background: "#8f0b0b", color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}>Print / Save as PDF</button>}
      </div>
      <div style={{ maxWidth: 840, margin: "10px auto 24px", padding: "0 12px" }}>
        {state.loading && <div style={{ textAlign: "center", padding: 40, color: "#78716c" }}>Loading...</div>}
        {state.error && <div style={{ background: "#fff", borderRadius: 10, padding: 24, textAlign: "center", color: "#a61b1b" }}>{state.error}</div>}
        {state.html && (
          <iframe
            ref={frame}
            title="Estimate"
            srcDoc={state.html}
            sandbox="allow-same-origin allow-modals"
            onLoad={fit}
            style={{ width: "100%", height, border: 0, background: "#fff", borderRadius: 8, boxShadow: "0 8px 30px -12px rgba(0,0,0,.35)", display: "block" }}
          />
        )}
      </div>
    </div>
  );
}