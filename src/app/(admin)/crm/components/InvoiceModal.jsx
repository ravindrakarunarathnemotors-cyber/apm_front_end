"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { printHtml, savePdf } from "./estimatePdf";
import {
  useAddInvoiceLineMutation, useAddInvoicePaymentMutation, useDeleteInvoiceLineMutation, useGetInvoiceQuery,
  useUpdateInvoiceMutation, useVoidInvoicePaymentMutation, useSetInvoiceLineDiscountMutation,
} from "./invoiceApi";

// Invoice of a job (created when the Customer Approval stage is completed): lines, discount, VAT, payments (all methods).
// Props: jobId, onHide, editable (default false: the Jobs / Department dashboards only SHOW the invoice;
//   discount, VAT, extra lines and payments are handled by the Account department, which opens it with editable)
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const METHOD = { CASH: "Cash", CARD: "Card", BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque", ONLINE: "Online payment", MOBILE_WALLET: "Mobile wallet", CREDIT: "Credit (on account)" };
const METHOD_SHORT = { BANK_TRANSFER: "Bank", ONLINE: "Online", MOBILE_WALLET: "Wallet", CREDIT: "Credit" };
const METHOD_ICON = { CASH: "mdi:cash", CARD: "mdi:credit-card-outline", BANK_TRANSFER: "mdi:bank-outline", CHEQUE: "mdi:checkbook", ONLINE: "mdi:web", MOBILE_WALLET: "mdi:cellphone-nfc", CREDIT: "mdi:account-clock-outline" };
const STATUS = { UNPAID: ["Unpaid", "danger"], PARTIAL: ["Partly paid", "warning"], PAID: ["Paid", "success"], CANCELLED: ["Cancelled", "secondary"] };
const today = () => new Date().toISOString().slice(0, 10);

const DOC_CSS = `*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:12px;background:#fff}.page{padding:30px 36px;position:relative}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.brand{display:flex;gap:14px;align-items:center}.brand img{height:62px;width:auto}.brandname{font-size:19px;font-weight:800;letter-spacing:.04em}.brandsub{font-size:11px;color:#555;line-height:1.5;margin-top:2px}
.doc{text-align:right}.doc .t{font-size:26px;font-weight:800;letter-spacing:.06em;color:#111}.doc .n{font-size:13px;font-weight:700;color:#c8102e;margin-top:2px}.doc .d{font-size:11px;color:#555;margin-top:2px}
.bar{height:5px;background:linear-gradient(90deg,#111 0%,#111 60%,#c8102e 60%);margin:14px 0 16px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}.box{border:1px solid #e3e3e6;border-radius:8px;padding:10px 12px}.box h3{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#c8102e}.box .v{font-weight:700;font-size:13px}.box .s{color:#555;margin-top:2px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#111;color:#fff;text-align:left;padding:8px 10px;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}td{padding:8px 10px;border-bottom:1px solid #ececef;vertical-align:top}.r{text-align:right}.c{text-align:center;width:34px}tbody tr:nth-child(even) td{background:#fafafb}
.bottom{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.left{flex:1;min-width:0}.tot{width:300px;border:1px solid #e3e3e6;border-radius:8px;padding:6px 12px}.tot div{display:flex;justify-content:space-between;padding:5px 0}.tot .g{border-top:2px solid #111;font-size:15px;font-weight:800;margin-top:4px;padding-top:8px}.tot .b{color:#c8102e;font-weight:800}
h2{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;margin:0 0 6px;color:#c8102e}.note{color:#444;margin:0 0 10px}
.stamp{position:absolute;right:46px;top:132px;border:3px solid #15803d;color:#15803d;padding:2px 16px;font-size:22px;font-weight:800;letter-spacing:.12em;border-radius:8px;transform:rotate(-8deg);opacity:.75}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:46px}.sign div{border-top:1px solid #777;padding-top:5px;text-align:center;font-size:10.5px;color:#555}
.foot{margin-top:22px;border-top:1px solid #e3e3e6;padding-top:10px;text-align:center;color:#666;font-size:10.5px}`;

const CSS = `
.modal-backdrop.iv-blur { background: rgba(15,23,42,.45); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); } .modal-backdrop.iv-blur.show { opacity: 1; }
.iv-modal .modal-content { border: 0; overflow: hidden; background: #f1f5f9; font-family: Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; font-size: 14px; -webkit-font-smoothing: antialiased; }
.iv-modal:not(.iv-full) .modal-content { border-radius: 16px; }
.iv-modal.iv-full.modal-dialog { max-width: none; width: 100vw; margin: 0; height: 100vh; }
.iv-modal .modal-body.iv-body { padding: 0; background: #f1f5f9; }
.iv-modal .iv-wrap { container-type: inline-size; container-name: iv; }
.iv-modal.iv-full .modal-body.iv-body { display: flex; flex-direction: column; min-height: 0; overflow: hidden; } .iv-modal.iv-full .iv-wrap { flex: 1 1 auto; min-height: 0; }
.iv-modal:not(.iv-full) .iv-wrap { padding: 16px; }
/* ---- top bar ---- */
.iv-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; flex: none; }
.iv-bar-l { display: flex; align-items: center; gap: 12px; min-width: 0; } .iv-bar-ic { width: 38px; height: 38px; border-radius: 10px; background: #0f172a; color: #fff; display: grid; place-items: center; flex: 0 0 38px; }
.iv-bar-t { font-weight: 700; font-size: 1rem; } .iv-bar-t span { color: #64748b; font-weight: 500; } .iv-bar-s { color: #64748b; font-size: .82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.iv-bar-r { display: flex; gap: 8px; flex: none; }
.iv-tbtn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; color: #0f172a; font-weight: 600; font-size: .86rem; cursor: pointer; transition: background .12s, border-color .12s; }
.iv-tbtn:hover { background: #f1f5f9; border-color: #94a3b8; } .iv-tbtn.solid { background: #0f172a; color: #fff; border-color: #0f172a; } .iv-tbtn.solid:hover { background: #1e293b; } .iv-tbtn:disabled { opacity: .6; }
/* ---- layout ---- */
.iv-app { height: 100%; } .iv-layout { display: grid; grid-template-columns: minmax(0, 1fr) 390px; gap: 20px; height: 100%; padding: 20px; max-width: 1700px; margin: 0 auto; }
.iv-main, .iv-aside { min-width: 0; min-height: 0; overflow-y: auto; scrollbar-width: thin; } .iv-aside { display: flex; flex-direction: column; gap: 14px; padding-bottom: 4px; }
.iv-paper { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.05); padding: 22px 28px; }
.iv-paper-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.iv-eyebrow { font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
.iv-no { margin: 2px 0 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -.02em; }
.iv-paper-meta { display: flex; gap: 28px; flex-wrap: wrap; } .iv-paper-meta div span { display: block; font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #64748b; } .iv-paper-meta b { font-weight: 600; }
.iv-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .76rem; font-weight: 700; background: #e2e8f0; color: #334155; }
.iv-pill.unpaid { background: #fee2e2; color: #991b1b; } .iv-pill.partial { background: #fef3c7; color: #92400e; } .iv-pill.paid { background: #dcfce7; color: #166534; } .iv-pill.cancelled { background: #e2e8f0; color: #475569; }
.iv-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 14px 0 6px; padding: 12px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
.iv-party-name { font-weight: 700; font-size: 1.02rem; margin-top: 3px; } .iv-muted { color: #64748b; } .iv-muted.sm, .sm { font-size: .8rem; }
.iv-plate { font-weight: 700; font-size: .85rem; letter-spacing: .05em; padding: 1px 9px; border: 1.5px solid #334155; border-radius: 6px; background: #fefce8; }
/* ---- items ---- */
.iv-rows { display: flex; flex-direction: column; }
.iv-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) 56px 120px 168px 132px 32px; gap: 0 12px; align-items: center; padding: 9px 4px; border-bottom: 1px solid #eef2f6; font-variant-numeric: tabular-nums; }
.iv-row:not(.iv-row-h):hover { background: #f8fafc; } .iv-row .r { text-align: right; }
.iv-row-h { padding: 8px 4px; border-bottom: 1px solid #cbd5e1; font-size: .7rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #64748b; }
.iv-n { color: #94a3b8; font-size: .8rem; } .iv-desc { font-weight: 600; overflow-wrap: anywhere; }
.iv-tag { margin-left: 8px; font-style: normal; font-size: .68rem; font-weight: 700; padding: 1px 8px; border-radius: 999px; background: #0f172a; color: #fff; vertical-align: 2px; } .iv-tag.alt { background: #e2e8f0; color: #334155; }
.iv-amt { font-weight: 700; } .iv-amt small { display: block; font-weight: 500; color: #94a3b8; text-decoration: line-through; font-size: .74rem; }
.iv-dcell { display: flex; justify-content: flex-end; }
.iv-x button { width: 30px; height: 30px; border: 0; border-radius: 8px; background: transparent; color: #94a3b8; display: grid; place-items: center; cursor: pointer; } .iv-x button:hover { background: #fee2e2; color: #b91c1c; }
.iv-empty { padding: 22px 4px; color: #64748b; }
.iv-add { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 4px 0; } .iv-add-ic { color: #94a3b8; }
/* ---- inputs ---- */
.iv-in { height: 38px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; font-size: .9rem; color: #0f172a; min-width: 0; outline: 0; transition: border-color .12s, box-shadow .12s; }
textarea.iv-in { height: auto; padding: 10px 12px; width: 100%; resize: vertical; } .iv-in.grow { flex: 1 1 220px; } .iv-in.sm { width: 64px; height: 30px; text-align: right; padding: 0 8px; } .iv-in.mt { width: 100%; margin-top: 10px; }
.iv-in:focus, .iv-money:focus-within, .iv-disc-in:focus-within { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,.12); } .iv-in:disabled { background: #f1f5f9; }
.iv-btn { height: 38px; padding: 0 18px; border: 0; border-radius: 10px; background: #0f172a; color: #fff; font-weight: 600; cursor: pointer; } .iv-btn:hover { background: #1e293b; } .iv-btn:disabled { opacity: .45; cursor: not-allowed; } .iv-btn.ghost { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; } .iv-btn.ghost:hover { background: #f1f5f9; }
.iv-disc { display: inline-flex; flex-direction: column; align-items: flex-end; width: 100%; max-width: 168px; }
.iv-disc-in { display: flex; width: 100%; border: 1px solid #cbd5e1; border-radius: 9px; overflow: hidden; background: #fff; } .iv-disc.compact .iv-disc-in { height: 32px; }
.iv-disc-in input { flex: 1 1 auto; min-width: 0; width: 100%; border: 0; outline: 0; padding: 0 8px; text-align: right; font-size: .88rem; background: transparent; } .iv-disc-in input:disabled { background: #f1f5f9; }
.iv-seg { display: inline-flex; border-left: 1px solid #cbd5e1; background: #f1f5f9; } .iv-seg button { border: 0; background: transparent; padding: 0 9px; font-size: .74rem; font-weight: 700; color: #64748b; cursor: pointer; } .iv-seg button.on { background: #0f172a; color: #fff; } .iv-seg button:disabled { cursor: not-allowed; opacity: .6; }
.iv-disc-sub { font-size: .72rem; color: #15803d; margin-top: 2px; font-weight: 600; }
/* ---- totals ---- */
.iv-bottom { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 32px; margin-top: 22px; align-items: start; }
.iv-totals { margin: 0; font-variant-numeric: tabular-nums; } .iv-totals > div { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; } .iv-totals dt { font-weight: 500; color: #475569; } .iv-totals dd { margin: 0; font-weight: 600; }
.iv-totals .good dd, .iv-totals .good-t { color: #15803d; } .iv-totals .sub dt, .iv-totals .sub dd { font-size: .8rem; font-weight: 500; }
.iv-totals .grand { margin-top: 6px; padding: 14px 0 10px; border-top: 2px solid #0f172a; } .iv-totals .grand dt, .iv-totals .grand dd { font-size: 1.25rem; font-weight: 800; color: #0f172a; }
.iv-totals .due { background: #0f172a; border-radius: 12px; padding: 12px 16px; margin-top: 8px; } .iv-totals .due dt, .iv-totals .due dd { color: #fff; font-weight: 700; font-size: 1.08rem; }
.iv-vat { display: inline-flex; align-items: center; gap: 6px; } .iv-vat b { min-width: 90px; text-align: right; }
.iv-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500; margin: 0; } .iv-switch input { position: absolute; opacity: 0; } .iv-switch i { width: 36px; height: 20px; border-radius: 999px; background: #cbd5e1; position: relative; transition: background .15s; }
.iv-switch i::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 1px 2px rgba(0,0,0,.3); } .iv-switch input:checked + i { background: #0f172a; } .iv-switch input:checked + i::after { transform: translateX(16px); } .iv-switch input:focus-visible + i { box-shadow: 0 0 0 3px rgba(15,23,42,.2); }
/* ---- right side ---- */
.iv-due-card { border-radius: 16px; padding: 16px 20px; background: linear-gradient(145deg, #0f172a, #1e293b); color: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.18); } .iv-due-card .iv-eyebrow { color: #94a3b8; } .iv-due-card.paid { background: linear-gradient(145deg, #14532d, #166534); } .iv-due-card.paid .iv-eyebrow { color: #bbf7d0; }
.iv-due-amt { font-size: 1.9rem; font-weight: 800; letter-spacing: -.02em; margin: 2px 0 10px; font-variant-numeric: tabular-nums; }
.iv-prog { height: 8px; border-radius: 999px; background: rgba(255,255,255,.18); overflow: hidden; } .iv-prog i { display: block; height: 100%; background: #4ade80; border-radius: 999px; transition: width .25s; }
.iv-due-sub { display: flex; justify-content: space-between; margin-top: 8px; font-size: .8rem; color: #cbd5e1; }
.iv-card2 { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 18px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.iv-h3 { font-size: .95rem; font-weight: 700; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; } .iv-count { background: #e2e8f0; color: #334155; border-radius: 999px; padding: 0 8px; font-size: .72rem; }
.iv-lbl { display: block; font-size: .7rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; margin: 9px 0 4px; }
.iv-methods { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; } .iv-methods button { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 2px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; color: #334155; font-size: .68rem; font-weight: 600; line-height: 1.15; text-align: center; cursor: pointer; transition: all .12s; }
.iv-methods button:hover { border-color: #0f172a; } .iv-methods button.on { background: #0f172a; border-color: #0f172a; color: #fff; }
.iv-money { display: flex; align-items: center; gap: 8px; height: 46px; padding: 0 14px; border: 1px solid #cbd5e1; border-radius: 12px; background: #fff; } .iv-money span { color: #64748b; font-weight: 600; } .iv-money input { flex: 1; min-width: 0; border: 0; outline: 0; text-align: right; font-size: 1.5rem; font-weight: 800; background: transparent; font-variant-numeric: tabular-nums; }
.iv-chips { display: flex; gap: 6px; margin-top: 8px; } .iv-chips button { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 999px; padding: 3px 12px; font-size: .76rem; font-weight: 600; cursor: pointer; } .iv-chips button:hover { background: #0f172a; border-color: #0f172a; color: #fff; }
.iv-cashbox { margin-top: 10px; padding: 2px 12px 10px; border: 1px dashed #94a3b8; border-radius: 12px; background: #f8fafc; } .iv-inline { display: flex; gap: 8px; } .iv-inline .iv-in { flex: 1; }
.iv-change { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 9px 14px; border-radius: 10px; background: #0f172a; color: #fff; } .iv-change b { font-size: 1.2rem; font-variant-numeric: tabular-nums; } .iv-change.short { background: #b45309; }
.iv-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; } .iv-two .iv-in { width: 100%; }
.iv-lockbadge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 9px; border-radius: 999px; background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; font-size: .72rem; font-weight: 700; vertical-align: middle; }
.iv-lock .iv-pay-btn { background: #94a3b8; cursor: not-allowed; opacity: .8; }
.iv-pay-btn { width: 100%; margin-top: 12px; height: 46px; border: 0; border-radius: 12px; background: #15803d; color: #fff; font-weight: 700; font-size: .98rem; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: background .12s; } .iv-pay-btn:hover { background: #166534; } .iv-pay-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
.iv-tl { list-style: none; margin: 0; padding: 0; } .iv-tl li { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-top: 1px solid #eef2f6; } .iv-tl li:first-child { border-top: 0; padding-top: 0; } .iv-tl li.void { opacity: .5; } .iv-tl li.void .iv-tl-amt { text-decoration: line-through; }
.iv-tl-ic { width: 30px; height: 30px; border-radius: 8px; background: #f1f5f9; color: #334155; display: grid; place-items: center; flex: 0 0 30px; } .iv-tl-b { flex: 1; min-width: 0; } .iv-tl-amt { font-variant-numeric: tabular-nums; }
.iv-void { width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: #94a3b8; display: grid; place-items: center; cursor: pointer; } .iv-void:hover { background: #fee2e2; color: #b91c1c; }
/* ---- narrower windows: follows the window width ---- */
@container iv (max-width: 1100px) { .iv-layout { grid-template-columns: 1fr; height: auto; } .iv-main, .iv-aside { overflow: visible; } .iv-aside { order: 0; } .iv-app { height: auto; } .iv-bottom { grid-template-columns: 1fr; gap: 20px; } }
@container iv (max-width: 760px) {
  .iv-layout { padding: 12px; gap: 14px; } .iv-paper { padding: 18px 16px; } .iv-parties { grid-template-columns: 1fr; gap: 12px; } .iv-no { font-size: 1.5rem; }
  .iv-row-h { display: none; } .iv-row { grid-template-columns: 24px minmax(0, 1fr) auto 30px; gap: 6px 10px; padding: 14px 2px; }
  .iv-row > .iv-desc { grid-column: 2; grid-row: 1; } .iv-row > .iv-amt { grid-column: 3; grid-row: 1; } .iv-row > .iv-x { grid-column: 4; grid-row: 1; } .iv-row > .iv-n { grid-row: 1; }
  .iv-row > [data-l="Qty"], .iv-row > [data-l="Unit price"] { grid-row: 2; grid-column: 2; display: inline; text-align: left !important; color: #64748b; font-size: .84rem; } .iv-row > [data-l="Qty"]::before { content: "Qty "; } .iv-row > [data-l="Unit price"] { grid-column: 3 / 5; text-align: right !important; }
  .iv-row > .iv-dcell { grid-row: 3; grid-column: 2 / 5; justify-content: flex-start; } .iv-disc { max-width: 190px; align-items: flex-start; }
}
@container iv (max-width: 480px) { .iv-methods { grid-template-columns: repeat(2, 1fr); } .iv-two { grid-template-columns: 1fr; } .iv-due-amt { font-size: 1.7rem; } .iv-add .iv-in { width: 100% !important; flex: 1 1 100% !important; } }
@media (max-width: 760px) { .iv-bar { padding: 8px 12px; } .iv-tbtn span { display: none; } .iv-tbtn { padding: 0 11px; } .iv-bar-s { max-width: 40vw; } }
/* ---- big screens: the window fits the screen, the page itself does not scroll ---- */
@media (max-width: 1100px) { .iv-modal.iv-full .modal-body.iv-body { overflow-y: auto; } .iv-modal.iv-full .iv-wrap { flex: 0 0 auto; } }
`;

// A discount box: the value + a switch between % and Rs. Saves when the box is left (or Enter); shows what the discount comes to.
function DiscountBox({ mode, value, base, disabled, onSave, onLive, compact = false }) {
  const [m, setM] = useState(mode === "PERCENT" ? "PERCENT" : "AMOUNT");
  const [v, setV] = useState(value ? String(value) : "");
  useEffect(() => { setM(mode === "PERCENT" ? "PERCENT" : "AMOUNT"); setV(value ? String(value) : ""); }, [mode, value]);
  const num = Number(v || 0);
  const commit = (nm = m, nv = v) => { const n = Number(nv || 0); if (nm !== (mode === "PERCENT" ? "PERCENT" : "AMOUNT") || n !== Number(value || 0)) onSave(nm, n); };
  const calc = m === "PERCENT" ? Math.round(base * num) / 100 : num;
  return (
    <div className={`iv-disc ${compact ? "compact" : ""}`}>
      <div className="iv-disc-in">
        <input type="number" min="0" max={m === "PERCENT" ? 100 : undefined} step="any" inputMode="decimal" disabled={disabled} value={v} placeholder="0"
          onChange={(e) => { setV(e.target.value); onLive?.(m, Number(e.target.value || 0)); }} onBlur={() => commit()} onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }} aria-label="Discount" />
        <div className="iv-seg" role="group" aria-label="Discount type">
          <button type="button" disabled={disabled} className={m === "PERCENT" ? "on" : ""} onClick={() => { setM("PERCENT"); onLive?.("PERCENT", num); if (num > 0) commit("PERCENT", v); }}>%</button>
          <button type="button" disabled={disabled} className={m === "AMOUNT" ? "on" : ""} onClick={() => { setM("AMOUNT"); onLive?.("AMOUNT", num); if (num > 0) commit("AMOUNT", v); }}>Rs</button>
        </div>
      </div>
      {num > 0 && m === "PERCENT" && <div className="iv-disc-sub">- {money(calc)}</div>}
    </div>
  );
}

export default function InvoiceModal({ jobId, onHide, editable = false, onOpenInvoice }) {
  const { data, isLoading, isError, error: loadError } = useGetInvoiceQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [update, { isLoading: updating }] = useUpdateInvoiceMutation();
  const [addLine, { isLoading: addingLine }] = useAddInvoiceLineMutation();
  const [delLine] = useDeleteInvoiceLineMutation();
  const [addPay, { isLoading: paying }] = useAddInvoicePaymentMutation();
  const [voidPay] = useVoidInvoicePaymentMutation();
  const [setLineDisc] = useSetInvoiceLineDiscountMutation();
  const [busy, setBusy] = useState(false);
  const [taxPct, setTaxPct] = useState("");
  const [line, setLine] = useState({ description: "", qty: "1", unitPrice: "" });
  const [pay, setPay] = useState({ amount: "", method: "CASH", reference: "", note: "", paidAt: today(), tendered: "" });

  const inv = data?.invoice;
  // live values: the totals follow what is typed, before it is saved
  const [liveLine, setLiveLine] = useState({});     // { [lineId]: { mode, value } }
  const [liveInv, setLiveInv] = useState(null);     // { mode, value }
  useEffect(() => { setLiveLine({}); setLiveInv(null); }, [data]);
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const T = useMemo(() => {
    if (!data) return null;
    const lines = data.lines.map((l) => {
      const o = liveLine[l.id], mode = o ? o.mode : l.discMode, val = o ? o.value : l.discValue;
      const d = Math.min(l.amount, Math.max(0, mode === "PERCENT" ? r2((l.amount * val) / 100) : Number(val) || 0));
      return { ...l, discAmount: d, net: r2(l.amount - d) };
    });
    const sub = r2(lines.reduce((x, l) => x + l.amount, 0)), lineDisc = r2(lines.reduce((x, l) => x + l.discAmount, 0)), net = r2(sub - lineDisc);
    const im = liveInv ? liveInv.mode : data.invoice.discountMode, iv = liveInv ? liveInv.value : data.invoice.discountValue;
    const invDisc = Math.min(net, Math.max(0, im === "PERCENT" ? r2((net * iv) / 100) : Number(iv) || 0));
    const taxable = r2(net - invDisc), tax = data.invoice.taxEnabled ? r2((taxable * data.invoice.taxPercent) / 100) : 0, total = r2(taxable + tax);
    return { lines, sub, lineDisc, net, invDisc, tax, total, balance: Math.max(0, r2(total - data.invoice.paidAmount)) };
  }, [data, liveLine, liveInv]);
  // a job invoice can be viewed any time, but money is taken only after the job is completed (counter sales have no job status)
  const jobStatus = data?.job?.status || null;
  const jobOpen = Boolean(data && inv && !inv.isSale) && jobStatus !== "COMPLETED" && jobStatus !== "CANCELLED";   // a job invoice whose job is not completed (a missing status counts as not completed)
  const jobStatusText = "Job not completed yet";
  const cancellation = jobStatus === "CANCELLED" ? (data?.job?.cancellation || {}) : null;
  const cancelled = inv?.status === "CANCELLED" || !editable;   // view only unless editable
  const fail = (ex, fb) => Swal.fire({ title: "Please check", text: ex?.data?.message || fb, icon: "error", confirmButtonColor: "#111" });

  useEffect(() => { if (inv) setTaxPct(String(inv.taxPercent ?? "")); }, [inv?.taxPercent]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inv) setPay((p) => ({ ...p, amount: inv.balance > 0 ? String(inv.balance) : "" })); }, [inv?.balance]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch) => { try { await update({ jobId, ...patch }).unwrap(); } catch (ex) { setLiveInv(null); fail(ex, "Could not save."); } };
  const saveLineDisc = async (l, mode, value) => { try { await setLineDisc({ jobId, lineId: l.id, mode, value }).unwrap(); } catch (ex) { setLiveLine({}); fail(ex, "Could not save the discount."); } };
  const submitLine = async () => {
    try { await addLine({ jobId, description: line.description, qty: Number(line.qty), unitPrice: Number(line.unitPrice) }).unwrap(); setLine({ description: "", qty: "1", unitPrice: "" }); } catch (ex) { fail(ex, "Could not add the line."); }
  };
  const submitPay = async () => {
    if (jobOpen) return fail({}, "Payments can be recorded after the job is completed.");
    const isCash = (data.methods.includes(pay.method) ? pay.method : data.methods[0]) === "CASH";
    if (isCash && pay.tendered !== "" && Number(pay.tendered) < Number(pay.amount)) return fail({}, "The cash received is less than the payment amount.");
    try { await addPay({ jobId, ...pay, tendered: isCash && pay.tendered !== "" ? Number(pay.tendered) : undefined, method: data.methods.includes(pay.method) ? pay.method : data.methods[0], amount: Number(pay.amount) }).unwrap(); setPay((p) => ({ ...p, reference: "", note: "", tendered: "" })); } catch (ex) { fail(ex, "Could not add the payment."); }
  };
  const cancelPay = async (p) => {
    const c = await Swal.fire({ title: "Void this payment?", text: `${METHOD[p.method]} · ${money(p.amount)}`, icon: "warning", showCancelButton: true, confirmButtonText: "Void", confirmButtonColor: "#c8102e" });
    if (!c.isConfirmed) return;
    try { await voidPay({ jobId, paymentId: p.id }).unwrap(); } catch (ex) { fail(ex, "Could not void the payment."); }
  };

  const html = useMemo(() => {
    if (!data) return "";
    const { job, lines, payments } = data;
    const co = inv.company || {};
    const logo = co.logoUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/images/mainlogo.jpeg`;
    const taxInv = inv.taxEnabled;
    const live = payments.filter((p) => !p.voidedAt);
    const live2 = live;
    const hasDisc = lines.some((l) => l.discAmount > 0);
    const addr = [co.address, [co.phone, co.email].filter(Boolean).join("  |  "), co.website, taxInv && inv.vatRegNo ? `VAT Reg. No: ${inv.vatRegNo}` : ""].filter(Boolean);
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoiceNo)}</title><style>${DOC_CSS}</style></head><body><div class="page">
<div class="top"><div class="brand"><img src="${logo}" alt="" onerror="this.style.display='none'"/><div><div class="brandname">${esc(co.name || "KARUNARATHNE AUTO ZONE")}</div>${addr.length ? `<div class="brandsub">${addr.map(esc).join("<br/>")}</div>` : ""}</div></div>
<div class="doc"><div class="t">${taxInv ? "TAX INVOICE" : "INVOICE"}</div><div class="n">${esc(inv.invoiceNo)}</div><div class="d">Date: ${new Date(inv.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</div></div></div>
<div class="bar"></div>
${inv.status === "PAID" ? `<div class="stamp">PAID</div>` : ""}
<div class="parties">
  <div class="box"><h3>Bill to</h3><div class="v">${esc(job.customerName)}</div>${job.contactNumber ? `<div class="s">${esc(job.contactNumber)}</div>` : ""}</div>
  <div class="box"><h3>Vehicle &amp; job</h3><div class="v">${esc(job.regNo)}</div><div class="s">Job ${esc(job.jobNo)}${job.departmentName ? ` &middot; ${esc(job.departmentName)} Department` : ""}</div></div>
</div>
<table><thead><tr><th class="c">#</th><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th>${hasDisc ? `<th class="r">Discount</th>` : ""}<th class="r">Amount</th></tr></thead><tbody>
${lines.map((l, n) => `<tr><td class="c">${n + 1}</td><td>${esc(l.description)}</td><td class="r">${l.qty}</td><td class="r">${money(l.unitPrice)}</td>${hasDisc ? `<td class="r">${l.discAmount > 0 ? `- ${money(l.discAmount)}${l.discMode === "PERCENT" ? `<div style="font-size:10px;color:#777">${l.discValue}%</div>` : ""}` : "-"}</td>` : ""}<td class="r"><b>${money(l.net ?? l.amount)}</b></td></tr>`).join("")}
</tbody></table>
<div class="bottom"><div class="left">
${live2.length ? `<h2>Payments received</h2><table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${live2.map((p) => `<tr><td>${esc(p.paidAt)}</td><td>${esc(METHOD[p.method] || p.method)}</td><td>${esc(p.reference || "-")}</td><td class="r">${money(p.amount)}</td></tr>`).join("")}</tbody></table>` : ""}
${inv.notes ? `<h2>Note</h2><p class="note">${esc(inv.notes)}</p>` : ""}
${inv.doc?.bank ? `<h2>Pay by bank transfer</h2><p class="note" style="line-height:1.6">${[inv.doc.bank.name && `<b>${esc(inv.doc.bank.name)}</b>${inv.doc.bank.branch ? ` &middot; ${esc(inv.doc.bank.branch)}` : ""}`, inv.doc.bank.accountName && `Account name: ${esc(inv.doc.bank.accountName)}`, inv.doc.bank.accountNo && `Account no: <b>${esc(inv.doc.bank.accountNo)}</b>`].filter(Boolean).join("<br/>")}</p>` : ""}
</div>
<div class="tot"><div><span>Sub total</span><span>${money(inv.subtotal)}</span></div>
${inv.lineDiscount > 0 ? `<div><span>Item discounts</span><span>- ${money(inv.lineDiscount)}</span></div>` : ""}
${inv.discountAmount > 0 ? `<div><span>Discount${inv.discountMode === "PERCENT" ? ` (${inv.discountValue}%)` : ""}</span><span>- ${money(inv.discountAmount)}</span></div>` : ""}
${taxInv ? `<div><span>VAT ${inv.taxPercent}%</span><span>${money(inv.taxAmount)}</span></div>` : ""}
<div class="g"><span>Total</span><span>${money(inv.total)}</span></div>
<div><span>Paid</span><span>${money(inv.paidAmount)}</span></div><div class="b"><span>Balance due</span><span>${money(inv.balance)}</span></div></div></div>
<div class="sign"><div>Customer signature</div><div>Authorized signature</div></div>
${(inv.doc?.terms || []).length ? `<div style="margin-top:18px;page-break-inside:avoid"><div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8f0b0b;margin-bottom:6px">Terms &amp; conditions</div><ol style="margin:0;padding-left:18px;font-size:10.5px;line-height:1.55;color:#57534e">${inv.doc.terms.map((t) => `<li>${esc(t)}</li>`).join("")}</ol></div>` : ""}
<div class="foot">${esc(inv.doc?.footerNote || `Thank you for choosing ${co.name || "us"}.`)}</div>
</div></body></html>`;
  }, [data, inv]);

  const download = async () => { setBusy(true); try { await savePdf(html, inv.invoiceNo); } finally { setBusy(false); } };

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant={loadError?.status === 404 ? "info" : "danger"}>{loadError?.data?.message || "Could not load the invoice."}</Alert>;
    if (!data) return null;
    const { job, lines, payments } = data;
    const [stLabel, stTone] = STATUS[inv.status] || STATUS.UNPAID;
    // view only (Jobs / Department dashboards): the invoice is shown as the printed document itself
    if (!editable) {
      return (
        <>
          {data.viewedJobId !== data.rootJobId && <Alert variant="info" className="py-2 small">This is the invoice of the main job {job.jobNo}. The transferred jobs use the same invoice.</Alert>}
          <div className="d-flex align-items-center gap-2 mb-2"><Badge bg={stTone} className="fs-6">{stLabel}</Badge><span className="small text-muted">Discount, VAT and payments are handled by the Account department.</span></div>
          <iframe title="Invoice" srcDoc={html} style={{ width: "100%", height: "72vh", border: "1px solid #e3e3e6", borderRadius: 12, background: "#fff" }} />
        </>
      );
    }
    const methodNow = data.methods.includes(pay.method) ? pay.method : data.methods[0];
    const isCash = methodNow === "CASH";
    const amt = Number(pay.amount || 0), tend = Number(pay.tendered || 0), hasTend = pay.tendered !== "";
    const change = hasTend ? Math.round((tend - amt) * 100) / 100 : 0;
    const canPay = !cancelled && T.balance > 0;
    const livePays = payments.filter((p) => !p.voidedAt);
    const paidPct = T.total > 0 ? Math.min(100, Math.round((inv.paidAmount / T.total) * 100)) : 0;
    const issued = new Date(inv.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    return (
      <div className="iv-app">
        {data.viewedJobId !== data.rootJobId && <Alert variant="info" className="py-2 small mb-3">This is the invoice of the main job {job.jobNo}. The transferred jobs use the same invoice.</Alert>}
        <div className="iv-layout">
          {/* ============ the invoice (left) ============ */}
          <main className="iv-main">
            <section className="iv-paper">
              <header className="iv-paper-head">
                <div>
                  <div className="iv-eyebrow">{inv.taxEnabled ? "Tax invoice" : "Invoice"}</div>
                  <h2 className="iv-no">{inv.invoiceNo}</h2>
                </div>
                <div className="iv-paper-meta">
                  <div><span>Issued</span><b>{issued}</b></div>
                  <div><span>Job</span><b>{job.jobNo}</b></div>
                  <div><span>Status</span><b><span className={`iv-pill ${inv.status.toLowerCase()}`}>{stLabel}</span></b></div>
                </div>
              </header>
              <div className="iv-parties">
                <div><div className="iv-eyebrow">Bill to</div><div className="iv-party-name">{job.customerName}</div>{job.contactNumber && <div className="iv-muted">{job.contactNumber}</div>}</div>
                <div><div className="iv-eyebrow">Vehicle</div><div className="iv-party-name"><span className="iv-plate">{job.regNo}</span></div>{job.departmentName && <div className="iv-muted">{job.departmentName} department</div>}</div>
              </div>

              <div className="iv-rows" role="table" aria-label="Invoice items">
                <div className="iv-row iv-row-h" role="row"><span /><span>Item</span><span className="r">Qty</span><span className="r">Unit price</span><span className="r">Discount</span><span className="r">Amount</span><span /></div>
                {T.lines.length === 0 && <div className="iv-empty">No items on this invoice.</div>}
                {T.lines.map((l, n) => (
                  <div className="iv-row" role="row" key={l.id}>
                    <span className="iv-n">{n + 1}</span>
                    <span className="iv-desc" data-l="Item">{l.description}{l.source === "EXTRA" && <em className="iv-tag">Extra scope</em>}{l.source === "MANUAL" && <em className="iv-tag alt">Added</em>}{l.kind === "WARRANTY" && <em className="iv-tag alt">Warranty</em>}</span>
                    <span className="r" data-l="Qty">{l.qty}</span>
                    <span className="r" data-l="Unit price">{money(l.unitPrice)}</span>
                    <span className="r iv-dcell" data-l="Discount">
                      <DiscountBox compact mode={l.discMode} value={l.discValue} base={l.amount} disabled={cancelled} onLive={(m, v) => setLiveLine((x) => ({ ...x, [l.id]: { mode: m, value: v } }))} onSave={(m, v) => saveLineDisc(l, m, v)} />
                    </span>
                    <span className="r iv-amt" data-l="Amount">{money(l.net ?? l.amount)}{l.discAmount > 0 && <small>was {money(l.amount)}</small>}</span>
                    <span className="iv-x">{l.source === "MANUAL" && !cancelled && <button type="button" aria-label="Remove this item" title="Remove" onClick={() => delLine({ jobId, lineId: l.id })}><Icon icon="mdi:trash-can-outline" width="18" height="18" /></button>}</span>
                  </div>
                ))}
                {!cancelled && (
                  <form className="iv-add" onSubmit={(e) => { e.preventDefault(); submitLine(); }}>
                    <Icon icon="mdi:plus-circle-outline" width="20" height="20" className="iv-add-ic" />
                    <input className="iv-in grow" placeholder="Add an item or service" value={line.description} onChange={(e) => setLine({ ...line, description: e.target.value })} maxLength={300} />
                    <input className="iv-in" style={{ width: 76 }} type="number" min="1" placeholder="Qty" value={line.qty} onChange={(e) => setLine({ ...line, qty: e.target.value })} />
                    <input className="iv-in" style={{ width: 130 }} type="number" min="0" placeholder="Unit price" value={line.unitPrice} onChange={(e) => setLine({ ...line, unitPrice: e.target.value })} />
                    <button type="submit" className="iv-btn" disabled={addingLine || !line.description.trim()}>Add</button>
                  </form>
                )}
              </div>

              <div className="iv-bottom">
                <div className="iv-notes">
                  <label className="iv-eyebrow" htmlFor="iv-note">Note on the invoice</label>
                  <textarea id="iv-note" rows={3} className="iv-in" disabled={cancelled} defaultValue={inv.notes} placeholder="Shown on the printed invoice" maxLength={1000} onBlur={(e) => e.target.value !== inv.notes && save({ notes: e.target.value })} />
                </div>
                <dl className="iv-totals">
                  <div><dt>Subtotal</dt><dd>{money(T.sub)}</dd></div>
                  {T.lineDisc > 0 && <div className="good"><dt>Item discounts</dt><dd>- {money(T.lineDisc)}</dd></div>}
                  <div className="ctl"><dt>Discount</dt><dd><DiscountBox mode={inv.discountMode} value={inv.discountValue} base={T.net} disabled={cancelled} onLive={(m, v) => setLiveInv({ mode: m, value: v })} onSave={(m, v) => save({ discountMode: m, discountValue: v })} /></dd></div>
                  {T.invDisc > 0 && <div className="good sub"><dt>Discount amount</dt><dd>- {money(T.invDisc)}</dd></div>}
                  <div className="ctl">
                    <dt><label className="iv-switch"><input type="checkbox" disabled={cancelled} checked={inv.taxEnabled} onChange={(e) => save({ taxEnabled: e.target.checked })} /><i /> VAT</label></dt>
                    <dd>{inv.taxEnabled ? <span className="iv-vat"><input className="iv-in sm" type="number" min="0" max="100" disabled={cancelled} value={taxPct} onChange={(e) => setTaxPct(e.target.value)} onBlur={() => Number(taxPct || 0) !== inv.taxPercent && save({ taxPercent: Number(taxPct || 0) })} /><span>%</span><b>{money(T.tax)}</b></span> : <span className="iv-muted">Not charged</span>}</dd>
                  </div>
                  <div className="grand"><dt>Total</dt><dd>{money(T.total)}</dd></div>
                  <div><dt>Paid</dt><dd className="good-t">{money(inv.paidAmount)}</dd></div>
                  <div className="due"><dt>Amount due</dt><dd>{money(T.balance)}</dd></div>
                  {updating && <div className="iv-muted sm">Saving...</div>}
                </dl>
              </div>
            </section>
          </main>

          {/* ============ payment (right) ============ */}
          <aside className="iv-aside">
            <section className={`iv-due-card ${T.balance <= 0 && T.total > 0 ? "paid" : ""}`}>
              <div className="iv-eyebrow">{T.balance <= 0 && T.total > 0 ? "Paid in full" : "Amount due"}</div>
              <div className="iv-due-amt">{money(T.balance)}</div>
              <div className="iv-prog" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${paidPct}%` }} /></div>
              <div className="iv-due-sub"><span>{money(inv.paidAmount)} paid</span><span>of {money(T.total)}</span></div>
            </section>

            {cancellation && (
              <section className="iv-card2 iv-cancelled">
                <h3 className="iv-h3"><Icon icon="mdi:cancel" width="18" height="18" /> Job cancelled <span className="iv-lockbadge">{cancellation.inspectionFee > 0 ? "Inspection fee only" : "Nothing to pay"}</span></h3>
                {cancellation.reason && <div className="sm"><b>Reason:</b> {cancellation.reason}</div>}
                {cancellation.cancelledAt && <div className="iv-muted sm">{new Date(cancellation.cancelledAt).toLocaleString()}</div>}
                <div className="sm mt-2">This invoice is <b>cancelled</b>. It is kept as it was for the record.</div>
                {cancellation.feeInvoiceRef
                  ? <div className="sm mt-1 d-flex flex-wrap align-items-center gap-2">Inspection fee invoice: <b>{cancellation.feeInvoiceNo}</b>{onOpenInvoice && <button type="button" className="iv-tbtn solid" onClick={() => onOpenInvoice(cancellation.feeInvoiceRef)}>Open</button>}</div>
                  : <div className="sm mt-1 iv-muted">No inspection fee was charged.</div>}
              </section>
            )}
            {data?.job?.cancelFeeOf && (
              <section className="iv-card2 iv-cancelled">
                <h3 className="iv-h3"><Icon icon="mdi:cancel" width="18" height="18" /> Inspection fee <span className="iv-lockbadge">Job {data.job.cancelFeeOf} was cancelled</span></h3>
                <div className="iv-muted sm">This invoice holds only the inspection fee of the cancelled job.</div>
              </section>
            )}
            {canPay && jobOpen && (
              <section className="iv-card2 iv-lock">
                <h3 className="iv-h3">Record a payment <span className="iv-lockbadge"><Icon icon="mdi:lock-outline" width="14" height="14" /> {jobStatusText}</span></h3>
                <div className="iv-muted sm mb-2">This invoice is for your reference. Payments can be recorded once the job is completed.</div>
                <button type="button" className="iv-pay-btn" disabled><Icon icon="mdi:lock-outline" width="20" height="20" /> Record payment</button>
              </section>
            )}
            {canPay && !jobOpen && (
              <section className="iv-card2">
                <h3 className="iv-h3">Record a payment</h3>
                <div className="iv-methods" role="radiogroup" aria-label="Payment method">
                  {data.methods.map((m) => (
                    <button type="button" key={m} role="radio" aria-checked={m === methodNow} className={m === methodNow ? "on" : ""} onClick={() => setPay({ ...pay, method: m })}>
                      <Icon icon={METHOD_ICON[m] || "mdi:cash"} width="20" height="20" /><span>{METHOD_SHORT[m] || METHOD[m] || m}</span>
                    </button>
                  ))}
                </div>
                <label className="iv-lbl" htmlFor="iv-amount">Amount</label>
                <div className="iv-money"><span>Rs.</span><input id="iv-amount" type="number" min="0" step="any" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
                <div className="iv-chips"><button type="button" onClick={() => setPay({ ...pay, amount: String(T.balance) })}>Full balance</button><button type="button" onClick={() => setPay({ ...pay, amount: String(Math.round((T.balance / 2) * 100) / 100) })}>50%</button></div>
                {isCash && (
                  <div className="iv-cashbox">
                    <label className="iv-lbl" htmlFor="iv-tend">Cash received</label>
                    <div className="iv-inline">
                      <input id="iv-tend" className="iv-in" type="number" min="0" step="any" inputMode="decimal" placeholder="0.00" value={pay.tendered} onChange={(e) => setPay({ ...pay, tendered: e.target.value })} />
                      <button type="button" className="iv-btn ghost" onClick={() => setPay({ ...pay, tendered: String(amt || "") })}>Exact</button>
                    </div>
                    <div className={`iv-change ${hasTend && change < 0 ? "short" : ""}`}><span>{hasTend && change < 0 ? "Short by" : "Change to return"}</span><b>{hasTend ? money(Math.abs(change)) : "-"}</b></div>
                  </div>
                )}
                <div className="iv-two">
                  <div><label className="iv-lbl" htmlFor="iv-date">Date</label><input id="iv-date" className="iv-in" type="date" max={today()} value={pay.paidAt} onChange={(e) => setPay({ ...pay, paidAt: e.target.value })} /></div>
                  <div><label className="iv-lbl" htmlFor="iv-ref">Reference</label><input id="iv-ref" className="iv-in" placeholder={pay.method === "CHEQUE" ? "Cheque no" : pay.method === "CARD" ? "Slip no" : "Optional"} value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} maxLength={120} /></div>
                </div>
                <input className="iv-in mt" placeholder="Note (optional)" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} maxLength={500} />
                <button type="button" className="iv-pay-btn" disabled={paying || !(amt > 0)} onClick={submitPay}>{paying ? <Spinner size="sm" /> : <Icon icon="mdi:check" width="20" height="20" />} Record payment{amt > 0 ? ` · ${money(amt)}` : ""}</button>
              </section>
            )}

            <section className="iv-card2">
              <h3 className="iv-h3">Payments <span className="iv-count">{livePays.length}</span></h3>
              {payments.length === 0 && <div className="iv-muted">No payments recorded yet.</div>}
              <ul className="iv-tl">
                {payments.map((p) => (
                  <li key={p.id} className={p.voidedAt ? "void" : ""}>
                    <span className="iv-tl-ic"><Icon icon={METHOD_ICON[p.method] || "mdi:cash"} width="16" height="16" /></span>
                    <div className="iv-tl-b">
                      <div><b>{METHOD[p.method] || p.method}</b>{p.voidedAt && <em className="iv-tag alt">Voided</em>}</div>
                      <div className="iv-muted sm">{p.paidAt}{p.reference ? ` · ${p.reference}` : ""}{p.receivedByName ? ` · ${p.receivedByName}` : ""}</div>
                      {p.method === "CASH" && p.tendered > p.amount && <div className="iv-muted sm">Received {money(p.tendered)} · change {money(p.tendered - p.amount)}</div>}
                      {p.note && <div className="sm">{p.note}</div>}
                    </div>
                    <b className="iv-tl-amt">{money(p.amount)}</b>
                    {!p.voidedAt && !cancelled && <button type="button" className="iv-void" aria-label="Void this payment" title="Void" onClick={() => cancelPay(p)}><Icon icon="mdi:close" width="16" height="16" /></button>}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    );
  };

  return (
    <Modal show onHide={onHide} fullscreen={editable ? true : "md-down"} size="xl" centered={!editable} scrollable backdrop="static" enforceFocus={false} backdropClassName="iv-blur" dialogClassName={`iv-modal ${editable ? "iv-full" : ""}`}>
      <style>{CSS}</style>
      <header className="iv-bar">
        <div className="iv-bar-l">
          <span className="iv-bar-ic"><Icon icon="mdi:receipt-text-outline" width="22" height="22" /></span>
          <div>
            <div className="iv-bar-t">{inv?.taxEnabled ? "Tax invoice" : "Invoice"}{inv && <span> · {inv.invoiceNo}</span>}</div>
            {data && <div className="iv-bar-s">{data.job.customerName} · {data.job.regNo}{cancellation && <span className="iv-lockbadge ms-2"><Icon icon="mdi:cancel" width="14" height="14" /> Job cancelled</span>}{jobOpen && <span className="iv-lockbadge ms-2"><Icon icon="mdi:progress-clock" width="14" height="14" /> {jobStatusText}</span>}</div>}
          </div>
        </div>
        <div className="iv-bar-r">
          {data && <button type="button" className="iv-tbtn" disabled={busy} onClick={download}>{busy ? <Spinner size="sm" /> : <Icon icon="mdi:file-download-outline" width="18" height="18" />}<span>Download PDF</span></button>}
          {data && <button type="button" className="iv-tbtn" onClick={() => printHtml(html)}><Icon icon="mdi:printer-outline" width="18" height="18" /><span>Print</span></button>}
          <button type="button" className="iv-tbtn solid" onClick={onHide}><Icon icon="mdi:close" width="18" height="18" /><span>Close</span></button>
        </div>
      </header>
      <Modal.Body className="iv-body"><div className="iv-wrap">{body()}</div></Modal.Body>
    </Modal>
  );
}