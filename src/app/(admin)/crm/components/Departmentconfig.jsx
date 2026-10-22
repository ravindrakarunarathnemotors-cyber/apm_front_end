export const DEPARTMENTS = [
  { key: "MECHANICAL", label: "Mechanical", icon: "mdi:engine-outline", color: "#2563eb" },
  { key: "WASH", label: "Wash", icon: "mdi:car-wash", color: "#0891b2" },
  { key: "DETAILING", label: "Detailing", icon: "mdi:auto-fix", color: "#7c3aed" },
  { key: "ACCIDENT_REPAIR", label: "Accident Repair", icon: "mdi:car-emergency", color: "#dc2626" },
  { key: "TYRE_CENTER", label: "Tyre Center", icon: "mdi:tire", color: "#d97706" },
];

// The windows after the Department step change according to the selected department.
// Add each department's stages here. They are appended to the stepper automatically.
// A stage looks like:
//   { label: "Stage 4 · Mechanical Checklist", parts: [{ fields: ["..."] }], Component: MechanicalChecklist }
export const DEPARTMENT_STAGES = {
  MECHANICAL: [],
  WASH: [],
  DETAILING: [],
  ACCIDENT_REPAIR: [],
  TYRE_CENTER: [],
};

// Departments now come from the database (id, name). The key, icon and colour are looked up by name:
//   "Accident Repair" -> key "ACCIDENT_REPAIR" -> icon / colour from DEPARTMENTS above.
// A department added in the DB that is not listed above gets a default icon and colour.
export const toDepartmentKey = (name) =>
  String(name).trim().toUpperCase().replace(/[\s-]+/g, "_");

export const getDepartmentUi = (name) => {
  const key = toDepartmentKey(name);
  const known = DEPARTMENTS.find((d) => d.key === key);
  return {
    key,
    icon: known?.icon || "mdi:domain",
    color: known?.color || "#2563eb",
  };
};