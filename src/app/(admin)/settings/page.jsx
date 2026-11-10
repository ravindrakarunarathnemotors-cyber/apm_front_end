"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Form, ListGroup, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import withAuthorization from "@/hoc/withAuthorization";
// Users & roles = the User Management screens that already exist (src/app/(admin)/user_management_all/components). Nothing is copied.
import ButtonNavigation from "@/app/(admin)/user_management_all/components/ButtonNavigation";
import AddUserForm from "@/app/(admin)/user_management_all/components/AddUserForm";
import AddRoleForm from "@/app/(admin)/user_management_all/components/AddRoleForm";
import UserList from "@/app/(admin)/user_management_all/components/UserList";
import RoleList from "@/app/(admin)/user_management_all/components/RoleList";
import { DEFAULT_COMPANY, useGetCompanyProfileQuery, useGetSettingsLogQuery, useGetTermsQuery, useGetInvoiceSettingsQuery, useGetNumberingQuery, useSaveNumberingMutation, useGetPricingQuery, useSavePricingMutation, useGetSmsSettingsQuery, useSaveSmsSettingsMutation, useSendTestSmsMutation, useGetSmsLogQuery, useSaveCompanyProfileMutation, useSaveTermsMutation, useSaveInvoiceSettingsMutation } from "../crm/components/settingsApi";

// Settings module. Only "Company profile" is built for now; the other groups are listed as "coming soon".
// Add it as a page, e.g. src/app/(admin)/settings/page.jsx:  (this file IS the page: save it as src/app/(admin)/settings/page.jsx)
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];
const GROUPS = [
  { key: "company", label: "Company profile", icon: "mdi:domain" },
  { key: "terms", label: "Terms & conditions", icon: "mdi:file-document-edit-outline" },
  { key: "tax", label: "Tax & invoice", icon: "mdi:receipt-text-outline" },
  { key: "numbering", label: "Numbering", icon: "mdi:numeric", soon: true },   // built, but switched off until it is added (set soon: false to turn it on)
  { key: "pricing", label: "Pricing", icon: "mdi:tag-multiple-outline" },
  { key: "sms", label: "SMS & notifications", icon: "mdi:message-text-outline" },
  { key: "stages", label: "Departments & stages", icon: "mdi:sitemap-outline", soon: true },
  { key: "users", label: "Users & roles", icon: "mdi:account-key-outline" },
];
const FIELD_LABEL = { name: "Company name", logoUrl: "Logo", address: "Address", phone: "Phone", email: "Email", website: "Website" };
const shortVal = (v) => (v === null || v === undefined || v === "" ? "-" : String(v).length > 40 ? `${String(v).slice(0, 40)}…` : String(v));

function CompanyProfile() {
  const { data, isLoading, isError } = useGetCompanyProfileQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: logData } = useGetSettingsLogQuery("company");
  const [save, { isLoading: saving }] = useSaveCompanyProfileMutation();
  const [f, setF] = useState(DEFAULT_COMPANY);
  const [up, setUp] = useState(false);
  const fileRef = useRef(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (data?.company && !loaded.current) { loaded.current = true; setF({ ...DEFAULT_COMPANY, ...data.company }); }
  }, [data]);
  const base = { ...DEFAULT_COMPANY, ...(data?.company || {}) };
  const dirty = Object.keys(DEFAULT_COMPANY).some((k) => (f[k] || "") !== (base[k] || ""));
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const fail = (m) => Swal.fire({ title: "Please check", text: m, icon: "error", confirmButtonColor: "#111" });

  const pickLogo = async (file) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) return fail("Choose a PNG, JPG, WEBP or SVG image.");
    if (file.size > 3 * 1024 * 1024) return fail("The logo must be smaller than 3 MB.");
    setUp(true);
    try {
      const fd = new FormData(); fd.append("file", new File([file], file.name, { type: file.type, lastModified: Date.now() }));
      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const out = await res.json();
      if (!res.ok || !out.fileUrl) throw new Error("upload");
      setF((x) => ({ ...x, logoUrl: URL_FIX[0] ? out.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : out.fileUrl }));
    } catch (_) { fail("Could not upload the logo."); } finally { setUp(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const submit = async () => {
    try { await save(f).unwrap(); Swal.fire({ title: "Saved", icon: "success", timer: 1200, showConfirmButton: false }); } catch (ex) { fail(ex?.data?.message || "Could not save."); }
  };

  if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
  if (isError) return <Alert variant="danger">Could not load the company profile.</Alert>;

  const logo = f.logoUrl || "/images/mainlogo.jpeg";
  return (
    <>
      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <Card className="st-card">
            <Card.Body>
              <div className="st-title"><Icon icon="mdi:domain" width="20" height="20" /> Company profile</div>
              <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
                <div className="st-logo"><img src={logo} alt="Logo" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} /></div>
                <div>
                  <div className="fw-semibold mb-1">Logo</div>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button variant="outline-dark" size="sm" disabled={up} onClick={() => fileRef.current?.click()}>{up ? <Spinner size="sm" /> : <Icon icon="mdi:upload" />} {f.logoUrl ? "Change logo" : "Upload logo"}</Button>
                    {f.logoUrl && <Button variant="outline-danger" size="sm" onClick={() => setF((x) => ({ ...x, logoUrl: "" }))}><Icon icon="mdi:close" /> Remove</Button>}
                  </div>
                  <div className="small text-muted mt-1">PNG, JPG, WEBP or SVG, up to 3 MB. Shown on the invoice and the estimates.</div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => pickLogo(e.target.files?.[0])} />
                </div>
              </div>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Company name *</Form.Label><Form.Control value={f.name} onChange={set("name")} maxLength={120} /></Form.Group>
              <Form.Group className="mb-3"><Form.Label className="fw-semibold">Address</Form.Label><Form.Control as="textarea" rows={2} value={f.address} onChange={set("address")} maxLength={300} /></Form.Group>
              <div className="row g-3">
                <div className="col-12 col-md-6"><Form.Label className="fw-semibold">Phone</Form.Label><Form.Control value={f.phone} onChange={set("phone")} maxLength={60} placeholder="+94 ..." /></div>
                <div className="col-12 col-md-6"><Form.Label className="fw-semibold">Email</Form.Label><Form.Control type="email" value={f.email} onChange={set("email")} maxLength={120} /></div>
                <div className="col-12"><Form.Label className="fw-semibold">Website</Form.Label><Form.Control value={f.website} onChange={set("website")} maxLength={120} placeholder="www.example.lk" /></div>
              </div>
              <div className="d-flex gap-2 mt-4">
                <Button variant="success" size="lg" disabled={!dirty || saving} onClick={submit}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:content-save-outline" />} Save</Button>
                <Button variant="light" size="lg" disabled={!dirty} style={{ border: "1.5px solid #c4c4ca" }} onClick={() => setF(base)}>Reset</Button>
              </div>
            </Card.Body>
          </Card>
        </div>

        <div className="col-12 col-xl-5">
          <Card className="st-card mb-3">
            <Card.Body>
              <div className="st-title"><Icon icon="mdi:eye-outline" width="20" height="20" /> Preview (document header)</div>
              <div className="st-prev">
                <div className="d-flex align-items-center gap-3">
                  <img src={logo} alt="" style={{ height: 52, width: "auto", maxWidth: 120, objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  <div>
                    <div className="fw-bold" style={{ letterSpacing: ".04em" }}>{f.name || "Company name"}</div>
                    <div className="small text-muted" style={{ lineHeight: 1.5 }}>
                      {f.address && <div>{f.address}</div>}
                      {(f.phone || f.email) && <div>{[f.phone, f.email].filter(Boolean).join("  |  ")}</div>}
                      {f.website && <div>{f.website}</div>}
                    </div>
                  </div>
                </div>
                <div className="st-bar" />
              </div>
              <div className="small text-muted mt-2">The invoice and the estimate documents use this header after you save.</div>
            </Card.Body>
          </Card>
          <Card className="st-card">
            <Card.Body>
              <div className="st-title"><Icon icon="mdi:history" width="20" height="20" /> Recent changes</div>
              {(logData?.log || []).length === 0 && <div className="text-muted small">No changes yet.</div>}
              {(logData?.log || []).slice(0, 8).map((l) => (
                <div key={l.id} className="st-log">
                  <b>{FIELD_LABEL[l.key] || l.key}</b>
                  <div className="small">{l.key === "logoUrl" ? "Logo changed" : `${shortVal(l.oldValue)} → ${shortVal(l.newValue)}`}</div>
                  <div className="small text-muted">{new Date(l.changedAt).toLocaleString()}{l.changedByName ? ` · ${l.changedByName}` : ""}</div>
                </div>
              ))}
            </Card.Body>
          </Card>
        </div>
      </div>
    </>
  );
}

const PAY_METHODS = [
  ["CASH", "Cash"], ["CARD", "Card"], ["BANK_TRANSFER", "Bank transfer"], ["CHEQUE", "Cheque"],
  ["ONLINE", "Online payment"], ["MOBILE_WALLET", "Mobile wallet"], ["CREDIT", "Credit (on account)"],
];
const INV_LABEL = {
  vatDefaultOn: "VAT on new invoices", vatPercent: "VAT %", vatRegNo: "VAT reg. no", prefix: "Invoice prefix", digits: "Number length", nextNumber: "Next invoice number",
  methods: "Payment methods", maxDiscountPercent: "Max discount %", showBank: "Show bank details", bankName: "Bank", bankAccountName: "Account name", bankAccountNo: "Account no",
  bankBranch: "Branch", footerNote: "Footer note", terms: "Invoice terms",
};
const logVal = (v) => (Array.isArray(v) ? `${v.length} item${v.length === 1 ? "" : "s"}` : typeof v === "boolean" ? (v ? "On" : "Off") : shortVal(v));

const NUM_ROWS = [
  ["job", "Job number", "Wash / Detail jobs created by a transfer use the same format."],
  ["customer", "Customer ID", "The ERP customer id, e.g. on the CRM customer."],
  ["employee", "Employee ID", "The HR employee id."],
];
const NUM_LABEL = { job: "Job", customer: "Customer", employee: "Employee" };

const SMS_SAMPLE = { companyName: "KARUNARATHNE AUTO ZONE", regNo: "CAB-1234", jobNo: "JOB-00124", amount: "45,000.00", time: "2 days", link: "https://erp.example.lk/evidence/a1b2c3" };
const SMS_VAR_HELP = { companyName: "company name", regNo: "vehicle number", jobNo: "job number", amount: "total amount", time: "estimated time", link: "customer / staff link" };
// the same rules as the server: {name} = value, [ ... {name} ... ] = optional part (dropped when its value is empty)
function smsFill(text, vars) {
  const has = (k) => String(vars[k] ?? "").trim() !== "";
  let out = String(text).replace(/\[([^\[\]]*)\]/g, (_, inner) => ([...inner.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).every(has) ? inner : ""));
  out = out.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,:])/g, "$1").trim();
}
const smsParts = (t) => { const n = t.length; return n <= 160 ? 1 : Math.ceil(n / 153); };

function SmsSettings() {
  const { data, isLoading, isError } = useGetSmsSettingsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: logData, refetch: refetchLog } = useGetSmsLogQuery(30);
  const { data: chLog } = useGetSettingsLogQuery("sms");
  const [save, { isLoading: saving }] = useSaveSmsSettingsMutation();
  const [sendTest, { isLoading: testing }] = useSendTestSmsMutation();
  const [f, setF] = useState(null);
  const [phone, setPhone] = useState("");
  const loaded = useRef(false);
  const refs = useRef({});
  useEffect(() => { if (data?.settings && !loaded.current) { loaded.current = true; setF({ ...data.settings, templates: { ...data.settings.templates } }); } }, [data]);
  const base = data?.settings, meta = data?.meta || {};
  const dirty = !!f && !!base && JSON.stringify(f) !== JSON.stringify(base);
  const put = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setT = (k, v) => setF((x) => ({ ...x, templates: { ...x.templates, [k]: v } }));
  const addVar = (k, v) => {
    const el = refs.current[k]; const cur = f.templates[k] || "";
    const a = el ? el.selectionStart : cur.length, b = el ? el.selectionEnd : cur.length;
    setT(k, `${cur.slice(0, a)}{${v}}${cur.slice(b)}`);
    setTimeout(() => { if (el) { el.focus(); const p = a + v.length + 2; el.setSelectionRange(p, p); } }, 0);
  };

  const submit = async () => {
    try {
      const out = await save(f).unwrap();
      loaded.current = true; setF({ ...out.settings, templates: { ...out.settings.templates } });
      Swal.fire({ title: "Saved", icon: "success", timer: 1200, showConfirmButton: false });
    } catch (ex) { Swal.fire({ title: "Please check", text: ex?.data?.message || "Could not save.", icon: "error", confirmButtonColor: "#111" }); }
  };
  const test = async () => {
    try {
      const out = await sendTest({ phone }).unwrap();
      if (out.sms?.sent) Swal.fire({ title: "Sent", text: `The test SMS was sent to ${out.sms.to}.`, icon: "success", confirmButtonColor: "#111" });
      else Swal.fire({ title: "Not sent", text: out.sms?.error || "Could not send.", icon: "error", confirmButtonColor: "#111" });
      refetchLog();
    } catch (ex) { Swal.fire({ title: "Please check", text: ex?.data?.message || "Could not send.", icon: "error", confirmButtonColor: "#111" }); }
  };

  if (isLoading || !f) return isError ? <Alert variant="danger">Could not load the SMS settings.</Alert> : <div className="text-center py-5"><Spinner /></div>;
  const gw = data.gateway || {};
  const tpl = (aud) => Object.entries(meta).filter(([, m]) => m.audience === aud);
  const card = ([k, m]) => {
    const text = f.templates[k] ?? m.text;
    const prev = smsFill(text, SMS_SAMPLE);
    return (
      <div key={k} className="sms-tpl">
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-1">
          <div className="fw-semibold">{m.label}</div>
          {text !== m.text && <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={() => setT(k, m.text)}>Reset to default</Button>}
        </div>
        <Form.Control as="textarea" rows={3} ref={(el) => { refs.current[k] = el; }} value={text} maxLength={480} onChange={(e) => setT(k, e.target.value)} />
        <div className="d-flex gap-1 flex-wrap mt-2">
          {m.vars.map((v) => <button key={v} type="button" className="sms-chip" title={SMS_VAR_HELP[v]} onClick={() => addVar(k, v)}>{`{${v}}`}</button>)}
        </div>
        <div className="sms-prev mt-2">{prev || <span className="text-muted">Empty</span>}</div>
        <div className="small text-muted mt-1">{prev.length} characters · {smsParts(prev)} SMS{smsParts(prev) > 1 ? "es" : ""} · {m.required.map((r) => `{${r}}`).join(", ")} is needed</div>
      </div>
    );
  };

  return (
    <div className="row g-3">
      <div className="col-12 col-xl-7">
        <Card className="st-card mb-3"><Card.Body>
          <div className="st-title"><Icon icon="mdi:message-text-outline" width="20" height="20" /> SMS gateway</div>
          <Form.Check type="switch" id="sms-on" className="mb-3" label="Send SMS from the ERP (switch off to stop all SMS)" checked={!!f.enabled} onChange={(e) => put("enabled", e.target.checked)} />
          <div className="mb-3 small">
            {gw.configured
              ? <span className="text-success"><Icon icon="mdi:check-circle" /> The gateway is configured on the server{gw.senderId ? <> (sender ID <b>{gw.senderId}</b>)</> : null}.</span>
              : <span className="text-danger"><Icon icon="mdi:alert-circle" /> The gateway is not configured. Set SMSLENZ_USER_ID, SMSLENZ_API_KEY and SMSLENZ_SENDER_ID in the server .env and restart. The API key is never kept in Settings.</span>}
          </div>
          <Form.Label className="fw-semibold">Send a test SMS</Form.Label>
          <div className="d-flex gap-2 flex-wrap">
            <Form.Control placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ maxWidth: 220 }} maxLength={20} />
            <Button variant="outline-dark" disabled={!phone.trim() || testing} onClick={test}>{testing ? <Spinner size="sm" /> : <Icon icon="mdi:send-outline" />} Send test</Button>
          </div>
        </Card.Body></Card>

        <Card className="st-card mb-3"><Card.Body>
          <div className="st-title"><Icon icon="mdi:account-tie-outline" width="20" height="20" /> Staff notifications</div>
          <Form.Label className="fw-semibold">Logistics mobile number</Form.Label>
          <Form.Control value={f.logisticsNumber} onChange={(e) => put("logisticsNumber", e.target.value)} placeholder="07XXXXXXXX" maxLength={20} style={{ maxWidth: 260 }} />
          <div className="small text-muted mt-1 mb-3">The spare parts requests and reminders go to this number.{gw.envLogisticsNumber ? " When it is empty, LOGISTICS_SMS_NUMBER of the server .env is used." : " When it is empty, no SMS is sent."}</div>
          <Form.Check type="switch" id="sms-rem" label="Send the spare parts reminder SMS" checked={!!f.spareReminderOn} onChange={(e) => put("spareReminderOn", e.target.checked)} />
        </Card.Body></Card>

        <Card className="st-card mb-3"><Card.Body>
          <div className="st-title"><Icon icon="mdi:account-outline" width="20" height="20" /> Customer messages</div>
          <div className="small text-muted mb-3">Click a {"{name}"} to put it in the message. A part in [ square brackets ] is left out when its value is empty (for example the estimated time).</div>
          {tpl("Customer").map(card)}
        </Card.Body></Card>

        <Card className="st-card"><Card.Body>
          <div className="st-title"><Icon icon="mdi:truck-outline" width="20" height="20" /> Logistics messages</div>
          {tpl("Logistics").map(card)}
        </Card.Body></Card>

        <div className="d-flex gap-2 mt-3">
          <Button variant="success" size="lg" disabled={!dirty || saving} onClick={submit}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:content-save-outline" />} Save</Button>
          <Button variant="light" size="lg" disabled={!dirty} style={{ border: "1.5px solid #c4c4ca" }} onClick={() => setF({ ...base, templates: { ...base.templates } })}>Reset</Button>
        </div>
      </div>

      <div className="col-12 col-xl-5">
        <Card className="st-card mb-3"><Card.Body>
          <div className="st-title"><Icon icon="mdi:email-fast-outline" width="20" height="20" /> Sent SMS</div>
          {(logData?.log || []).length === 0 && <div className="text-muted small">No SMS yet.</div>}
          {(logData?.log || []).map((l) => (
            <div key={l.id} className="st-log">
              <div className="d-flex justify-content-between gap-2"><b>{l.to || "-"}</b><span className={l.sent ? "text-success small" : "text-danger small"}>{l.sent ? "Sent" : "Failed"}</span></div>
              <div className="small" style={{ wordBreak: "break-word" }}>{l.message}</div>
              {!l.sent && l.error && <div className="small text-danger">{l.error}</div>}
              <div className="small text-muted">{new Date(l.createdAt).toLocaleString()}{l.kind ? ` · ${l.kind}` : ""}</div>
            </div>
          ))}
        </Card.Body></Card>
        <Card className="st-card"><Card.Body>
          <div className="st-title"><Icon icon="mdi:history" width="20" height="20" /> Recent changes</div>
          {(chLog?.log || []).length === 0 && <div className="text-muted small">No changes yet.</div>}
          {(chLog?.log || []).slice(0, 8).map((l) => (
            <div key={l.id} className="st-log">
              <b>{{ enabled: "SMS switch", logisticsNumber: "Logistics number", spareReminderOn: "Spare parts reminder", templates: "Message templates" }[l.key] || l.key}</b>
              <div className="small">{l.key === "templates" ? "Message text changed" : `${logVal(l.oldValue)} → ${logVal(l.newValue)}`}</div>
              <div className="small text-muted">{new Date(l.changedAt).toLocaleString()}{l.changedByName ? ` · ${l.changedByName}` : ""}</div>
            </div>
          ))}
        </Card.Body></Card>
      </div>
    </div>
  );
}

function PricingSettings() {
  const { data, isLoading, isError } = useGetPricingQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: logData } = useGetSettingsLogQuery("pricing");
  const [save, { isLoading: saving }] = useSavePricingMutation();
  const [list, setList] = useState([]);
  const [add, setAdd] = useState("");
  const [amt, setAmt] = useState("10000");     // live preview: unit price typed here
  const [sel, setSel] = useState(0);            // live preview: the % picked here
  const loaded = useRef(false);
  useEffect(() => { if (data?.pricing && !loaded.current) { loaded.current = true; setList(data.pricing.adjustmentOptions); } }, [data]);
  const base = data?.pricing?.adjustmentOptions || [];
  const defaults = data?.defaults?.adjustmentOptions || [];
  const dirty = JSON.stringify(list) !== JSON.stringify(base);
  const fail = (m) => Swal.fire({ title: "Please check", text: m, icon: "error", confirmButtonColor: "#111" });

  const addOne = () => {
    const v = Math.round(Number(add) * 100) / 100;
    if (!(v > 0 && v <= 50)) return fail("Enter a percentage more than 0 and not more than 50.");
    if (list.includes(v)) return fail(`${v}% is already in the list.`);
    if (list.length >= 10) return fail("Use at most 10 percentages.");
    setList([...list, v].sort((a, b) => a - b)); setAdd("");
  };
  const submit = async () => {
    try { const out = await save({ adjustmentOptions: list }).unwrap(); setList(out.pricing.adjustmentOptions); Swal.fire({ title: "Saved", icon: "success", timer: 1200, showConfirmButton: false }); }
    catch (ex) { fail(ex?.data?.message || "Could not save."); }
  };

  if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
  if (isError) return <Alert variant="danger">Could not load the pricing settings.</Alert>;
  return (
    <div className="row g-3">
      <div className="col-12 col-xl-7">
        <Card className="st-card">
          <Card.Body>
            <div className="st-title"><Icon icon="mdi:percent-outline" width="20" height="20" /> Price adjustment options</div>
            <div className="small text-muted mb-3">
              The percentages the staff can choose as the <b>Price adjustment</b> of a job (Vehicle Job Inspection) and of an Extra Job Scope. The adjustment is added to the unit price of every spare part and repair item. &quot;None&quot; is always available.
            </div>
            <div className="d-flex gap-2 flex-wrap mb-3">
              <span className="pr-chip pr-none">None</span>
              {list.map((p) => (
                <span key={p} className="pr-chip">+ {p}%<button type="button" aria-label={`Remove ${p}%`} onClick={() => setList(list.filter((x) => x !== p))}><Icon icon="mdi:close" width="14" height="14" /></button></span>
              ))}
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <Form.Control type="number" min="0.5" max="50" step="0.5" placeholder="e.g. 15" value={add} onChange={(e) => setAdd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addOne(); }} style={{ maxWidth: 140 }} />
              <Button variant="outline-dark" onClick={addOne}><Icon icon="mdi:plus" /> Add %</Button>
              <Button variant="link" className="text-decoration-none" onClick={() => setList(defaults)}>Use the standard list</Button>
            </div>
            <div className="small text-muted mt-3">
              A change is used from now on. A job or an Extra Job Scope that already uses a percentage that is no longer in the list keeps it, and the estimates and invoices that are already made do not change.
            </div>
            <div className="d-flex gap-2 mt-4">
              <Button variant="success" size="lg" disabled={!dirty || saving} onClick={submit}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:content-save-outline" />} Save</Button>
              <Button variant="light" size="lg" disabled={!dirty} style={{ border: "1.5px solid #c4c4ca" }} onClick={() => setList(base)}>Reset</Button>
            </div>
          </Card.Body>
        </Card>
      </div>
      <div className="col-12 col-xl-5">
        <Card className="st-card mb-3">
          <Card.Body>
            <div className="st-title"><Icon icon="mdi:eye-outline" width="20" height="20" /> Live preview</div>
            {(() => {
              const price = Math.max(0, Number(amt) || 0);
              const pct = list.includes(Number(sel)) ? Number(sel) : 0;      // a % that was just removed falls back to None
              const adj = Math.round(price * (100 + pct)) / 100;
              const inc = Math.round((adj - price) * 100) / 100;
              const m = (n) => Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              return (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-6"><Form.Label className="small fw-semibold mb-1">Unit price (Rs.)</Form.Label><Form.Control type="number" min="0" value={amt} onChange={(e) => setAmt(e.target.value)} /></div>
                    <div className="col-6">
                      <Form.Label className="small fw-semibold mb-1">Price adjustment</Form.Label>
                      <Form.Select aria-label="Price adjustment" value={pct} onChange={(e) => setSel(Number(e.target.value))}>
                        <option value={0}>None</option>
                        {list.map((p) => <option key={p} value={p}>+ {p}%</option>)}
                      </Form.Select>
                    </div>
                  </div>
                  <div className="pr-calc">
                    <div><span>Price</span><b>Rs. {m(price)}</b></div>
                    <div><span>Adjustment {pct > 0 ? `(+ ${pct}%)` : ""}</span><b>+ Rs. {m(inc)}</b></div>
                    <div className="g"><span>Customer price</span><b>Rs. {m(adj)}</b></div>
                  </div>
                  <div className="small text-muted mt-2">The % is added to the unit price. The line total is the quantity x the new unit price.</div>
                </>
              );
            })()}
          </Card.Body>
        </Card>
        <Card className="st-card">
          <Card.Body>
            <div className="st-title"><Icon icon="mdi:history" width="20" height="20" /> Recent changes</div>
            {(logData?.log || []).length === 0 && <div className="text-muted small">No changes yet.</div>}
            {(logData?.log || []).slice(0, 8).map((l) => (
              <div key={l.id} className="st-log">
                <b>Price adjustment options</b>
                <div className="small">{(l.oldValue || []).map((x) => `${x}%`).join(", ") || "-"} → {(l.newValue || []).map((x) => `${x}%`).join(", ") || "-"}</div>
                <div className="small text-muted">{new Date(l.changedAt).toLocaleString()}{l.changedByName ? ` · ${l.changedByName}` : ""}</div>
              </div>
            ))}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

function Numbering() {
  const { data, isLoading, isError } = useGetNumberingQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: logData } = useGetSettingsLogQuery("numbering");
  const [save, { isLoading: saving }] = useSaveNumberingMutation();
  const [f, setF] = useState(null);
  const loaded = useRef(false);
  useEffect(() => { if (data?.numbering && !loaded.current) { loaded.current = true; setF({ ...data.numbering }); } }, [data]);
  const base = data?.numbering;
  const dirty = !!f && !!base && JSON.stringify(f) !== JSON.stringify(base);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const sample = (k) => `${String(f[`${k}Prefix`] || "").toUpperCase()}${String(124).padStart(Math.min(8, Math.max(3, Number(f[`${k}Digits`]) || 5)), "0")}`;

  const submit = async () => {
    try {
      const out = await save({ ...f }).unwrap();
      loaded.current = true; setF({ ...out.numbering });
      Swal.fire({ title: "Saved", text: "New records use this format. Existing numbers are not changed.", icon: "success", confirmButtonColor: "#111" });
    } catch (ex) { Swal.fire({ title: "Please check", text: ex?.data?.message || "Could not save.", icon: "error", confirmButtonColor: "#111" }); }
  };

  if (isLoading || !f) return isError ? <Alert variant="danger">Could not load the numbering settings.</Alert> : <div className="text-center py-5"><Spinner /></div>;
  return (
    <div className="row g-3">
      <div className="col-12 col-xl-7">
        <Card className="st-card">
          <Card.Body>
            <div className="st-title"><Icon icon="mdi:numeric" width="20" height="20" /> Numbering</div>
            <Alert variant="light" className="small" style={{ border: "1px solid #e3e3e6" }}>
              Each number is the record id with a prefix, e.g. <b>JOB-00124</b>. A change applies to the records created after you save. The numbers that already exist stay as they are. The invoice number is set in <b>Tax &amp; invoice</b>.
            </Alert>
            {NUM_ROWS.map(([k, label, hint]) => (
              <div key={k} className="mb-4">
                <div className="fw-semibold">{label}</div>
                <div className="small text-muted mb-2">{hint}</div>
                <div className="row g-3 align-items-end">
                  <div className="col-6 col-md-3"><Form.Label className="small fw-semibold mb-1">Prefix</Form.Label><Form.Control value={f[`${k}Prefix`]} onChange={set(`${k}Prefix`)} maxLength={6} style={{ textTransform: "uppercase" }} /></div>
                  <div className="col-6 col-md-3"><Form.Label className="small fw-semibold mb-1">Length</Form.Label><Form.Control type="number" min="3" max="8" value={f[`${k}Digits`]} onChange={set(`${k}Digits`)} /></div>
                  <div className="col-12 col-md-6"><div className="small text-muted">Example (record 124)</div><div className="st-sample">{sample(k)}</div></div>
                </div>
              </div>
            ))}
            <div className="d-flex gap-2 mt-2">
              <Button variant="success" size="lg" disabled={!dirty || saving} onClick={submit}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:content-save-outline" />} Save</Button>
              <Button variant="light" size="lg" disabled={!dirty} style={{ border: "1.5px solid #c4c4ca" }} onClick={() => setF({ ...base })}>Reset</Button>
            </div>
          </Card.Body>
        </Card>
      </div>
      <div className="col-12 col-xl-5">
        <Card className="st-card">
          <Card.Body>
            <div className="st-title"><Icon icon="mdi:history" width="20" height="20" /> Recent changes</div>
            {(logData?.log || []).length === 0 && <div className="text-muted small">No changes yet.</div>}
            {(logData?.log || []).slice(0, 10).map((l) => {
              const kind = String(l.key).replace(/(Prefix|Digits)$/, "");
              return (
                <div key={l.id} className="st-log">
                  <b>{NUM_LABEL[kind] || kind} {String(l.key).endsWith("Prefix") ? "prefix" : "length"}</b>
                  <div className="small">{shortVal(l.oldValue)} → {shortVal(l.newValue)}</div>
                  <div className="small text-muted">{new Date(l.changedAt).toLocaleString()}{l.changedByName ? ` · ${l.changedByName}` : ""}</div>
                </div>
              );
            })}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

function TaxInvoice() {
  const { data, isLoading, isError } = useGetInvoiceSettingsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: logData } = useGetSettingsLogQuery("invoice");
  const [save, { isLoading: saving }] = useSaveInvoiceSettingsMutation();
  const [f, setF] = useState(null);
  const loaded = useRef(false);
  useEffect(() => { if (data?.invoice && !loaded.current) { loaded.current = true; setF({ ...data.invoice }); } }, [data]);
  const base = data?.invoice;
  const dirty = !!f && !!base && JSON.stringify(f) !== JSON.stringify(base);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const put = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleMethod = (m) => setF((x) => ({ ...x, methods: x.methods.includes(m) ? x.methods.filter((y) => y !== m) : [...x.methods, m] }));
  const setTerm = (i, v) => setF((x) => ({ ...x, terms: x.terms.map((t, k) => (k === i ? v : t)) }));

  const submit = async () => {
    try {
      const out = await save({ ...f, terms: (f.terms || []).map((t) => t.trim()).filter(Boolean) }).unwrap();
      loaded.current = true; setF({ ...out.invoice });
      Swal.fire({ title: "Saved", icon: "success", timer: 1200, showConfirmButton: false });
    } catch (ex) { Swal.fire({ title: "Please check", text: ex?.data?.message || "Could not save.", icon: "error", confirmButtonColor: "#111" }); }
  };

  if (isLoading || !f) return isError ? <Alert variant="danger">Could not load the invoice settings.</Alert> : <div className="text-center py-5"><Spinner /></div>;
  const digits = Math.min(10, Math.max(3, Number(f.digits) || 5));
  const sample = `${f.prefix || ""}${String(f.nextNumber ?? 1).padStart(digits, "0")}`;
  return (
    <div className="row g-3">
      <div className="col-12 col-xl-7">
        <Card className="st-card mb-3"><Card.Body>
          <div className="st-title"><Icon icon="mdi:percent-outline" width="20" height="20" /> Tax (VAT)</div>
          <Form.Check type="switch" id="st-vat-on" className="mb-3" label="Add VAT to new invoices by default (tax invoice)" checked={!!f.vatDefaultOn} onChange={(e) => put("vatDefaultOn", e.target.checked)} />
          <div className="row g-3">
            <div className="col-12 col-md-4"><Form.Label className="fw-semibold">VAT %</Form.Label><Form.Control type="number" min="0" max="100" step="0.01" value={f.vatPercent} onChange={set("vatPercent")} /></div>
            <div className="col-12 col-md-8"><Form.Label className="fw-semibold">VAT registration no</Form.Label><Form.Control value={f.vatRegNo} onChange={set("vatRegNo")} maxLength={60} /></div>
          </div>
          <div className="small text-muted mt-2">A new VAT % is used for invoices created from now on. Existing invoices keep their own %. The VAT switch and % can still be changed on each invoice.</div>
        </Card.Body></Card>

        <Card className="st-card mb-3"><Card.Body>
          <div className="st-title"><Icon icon="mdi:numeric" width="20" height="20" /> Invoice number</div>
          <div className="row g-3">
            <div className="col-6 col-md-3"><Form.Label className="fw-semibold">Prefix</Form.Label><Form.Control value={f.prefix} onChange={set("prefix")} maxLength={8} /></div>
            <div className="col-6 col-md-3"><Form.Label className="fw-semibold">Number length</Form.Label><Form.Control type="number" min="3" max="10" value={f.digits} onChange={set("digits")} /></div>
            <div className="col-12 col-md-6"><Form.Label className="fw-semibold">Next number</Form.Label><Form.Control type="number" min={base.nextNumber || 1} value={f.nextNumber ?? ""} onChange={set("nextNumber")} /></div>
          </div>
          <div className="small text-muted mt-2">The next invoice will be <b>{sample}</b>. The next number can only be raised, never lowered.</div>
        </Card.Body></Card>

        <Card className="st-card mb-3"><Card.Body>
          <div className="st-title"><Icon icon="mdi:cash-multiple" width="20" height="20" /> Payments &amp; discount</div>
          <div className="fw-semibold mb-2">Payment methods allowed</div>
          <div className="row g-2 mb-3">
            {PAY_METHODS.map(([k, label]) => (
              <div className="col-6 col-md-4" key={k}><Form.Check type="checkbox" id={`st-pm-${k}`} label={label} checked={f.methods.includes(k)} onChange={() => toggleMethod(k)} /></div>
            ))}
          </div>
          <Form.Label className="fw-semibold">Maximum discount (% of the sub total)</Form.Label>
          <Form.Control type="number" min="0" max="100" step="0.01" value={f.maxDiscountPercent} onChange={set("maxDiscountPercent")} style={{ maxWidth: 200 }} />
          <div className="small text-muted mt-1">100 means no limit.</div>
        </Card.Body></Card>

        <Card className="st-card mb-3"><Card.Body>
          <div className="st-title"><Icon icon="mdi:bank-outline" width="20" height="20" /> Bank details on the invoice</div>
          <Form.Check type="switch" id="st-bank-on" className="mb-3" label="Print the bank details on the invoice" checked={!!f.showBank} onChange={(e) => put("showBank", e.target.checked)} />
          {f.showBank && (
            <div className="row g-3">
              <div className="col-12 col-md-6"><Form.Label className="fw-semibold">Bank</Form.Label><Form.Control value={f.bankName} onChange={set("bankName")} maxLength={80} /></div>
              <div className="col-12 col-md-6"><Form.Label className="fw-semibold">Branch</Form.Label><Form.Control value={f.bankBranch} onChange={set("bankBranch")} maxLength={80} /></div>
              <div className="col-12 col-md-6"><Form.Label className="fw-semibold">Account name</Form.Label><Form.Control value={f.bankAccountName} onChange={set("bankAccountName")} maxLength={80} /></div>
              <div className="col-12 col-md-6"><Form.Label className="fw-semibold">Account no</Form.Label><Form.Control value={f.bankAccountNo} onChange={set("bankAccountNo")} maxLength={40} /></div>
            </div>
          )}
        </Card.Body></Card>

        <Card className="st-card"><Card.Body>
          <div className="st-title"><Icon icon="mdi:text-box-outline" width="20" height="20" /> Invoice footer &amp; terms</div>
          <Form.Label className="fw-semibold">Footer note</Form.Label>
          <Form.Control value={f.footerNote} onChange={set("footerNote")} maxLength={300} placeholder="e.g. Thank you for choosing us. Goods once sold are not returnable." className="mb-3" />
          <div className="fw-semibold mb-2">Invoice terms</div>
          {(f.terms || []).map((t, i) => (
            <div key={i} className="d-flex gap-2 align-items-start mb-2">
              <div className="st-no">{i + 1}</div>
              <Form.Control as="textarea" rows={2} value={t} maxLength={400} onChange={(e) => setTerm(i, e.target.value)} />
              <Button variant="outline-danger" size="sm" onClick={() => put("terms", f.terms.filter((_, k) => k !== i))}><Icon icon="mdi:delete-outline" /></Button>
            </div>
          ))}
          <Button variant="outline-dark" size="sm" disabled={(f.terms || []).length >= 30} onClick={() => put("terms", [...(f.terms || []), ""])}><Icon icon="mdi:plus" /> Add term</Button>
        </Card.Body></Card>

        <div className="d-flex gap-2 mt-3">
          <Button variant="success" size="lg" disabled={!dirty || saving} onClick={submit}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:content-save-outline" />} Save</Button>
          <Button variant="light" size="lg" disabled={!dirty} style={{ border: "1.5px solid #c4c4ca" }} onClick={() => setF({ ...base })}>Reset</Button>
        </div>
      </div>

      <div className="col-12 col-xl-5">
        <Card className="st-card">
          <Card.Body>
            <div className="st-title"><Icon icon="mdi:history" width="20" height="20" /> Recent changes</div>
            {(logData?.log || []).length === 0 && <div className="text-muted small">No changes yet.</div>}
            {(logData?.log || []).slice(0, 12).map((l) => (
              <div key={l.id} className="st-log">
                <b>{INV_LABEL[l.key] || l.key}</b>
                <div className="small">{logVal(l.oldValue)} → {logVal(l.newValue)}</div>
                <div className="small text-muted">{new Date(l.changedAt).toLocaleString()}{l.changedByName ? ` · ${l.changedByName}` : ""}</div>
              </div>
            ))}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

function TermsEditor() {
  const { data, isLoading, isError } = useGetTermsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: logData } = useGetSettingsLogQuery("terms");
  const [save, { isLoading: saving }] = useSaveTermsMutation();
  const [list, setList] = useState([]);
  const loaded = useRef(false);
  useEffect(() => {
    if (data?.terms && !loaded.current) { loaded.current = true; setList(data.terms.estimate || []); }
  }, [data]);
  const base = data?.terms?.estimate || [];
  const clean = list.map((t) => t.trim()).filter(Boolean);
  const dirty = JSON.stringify(clean) !== JSON.stringify(base);
  const setAt = (i, v) => setList((l) => l.map((t, k) => (k === i ? v : t)));
  const move = (i, d) => setList((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  const submit = async () => {
    try { await save({ estimate: clean }).unwrap(); setList(clean); Swal.fire({ title: "Saved", icon: "success", timer: 1200, showConfirmButton: false }); }
    catch (ex) { Swal.fire({ title: "Please check", text: ex?.data?.message || "Could not save.", icon: "error", confirmButtonColor: "#111" }); }
  };

  if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
  if (isError) return <Alert variant="danger">Could not load the terms.</Alert>;
  return (
    <div className="row g-3">
      <div className="col-12 col-xl-7">
        <Card className="st-card">
          <Card.Body>
            <div className="st-title"><Icon icon="mdi:file-document-edit-outline" width="20" height="20" /> Estimate terms &amp; conditions</div>
            <div className="small text-muted mb-3">These lines are printed at the bottom of every estimate (Customer Approval estimate and Extra Job Scope estimate), above the signatures.</div>
            {list.length === 0 && <div className="text-muted small mb-3">No terms. Nothing will be printed on the estimates.</div>}
            {list.map((t, i) => (
              <div key={i} className="d-flex gap-2 align-items-start mb-2">
                <div className="st-no">{i + 1}</div>
                <Form.Control as="textarea" rows={2} value={t} maxLength={400} onChange={(e) => setAt(i, e.target.value)} />
                <div className="d-flex flex-column gap-1">
                  <Button variant="light" size="sm" disabled={i === 0} onClick={() => move(i, -1)} style={{ border: "1px solid #c4c4ca" }}><Icon icon="mdi:chevron-up" /></Button>
                  <Button variant="light" size="sm" disabled={i === list.length - 1} onClick={() => move(i, 1)} style={{ border: "1px solid #c4c4ca" }}><Icon icon="mdi:chevron-down" /></Button>
                </div>
                <Button variant="outline-danger" size="sm" onClick={() => setList((l) => l.filter((_, k) => k !== i))}><Icon icon="mdi:delete-outline" /></Button>
              </div>
            ))}
            <Button variant="outline-dark" size="sm" disabled={list.length >= 30} onClick={() => setList((l) => [...l, ""])}><Icon icon="mdi:plus" /> Add term</Button>
            <div className="d-flex gap-2 mt-4">
              <Button variant="success" size="lg" disabled={!dirty || saving} onClick={submit}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:content-save-outline" />} Save</Button>
              <Button variant="light" size="lg" disabled={!dirty} style={{ border: "1.5px solid #c4c4ca" }} onClick={() => setList(base)}>Reset</Button>
            </div>
          </Card.Body>
        </Card>
      </div>
      <div className="col-12 col-xl-5">
        <Card className="st-card mb-3">
          <Card.Body>
            <div className="st-title"><Icon icon="mdi:eye-outline" width="20" height="20" /> Preview</div>
            {clean.length === 0 ? <div className="text-muted small">Nothing to print.</div> : (
              <div className="st-prev">
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#8f0b0b", marginBottom: 6 }}>Terms &amp; conditions</div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "#57534e" }}>{clean.map((t, i) => <li key={i}>{t}</li>)}</ol>
              </div>
            )}
          </Card.Body>
        </Card>
        <Card className="st-card">
          <Card.Body>
            <div className="st-title"><Icon icon="mdi:history" width="20" height="20" /> Recent changes</div>
            {(logData?.log || []).length === 0 && <div className="text-muted small">No changes yet.</div>}
            {(logData?.log || []).slice(0, 8).map((l) => (
              <div key={l.id} className="st-log">
                <b>Estimate terms</b>
                <div className="small">{(l.oldValue || []).length} → {(l.newValue || []).length} terms</div>
                <div className="small text-muted">{new Date(l.changedAt).toLocaleString()}{l.changedByName ? ` · ${l.changedByName}` : ""}</div>
              </div>
            ))}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

function UsersRoles() {
  const [tab, setTab] = useState("user_list");
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { setIsAdmin(String(sessionStorage.getItem("role_id")) === "1"); }, []);
  return (
    <>
      <ButtonNavigation active={tab} onChange={setTab} isAdmin={isAdmin} />
      <div style={{ display: tab === "add_user" ? "block" : "none" }}><AddUserForm /></div>
      {isAdmin && <div style={{ display: tab === "add_role" ? "block" : "none" }}><AddRoleForm /></div>}
      {tab === "user_list" && <UserList />}
      {isAdmin && tab === "role_list" && <RoleList />}
    </>
  );
}

function SettingsPage() {
  const [group, setGroup] = useState("company");
  return (
    <div className="st-root">
      <style>{`
        .st-card { border: 1px solid #e3e3e6; border-radius: 14px; }
        .st-title { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .st-logo { width: 110px; height: 80px; border: 1.5px dashed #c4c4ca; border-radius: 12px; display: grid; place-items: center; background: #fafafa; overflow: hidden; }
        .st-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .st-prev { border: 1px solid #e3e3e6; border-radius: 12px; padding: 14px; background: #fff; }
        .st-bar { height: 5px; margin-top: 12px; background: linear-gradient(90deg,#111 0%,#111 60%,#c8102e 60%); }
        .st-no { width: 28px; height: 28px; flex: 0 0 28px; border-radius: 50%; background: #111; color: #fff; display: grid; place-items: center; font-size: .8rem; font-weight: 700; margin-top: 8px; }
        .st-sample { font-size: 1.15rem; font-weight: 800; letter-spacing: .04em; color: #111; padding: 6px 12px; background: #f6f6f7; border: 1px solid #e3e3e6; border-radius: 10px; display: inline-block; }
        .sms-tpl { padding: 14px 0; border-bottom: 1px solid #f0f0f2; }
        .sms-tpl:last-child { border-bottom: 0; }
        .sms-chip { border: 1px solid #c4c4ca; background: #fff; border-radius: 99px; padding: 2px 10px; font-size: .78rem; font-family: monospace; color: #c8102e; }
        .sms-chip:hover { background: #fff3f4; border-color: #c8102e; }
        .sms-prev { background: #f6f6f7; border: 1px solid #e3e3e6; border-radius: 12px; padding: 10px 12px; font-size: .9rem; white-space: pre-wrap; }
        .pr-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 99px; background: #111; color: #fff; font-weight: 700; }
        .pr-chip button { border: 0; background: rgba(255,255,255,.2); color: #fff; border-radius: 50%; width: 20px; height: 20px; display: grid; place-items: center; padding: 0; }
        .pr-chip button:hover { background: #c8102e; }
        .pr-calc { border: 1px solid #e3e3e6; border-radius: 12px; overflow: hidden; }
        .pr-calc div { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #f0f0f2; }
        .pr-calc div.g { background: #111; color: #fff; border-bottom: 0; font-size: 1.05rem; }
        .pr-none { background: #e5e7eb; color: #444; }
        .st-log { padding: 8px 0; border-bottom: 1px solid #f0f0f2; }
        .st-log:last-child { border-bottom: 0; }
        .st-root .list-group-item.active { background: #111; border-color: #111; box-shadow: inset 4px 0 0 #c8102e; }
        .st-root .form-control { border-radius: 10px; min-height: 44px; }
      `}</style>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-3 px-3 py-2 rounded border" style={{ backgroundColor: "#e5e7eb" }}>
        <h4 className="mb-0 text-dark d-flex align-items-center gap-2"><Icon icon="mdi:cog-outline" width="26" height="26" /> Settings</h4>
      </div>
      <div className="row g-3">
        <div className="col-12 col-lg-3">
          <ListGroup className="shadow-sm">
            {GROUPS.map((g) => (
              <ListGroup.Item key={g.key} action active={group === g.key} disabled={g.soon} onClick={() => !g.soon && setGroup(g.key)} className="d-flex align-items-center gap-2">
                <Icon icon={g.icon} width="20" height="20" /> <span style={{ flex: 1 }}>{g.label}</span>{g.soon && <span className="small text-muted">Soon</span>}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
        <div className="col-12 col-lg-9">{group === "company" && <CompanyProfile />}{group === "terms" && <TermsEditor />}{group === "tax" && <TaxInvoice />}{group === "numbering" && <Numbering />}{group === "sms" && <SmsSettings />}{group === "pricing" && <PricingSettings />}{group === "users" && <UsersRoles />}</div>
      </div>
    </div>
  );
}

export default withAuthorization(SettingsPage);