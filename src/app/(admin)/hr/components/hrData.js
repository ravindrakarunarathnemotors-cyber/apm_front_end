// ---------------------------------------------------------------------------
// SAMPLE DATA for the HR dashboard.
// TODO: replace with your real API (RTK Query). Every tab reads its data from the `hr` object
// created in ../page.jsx, so you only change the data source there.
// ---------------------------------------------------------------------------

/* ----------------------------- date helpers ----------------------------- */
export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseISO = (s) => new Date(`${s}T00:00:00`);
export const fmtDate = (s, opts = { day: "2-digit", month: "short", year: "numeric" }) =>
  parseISO(s).toLocaleDateString("en-GB", opts);
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
export const mondayOf = (d) => {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
};

// small stable hash (same input -> same sample result)
export const hash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

/* ----------------------------- master data ----------------------------- */
export const DEPARTMENTS = [
  { id: 1, name: "Mechanical", head: "Nuwan Silva", icon: "mdi:engine-outline", color: "#2563eb" },
  { id: 2, name: "Wash", head: "Chaminda Perera", icon: "mdi:car-wash", color: "#0891b2" },
  { id: 3, name: "Detailing", head: "Dilshan Fernando", icon: "mdi:auto-fix", color: "#7c3aed" },
  { id: 4, name: "Accident Repair", head: "Kasun Jayasuriya", icon: "mdi:car-emergency", color: "#dc2626" },
  { id: 5, name: "Tyre Center", head: "Roshan Kumara", icon: "mdi:tire", color: "#d97706" },
  { id: 6, name: "Customer Service", head: "Sanduni Wickramasinghe", icon: "mdi:headset", color: "#059669" },
  { id: 7, name: "Accounts", head: "Dilani Rajapaksha", icon: "mdi:calculator-variant-outline", color: "#475569" },
  { id: 8, name: "HR", head: "Ishara Gunawardena", icon: "mdi:account-group-outline", color: "#db2777" },
];

export const DESIGNATIONS = [
  { id: 1, name: "Service Manager", level: "Management" },
  { id: 2, name: "Department Head", level: "Management" },
  { id: 3, name: "Service Consultant", level: "Executive" },
  { id: 4, name: "Senior Technician", level: "Senior" },
  { id: 5, name: "Technician", level: "Staff" },
  { id: 6, name: "Technician Assistant", level: "Junior" },
  { id: 7, name: "Wash Supervisor", level: "Senior" },
  { id: 8, name: "Detailer", level: "Staff" },
  { id: 9, name: "Accounts Executive", level: "Executive" },
  { id: 10, name: "HR Executive", level: "Executive" },
  { id: 11, name: "Customer Relations Officer", level: "Staff" },
];

/* ----------------------------- employees ----------------------------- */
const emp = (n, name, designation, department, mobile, joined, status = "Active") => ({
  id: `EMP-${String(n).padStart(3, "0")}`,
  name,
  designation,
  department,
  mobile,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@company.lk`,
  joined,
  status,
});

export const EMPLOYEES = [
  emp(1, "Nuwan Silva", "Department Head", "Mechanical", "0771234567", "2019-02-11"),
  emp(2, "Kasun Jayasuriya", "Department Head", "Accident Repair", "0712345678", "2018-07-23"),
  emp(3, "Chaminda Perera", "Wash Supervisor", "Wash", "0759876543", "2020-01-06"),
  emp(4, "Dilshan Fernando", "Department Head", "Detailing", "0701112233", "2021-05-17"),
  emp(5, "Roshan Kumara", "Department Head", "Tyre Center", "0723334455", "2019-09-02"),
  emp(6, "Sanduni Wickramasinghe", "Service Consultant", "Customer Service", "0774445566", "2022-03-14"),
  emp(7, "Dilani Rajapaksha", "Accounts Executive", "Accounts", "0715556677", "2020-11-30"),
  emp(8, "Ishara Gunawardena", "HR Executive", "HR", "0766667788", "2021-08-09"),
  emp(9, "Tharindu Bandara", "Senior Technician", "Mechanical", "0777778899", "2020-04-20"),
  emp(10, "Pasindu Madushanka", "Technician", "Mechanical", "0718889900", "2023-01-16"),
  emp(11, "Lakmal Ratnayake", "Technician Assistant", "Mechanical", "0769990011", "2024-06-03", "Probation"),
  emp(12, "Supun Dissanayake", "Technician", "Accident Repair", "0701234987", "2022-10-10"),
  emp(13, "Amila Senanayake", "Detailer", "Detailing", "0722345098", "2023-07-24"),
  emp(14, "Nadeesha Karunarathne", "Customer Relations Officer", "Customer Service", "0753456109", "2023-02-27"),
  emp(15, "Gayan Weerasinghe", "Technician", "Tyre Center", "0714567210", "2022-12-05"),
  emp(16, "Malsha Herath", "Detailer", "Wash", "0775678321", "2024-09-02", "Probation"),
  emp(17, "Buddhika Samarasinghe", "Service Consultant", "Customer Service", "0766789432", "2021-01-18"),
  emp(18, "Janaka Liyanage", "Technician", "Wash", "0707890543", "2019-05-13", "Resigned"),
];

/* ----------------------------- leaves ----------------------------- */
const t = today();
const L = (id, employeeId, type, fromOff, toOff, reason, status) => ({
  id,
  employeeId,
  type,
  from: iso(addDays(t, fromOff)),
  to: iso(addDays(t, toOff)),
  days: toOff - fromOff + 1,
  reason,
  status,
  applied: iso(addDays(t, Math.min(fromOff, 0) - 3)),
});

export const LEAVES = [
  L(1, "EMP-009", "Annual", -1, 1, "Family function", "Approved"),
  L(2, "EMP-014", "Medical", 0, 2, "Fever and rest", "Approved"),
  L(3, "EMP-010", "Casual", 3, 3, "Personal work", "Pending"),
  L(4, "EMP-006", "Annual", 7, 11, "Trip with family", "Pending"),
  L(5, "EMP-013", "Short Leave", 2, 2, "Bank work", "Pending"),
  L(6, "EMP-015", "Casual", -8, -8, "Personal work", "Approved"),
  L(7, "EMP-012", "No Pay", 4, 5, "Out of station", "Rejected"),
  L(8, "EMP-007", "Medical", -12, -10, "Dental treatment", "Approved"),
];

export const LEAVE_TYPES = ["Annual", "Casual", "Medical", "Short Leave", "No Pay"];

/* ----------------------------- holidays ----------------------------- */
// Sample list - replace with your company holiday calendar.
export const HOLIDAYS = [
  { id: 1, date: "2026-10-26", name: "Il Full Moon Poya Day", type: "Poya" },
  { id: 2, date: "2026-11-08", name: "Deepavali", type: "Public" },
  { id: 3, date: "2026-11-24", name: "Unduvap Full Moon Poya Day", type: "Poya" },
  { id: 4, date: "2026-12-23", name: "Duruthu Full Moon Poya Day", type: "Poya" },
  { id: 5, date: "2026-12-25", name: "Christmas Day", type: "Public" },
  { id: 6, date: "2026-12-31", name: "Company Year-End Holiday", type: "Company" },
  { id: 7, date: "2027-01-01", name: "New Year's Day", type: "Public" },
  { id: 8, date: "2027-01-14", name: "Tamil Thai Pongal Day", type: "Public" },
  { id: 9, date: "2026-09-26", name: "Binara Full Moon Poya Day", type: "Poya" },
  { id: 10, date: "2026-09-04", name: "Company Annual Trip Day", type: "Company" },
];

/* ----------------------------- shifts ----------------------------- */
export const SHIFTS = {
  Morning: { label: "Morning", time: "07:30 - 16:00", color: "#0891b2", icon: "mdi:weather-sunny" },
  Evening: { label: "Evening", time: "13:00 - 21:30", color: "#d97706", icon: "mdi:weather-sunset" },
  Off: { label: "Off", time: "Weekly off", color: "#94a3b8", icon: "mdi:sleep" },
  Leave: { label: "Leave", time: "Approved leave", color: "#7c3aed", icon: "mdi:beach" },
};

/* ----------------------------- appreciation ----------------------------- */
export const APPRECIATION_BADGES = {
  "Star Performer": { icon: "mdi:star-circle-outline", color: "#d97706" },
  "Team Player": { icon: "mdi:handshake-outline", color: "#2563eb" },
  "Customer Hero": { icon: "mdi:heart-circle-outline", color: "#dc2626" },
  "Quality Champion": { icon: "mdi:shield-star-outline", color: "#059669" },
};

export const APPRECIATIONS = [
  { id: 1, to: "EMP-009", from: "EMP-001", badge: "Star Performer", message: "Finished three engine overhauls ahead of schedule without a single rework.", date: iso(addDays(t, -2)) },
  { id: 2, to: "EMP-006", from: "EMP-017", badge: "Customer Hero", message: "Handled an upset customer calmly and turned the complaint into a positive review.", date: iso(addDays(t, -5)) },
  { id: 3, to: "EMP-003", from: "EMP-001", badge: "Team Player", message: "Covered two extra shifts during the busy weekend.", date: iso(addDays(t, -9)) },
  { id: 4, to: "EMP-013", from: "EMP-004", badge: "Quality Champion", message: "Paint correction work on the Prado received 5-star feedback.", date: iso(addDays(t, -14)) },
];

/* ----------------------------- attendance (sample) ----------------------------- */
export const leaveOn = (employeeId, dateISO, leaves) =>
  leaves.find((l) => l.employeeId === employeeId && l.status === "Approved" && l.from <= dateISO && dateISO <= l.to);

const pad = (n) => String(n).padStart(2, "0");

// Attendance of every working employee for one day
export function attendanceFor(dateISO, employees, leaves) {
  const date = parseISO(dateISO);
  const isToday = dateISO === iso(today());
  const future = dateISO > iso(today());
  const sunday = date.getDay() === 0;

  return employees
    .filter((e) => e.status !== "Resigned")
    .map((e) => {
      const base = { employee: e, checkIn: null, checkOut: null, hours: null };
      if (sunday) return { ...base, status: "Weekend" };
      const lv = leaveOn(e.id, dateISO, leaves);
      if (lv) return { ...base, status: "On Leave", note: lv.type };
      if (future) return { ...base, status: "Upcoming" };

      const h = hash(dateISO + e.id) % 100;
      if (h < 8) return { ...base, status: "Absent" };

      const late = h < 20;
      const inMin = late ? 8 * 60 + 35 + (h % 40) : 7 * 60 + 40 + (h % 25); // 08:35+ / 07:40+
      const outMin = 16 * 60 + 30 + (h % 45);
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const stillIn = isToday && nowMin < outMin;
      const fmt = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      return {
        ...base,
        status: late ? "Late" : "Present",
        checkIn: fmt(inMin),
        checkOut: stillIn ? null : fmt(outMin),
        hours: stillIn ? null : ((outMin - inMin) / 60).toFixed(1),
      };
    });
}

// Shift of one employee for one day (sample pattern: morning / evening alternate every week)
export function shiftFor(employee, dateISO, leaves) {
  const date = parseISO(dateISO);
  if (date.getDay() === 0) return "Off";
  if (leaveOn(employee.id, dateISO, leaves)) return "Leave";
  const week = Math.floor(date.getTime() / (7 * 86400000));
  const idx = parseInt(employee.id.replace("EMP-", ""), 10);
  return (idx + week) % 2 === 0 ? "Morning" : "Evening";
}