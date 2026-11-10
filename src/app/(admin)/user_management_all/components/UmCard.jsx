"use client";

import React from "react";

// The card + form look of the User Management screens (same theme as the Settings page).
// Wrap a screen in <UmCard title="..."> ; the Edit User modal uses className="um-modal".
export default function UmCard({ title, children }) {
  return (
    <div className="um-card">
      <style>{`
        .um-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 20px; margin-bottom: 16px; }
        .um-card .um-title, .um-card > .d-flex > h4, .um-card > h4 { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin: 0 0 14px; }
        .um-card > .d-flex > h4 { margin-bottom: 0; }
        .um-card .col-form-label, .um-card .form-label, .um-modal .form-label { font-weight: 600; font-size: .9rem; color: #111; }
        .um-card .form-control, .um-card .form-select, .um-modal .form-control, .um-modal .form-select { border-radius: 10px; min-height: 44px; border-color: #d4d4d8; }
        .um-card textarea.form-control, .um-modal textarea.form-control { min-height: 0; }
        .um-card .form-control:focus, .um-card .form-select:focus, .um-modal .form-control:focus, .um-modal .form-select:focus { border-color: #c8102e; box-shadow: 0 0 0 .2rem rgba(200,16,46,.15); }
        .um-card .form-check-input:checked, .um-modal .form-check-input:checked { background-color: #c8102e; border-color: #c8102e; }
        .um-card input[type="checkbox"] { accent-color: #c8102e; width: 16px; height: 16px; }
        .um-card .text-primary { color: #c8102e !important; }
        .um-card .btn, .um-modal .btn { border-radius: 12px; min-height: 40px; font-weight: 600; }
        .um-card .btn-primary, .um-modal .btn-primary { background: #111; border-color: #111; }
        .um-card .btn-primary:hover, .um-modal .btn-primary:hover, .um-card .btn-primary:focus, .um-modal .btn-primary:focus { background: #c8102e; border-color: #c8102e; }
        .um-card .btn-secondary, .um-modal .btn-secondary { background: #fff; color: #111; border: 1.5px solid #c4c4ca; }
        .um-card .btn-secondary:hover, .um-modal .btn-secondary:hover { background: #f6f6f7; color: #111; border-color: #111; }
        .um-card .btn-success { background: #157347; border-color: #157347; }
        .um-card .table { border-color: #e3e3e6; }
        .um-card .table thead th { background: #f6f6f7; color: #444; font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; border-bottom: 1px solid #e3e3e6; white-space: nowrap; }
        .um-card .table td, .um-card .table th { vertical-align: middle; }
        .um-card .badge { border-radius: 99px; padding: .45em .8em; font-weight: 700; }
        .um-card .pagination .page-item.active .page-link { background: #111; border-color: #111; color: #fff; }
        .um-card .pagination .page-link { color: #111; }
        .um-card .border.rounded { border-color: #e3e3e6 !important; border-radius: 12px !important; }
        .um-modal .modal-content { border-radius: 14px; border: 1px solid #e3e3e6; }
        .um-modal .modal-title { font-size: 1rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #c8102e; }
        .um-modal .nav-tabs .nav-link { color: #444; font-weight: 600; }
        .um-modal .nav-tabs .nav-link.active { color: #111; border-bottom: 3px solid #c8102e; }
        .um-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
        .au-sec { padding: 4px 0 18px; margin-bottom: 18px; border-bottom: 1px solid #f0f0f2; }
        .au-sec:last-of-type { border-bottom: 0; margin-bottom: 0; }
        .au-sec-h { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .au-no { width: 30px; height: 30px; border-radius: 50%; background: #111; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: .85rem; box-shadow: inset 0 -3px 0 #c8102e; flex: 0 0 30px; }
        .au-sec-t { font-weight: 800; color: #111; line-height: 1.2; }
        .au-sec-s { font-size: .8rem; color: #71717a; }
        .au-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; }
        .au-wide { grid-column: 1 / -1; }
        @media (max-width: 767px) { .au-grid { grid-template-columns: 1fr; } }
        .au-label { display: block; font-weight: 600; font-size: .85rem; color: #111; margin-bottom: 6px; }
        .au-wrap { position: relative; display: flex; align-items: center; background: #fff; border: 1.5px solid #d4d4d8; border-radius: 12px; transition: border-color .15s, box-shadow .15s; }
        .au-wrap:focus-within { border-color: #c8102e; box-shadow: 0 0 0 .2rem rgba(200,16,46,.12); }
        .au-wrap.au-bad { border-color: #dc2626; }
        .au-ico { position: absolute; left: 13px; color: #a1a1aa; pointer-events: none; }
        .au-wrap:focus-within .au-ico { color: #c8102e; }
        .au-ctl { width: 100%; min-height: 46px; border: 0; background: transparent; padding: 0 14px 0 42px; border-radius: 12px; outline: 0; font-size: .95rem; color: #111; }
        select.au-ctl { appearance: auto; padding-right: 8px; }
        select.au-ctl:disabled, .au-ctl:disabled { color: #71717a; background: #f6f6f7; }
        .au-right { display: flex; align-items: center; padding-right: 10px; gap: 6px; flex: 0 0 auto; }
        .au-eye { border: 0; background: transparent; color: #71717a; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; }
        .au-eye:hover { background: #f4f4f5; color: #111; }
        .au-err { color: #dc2626; font-size: .8rem; margin-top: 5px; }
        .au-hint { color: #71717a; font-size: .8rem; margin-top: 5px; }
        .au-state { font-size: .8rem; font-weight: 600; white-space: nowrap; }
        .au-state.ok { color: #157347; } .au-state.taken { color: #dc2626; } .au-state.checking { color: #71717a; }
        .au-meter { display: flex; gap: 4px; margin-top: 8px; align-items: center; }
        .au-meter i { flex: 1; height: 5px; border-radius: 4px; background: #e4e4e7; }
        .au-meter i.on1 { background: #dc2626; } .au-meter i.on2 { background: #f59e0b; } .au-meter i.on3 { background: #84cc16; } .au-meter i.on4 { background: #157347; }
        .au-meter span { font-size: .75rem; font-weight: 700; color: #52525b; min-width: 48px; text-align: right; }
        .au-foot { display: flex; justify-content: flex-end; gap: 10px; padding-top: 16px; margin-top: 6px; border-top: 1px solid #f0f0f2; }
        .ul-list { display: flex; flex-direction: column; gap: 10px; }
        .ul-row { display: grid; grid-template-columns: 46px minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr) auto auto; align-items: center; gap: 14px; padding: 12px 14px; border: 1px solid #e3e3e6; border-radius: 14px; background: #fff; }
        .ul-row:hover { border-color: #c4c4ca; box-shadow: 0 2px 10px rgba(0,0,0,.05); }
        .ul-av { width: 46px; height: 46px; border-radius: 50%; background: #111; color: #fff; display: grid; place-items: center; font-weight: 800; letter-spacing: .02em; box-shadow: inset 0 -3px 0 #c8102e; }
        .ul-main { min-width: 0; } .ul-name { font-weight: 700; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ul-sub { font-size: .8rem; color: #71717a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ul-lab { font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; color: #a1a1aa; font-weight: 700; }
        .ul-val { font-size: .88rem; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ul-act { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
        .ul-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; border: 1.5px solid #c4c4ca; background: #fff; color: #111; padding: 6px 12px; font-size: .8rem; font-weight: 600; min-height: 36px; }
        .ul-btn:hover { background: #f6f6f7; border-color: #111; }
        .ul-btn.dark { background: #111; color: #fff; border-color: #111; } .ul-btn.dark:hover { background: #c8102e; border-color: #c8102e; }
        .ul-btn.red { color: #dc2626; border-color: #fca5a5; } .ul-btn.red:hover { background: #fef2f2; border-color: #dc2626; }
        .ul-btn.green { color: #157347; border-color: #86efac; } .ul-btn.green:hover { background: #f0fdf4; border-color: #157347; }
        .ul-btn:disabled { opacity: .45; pointer-events: none; }
        .ul-pill { display: inline-block; padding: 3px 11px; border-radius: 99px; font-size: .75rem; font-weight: 700; }
        .ul-pill.on { background: #dcfce7; color: #157347; } .ul-pill.off { background: #fee2e2; color: #b91c1c; }
        .ul-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
        .ul-search { display: flex; gap: 8px; flex: 1 1 280px; max-width: 460px; }
        @media (max-width: 991px) {
          .ul-row { grid-template-columns: 46px minmax(0,1fr) auto; row-gap: 8px; }
          .ul-row > .ul-col { display: none; } .ul-row > .ul-act { grid-column: 1 / -1; justify-content: flex-start; }
        }
        .rl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
        .rl-card { border: 1px solid #e3e3e6; border-radius: 14px; padding: 14px; background: #fff; display: flex; flex-direction: column; gap: 10px; }
        .rl-card:hover { border-color: #c4c4ca; box-shadow: 0 2px 10px rgba(0,0,0,.05); }
        .rl-top { display: flex; align-items: center; gap: 10px; }
        .rl-ico { width: 40px; height: 40px; border-radius: 12px; background: #111; color: #fff; display: grid; place-items: center; box-shadow: inset 0 -3px 0 #c8102e; flex: 0 0 40px; }
        .rl-name { font-weight: 800; color: #111; line-height: 1.2; } .rl-meta { font-size: .8rem; color: #71717a; }
        .pv-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
        .pv-chip { padding: 5px 12px; border-radius: 99px; background: #111; color: #fff; font-size: .8rem; font-weight: 700; box-shadow: inset 0 -2px 0 #c8102e; }
        .pv-group { border: 1px solid #e3e3e6; border-radius: 14px; margin-bottom: 10px; overflow: hidden; background: #fff; }
        .pv-head { display: flex; align-items: center; gap: 12px; padding: 12px 14px; cursor: pointer; background: #fafafa; user-select: none; }
        .pv-head:hover { background: #f4f4f5; }
        .pv-title { font-weight: 800; color: #111; flex: 1; min-width: 0; }
        .pv-count { font-size: .75rem; font-weight: 700; padding: 3px 10px; border-radius: 99px; background: #e5e7eb; color: #444; }
        .pv-count.on { background: #111; color: #fff; }
        .pv-body { padding: 12px 14px 14px; border-top: 1px solid #f0f0f2; }
        .pv-sub { margin-bottom: 10px; } .pv-sub:last-child { margin-bottom: 0; }
        .pv-check { display: flex; align-items: center; gap: 9px; font-weight: 600; color: #111; cursor: pointer; margin: 0; }
        .pv-kids { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 0 26px; }
        .pv-kid { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px; border: 1px solid #e3e3e6; border-radius: 99px; font-size: .85rem; cursor: pointer; background: #fff; margin: 0; }
        .pv-kid.on { background: #111; color: #fff; border-color: #111; } .pv-kid input { accent-color: #c8102e; }
        .pv-other { display: flex; flex-wrap: wrap; gap: 8px; }
      `}</style>
      {title ? <div className="um-title">{title}</div> : null}
      {children}
    </div>
  );
}