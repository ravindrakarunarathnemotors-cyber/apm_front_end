"use client";

import React, { useState } from "react";
import { UserPlus, ShieldPlus, Users, UserCheck } from "lucide-react";

const buttons = [
  { title: "Add User", key: "add_user", icon: UserPlus },
  { title: "Add Role", key: "add_role", icon: ShieldPlus },
  { title: "User List", key: "user_list", icon: Users },
  { title: "User Role", key: "role_list", icon: UserCheck },
];

export default function ButtonNavigation({ active, onChange }) {
  const [hovered, setHovered] = useState(null);
  const [pressed, setPressed] = useState(null);

  return (
    <div style={styles.container}>
      {buttons.map((btn) => {
        const Icon = btn.icon;
        const isActive = active === btn.key;
        const isHovered = hovered === btn.key;
        const isPressed = pressed === btn.key;
        const highlight = isActive || isHovered;

        return (
          <button
            key={btn.key}
            type="button"
            onClick={() => onChange(btn.key)}
            onMouseEnter={() => setHovered(btn.key)}
            onMouseLeave={() => {
              setHovered(null);
              setPressed(null);
            }}
            onMouseDown={() => setPressed(btn.key)}
            onMouseUp={() => setPressed(null)}
            onFocus={() => setHovered(btn.key)}
            onBlur={() => setHovered(null)}
            style={{
              ...styles.cardButton,
              ...(isActive ? styles.cardButtonActive : {}),
              ...(isHovered ? styles.cardButtonHover : {}),
              ...(isPressed ? styles.cardButtonPressed : {}),
            }}
          >
            <div
              style={{
                ...styles.iconWrapper,
                ...(highlight ? styles.iconWrapperHover : {}),
              }}
            >
              <Icon size={20} color={highlight ? "#ffffff" : "#6366f1"} />
            </div>
            <span
              style={{
                ...styles.buttonText,
                ...(highlight ? styles.buttonTextHover : {}),
              }}
            >
              {btn.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    display: "grid",
    // Mobile වලදී Row 2ක් (Columns 2ක්) ලෙසද, Medium/Large screens වලදී Columns 4ක් ලෙසද ස්වයංක්‍රීයව වෙනස් වේ
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
    padding: "16px",
    backgroundColor: "#f8fafc",
    width: "100%",
    boxSizing: "border-box",
  },
  cardButton: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    color: "#1e293b",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "12px 16px",
    cursor: "pointer",
    outline: "none",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
    transform: "translateY(0)",
    transition:
      "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, border-color 0.25s ease, background-color 0.25s ease",
    width: "100%",
    minWidth: 0, // Text overflow වෙන එක වළක්වයි
  },
  cardButtonActive: {
    borderColor: "#6366f1",
    backgroundColor: "#eef2ff",
    boxShadow: "0 8px 16px -6px rgba(99, 102, 241, 0.3)",
  },
  cardButtonHover: {
    transform: "translateY(-4px)",
    borderColor: "#6366f1",
    boxShadow:
      "0 12px 24px -6px rgba(99, 102, 241, 0.25), 0 4px 8px -2px rgba(0, 0, 0, 0.06)",
  },
  cardButtonPressed: {
    transform: "translateY(-1px) scale(0.98)",
    boxShadow: "0 4px 8px -2px rgba(99, 102, 241, 0.2)",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef2ff",
    padding: "8px",
    borderRadius: "10px",
    marginRight: "10px",
    flexShrink: 0,
    transition: "background-color 0.25s ease, transform 0.25s ease",
  },
  iconWrapperHover: {
    backgroundColor: "#6366f1",
    transform: "scale(1.08) rotate(-4deg)",
  },
  buttonText: {
    fontSize: "14px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    transition: "color 0.25s ease",
  },
  buttonTextHover: {
    color: "#4f46e5",
  },
};