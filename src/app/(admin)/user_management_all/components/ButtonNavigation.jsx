"use client";

import React from "react";
import { UserPlus, ShieldPlus, Users, UserCheck } from "lucide-react";

// Tabs of the User Management screens. Same look as the Settings page: white cards, light grey border, black active tab with a maroon edge.
const buttons = [
  { title: "Add User", key: "add_user", icon: UserPlus },
  { title: "Add Role", key: "add_role", icon: ShieldPlus },
  { title: "User List", key: "user_list", icon: Users },
  { title: "Role List", key: "role_list", icon: UserCheck },
];
const ADMIN_ONLY = ["add_role", "role_list"];

export default function ButtonNavigation({ active, onChange, isAdmin = false }) {
  const list = buttons.filter((b) => isAdmin || !ADMIN_ONLY.includes(b.key));

  return (
    <div className="um-tabs" role="tablist" aria-label="User management">
      <style>{`
        .um-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; padding: 12px 0; width: 100%; }
        .um-tab { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 8px 14px; background: #fff; color: #111;
          border: 1px solid #e3e3e6; border-radius: 12px; font-weight: 600; font-size: .95rem; cursor: pointer; min-width: 0;
          transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease; }
        .um-tab span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .um-tab .um-ico { color: #c8102e; flex: 0 0 auto; }
        .um-tab:hover { background: #f6f6f7; border-color: #c4c4ca; }
        .um-tab:focus-visible { outline: 2px solid #c8102e; outline-offset: 2px; }
        .um-tab.on { background: #111; color: #fff; border-color: #111; box-shadow: inset 4px 0 0 #c8102e; }
        .um-tab.on .um-ico { color: #fff; }
        @media (max-width: 575px) { .um-tabs { grid-template-columns: repeat(2, 1fr); gap: 8px; } .um-tab { min-height: 44px; font-size: .88rem; padding: 6px 10px; gap: 8px; } }
      `}</style>
      {list.map((btn) => {
        const Icon = btn.icon;
        const on = active === btn.key;
        return (
          <button key={btn.key} type="button" role="tab" aria-selected={on} aria-current={on ? "page" : undefined} className={`um-tab ${on ? "on" : ""}`} onClick={() => onChange(btn.key)}>
            <Icon size={19} className="um-ico" />
            <span>{btn.title}</span>
          </button>
        );
      })}
    </div>
  );
}