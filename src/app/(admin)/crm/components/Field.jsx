import { Col } from "react-bootstrap";
import { Icon } from "@iconify/react";

// A form field: the label sits ABOVE the input (small, bold), an optional icon sits inside the input,
// a red star marks required fields and the error message appears under the input.
// Props: label, error, md (column width), icon (iconify name), required, hint, children (the input)
export default function Field({ label, error, md = "6", lg = md === "12" ? undefined : "4", icon, required = false, hint, accent, children }) {
  return (
    <Col md={md} lg={lg} className="mb-1">
      <style>{`
        .mf-label { font-size: .74rem; font-weight: 700; color: #1e293b; margin-bottom: 3px; display: flex; align-items: center; gap: 4px; }
        .mf-label .mf-req { color: #111; font-size: 1rem; line-height: 1; }
        .mf-wrap { position: relative; border-radius: 10px; box-shadow: 0 1px 2px rgba(15,23,42,.06); }
        /* icon chip on the left of the input */
        .mf-wrap .mf-icon-box {
          position: absolute; left: 0; top: 0; bottom: 0; width: 38px; display: flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--mf-accent, #111111) 12%, white); color: var(--mf-accent, #111111);
          border: 1.5px solid #c4c4ca; border-right: 0; border-radius: 10px 0 0 10px; pointer-events: none; transition: all .15s;
        }
        .mf-wrap.mf-ta .mf-icon-box { bottom: auto; height: 40px; }
        .mf-wrap .form-control, .mf-wrap .form-select {
          border-radius: 12px; border: 1.5px solid #c4c4ca; background-color: #fff; min-height: 40px; padding-top: .3rem; padding-bottom: .3rem; font-size: .88rem; color: #0f172a;
          transition: border-color .15s, box-shadow .15s, background-color .15s;
        }
        .mf-wrap.mf-has-icon .form-control, .mf-wrap.mf-has-icon .form-select { padding-left: 2.8rem; border-radius: 10px; }
        .mf-wrap textarea.form-control { min-height: 60px; }
        .mf-wrap .form-control::placeholder { color: #94a3b8; }
        .mf-wrap .form-control:hover, .mf-wrap .form-select:hover { border-color: var(--mf-accent, #111111); }
        .mf-wrap .form-control:focus, .mf-wrap .form-select:focus { border-color: var(--mf-accent, #111111); box-shadow: 0 0 0 4px color-mix(in srgb, var(--mf-accent, #111111) 18%, transparent); }
        .mf-wrap:focus-within .mf-icon-box { background: var(--mf-accent, #111111); color: #fff; border-color: var(--mf-accent, #111111); }
        .mf-wrap .form-control[readonly] { background-color: #e8edf3; color: #475569; font-weight: 600; }
        .mf-err { color: #dc2626; font-size: .72rem; font-weight: 600; min-height: 12px; margin: 1px 0 0 2px; line-height: 1.1; }
        .mf-wrap:has(.is-invalid) .form-control, .mf-wrap:has(.is-invalid) .form-select { border-color: #dc2626; }
      `}</style>
      <label className="mf-label">
        {label}{required && <span className="mf-req">*</span>}
      </label>
      <div className={`mf-wrap ${icon ? "mf-has-icon" : ""} ${md === "12" ? "mf-ta" : ""}`} style={accent ? { "--mf-accent": accent } : undefined}>
        {icon && <span className="mf-icon-box"><Icon icon={icon} width="18" height="18" /></span>}
        {children}
      </div>
      {hint && !error && <div className="text-muted" style={{ fontSize: ".75rem", marginTop: 4 }}>{hint}</div>}
      <p className="mf-err">{error}</p>
    </Col>
  );
}