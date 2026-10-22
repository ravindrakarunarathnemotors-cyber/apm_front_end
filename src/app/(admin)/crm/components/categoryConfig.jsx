export const BENEFITS = {
  bodyWax: "Body wax free for full service (auto value deduction from the bill)",
  freeInspection: "Vehicle free inspection (auto value deduction from the bill)",
};

export const CATEGORIES = [
  {
    key: "BLUE",
    label: "Blue",
    color: "#2563eb",
    notifyAfterYears: 1,
    bands: [{ id: "blue-1", label: "Up to Rs. 500,000", min: 0, max: 500000, discount: 0 }],
    benefits: ["bodyWax", "freeInspection"],
    extraNotes: [],
  },
  {
    key: "SILVER",
    label: "Silver",
    color: "#64748b",
    notifyAfterYears: 5,
    bands: [{ id: "silver-1", label: "Rs. 500,000 – 2,500,000", min: 500000, max: 2500000, discount: 2 }],
    benefits: ["bodyWax", "freeInspection"],
    extraNotes: ["More options to be added"],
  },
  {
    key: "GOLD",
    label: "Gold",
    color: "#d97706",
    notifyAfterYears: 12,
    bands: [
      { id: "gold-1", label: "Rs. 2,500,000 – 6,000,000", min: 2500000, max: 6000000, discount: 3 },
      { id: "gold-2", label: "Rs. 6,000,000 – 7,500,000", min: 6000000, max: 7500000, discount: 5 },
    ],
    benefits: ["bodyWax", "freeInspection"],
    extraNotes: ["More benefits to be considered"],
  },
  {
    key: "PLATINUM",
    label: "Platinum",
    color: "#7c3aed",
    notifyAfterYears: null,
    bands: [{ id: "platinum-1", label: "Above Rs. 7,500,000", min: 7500000, max: Infinity, discount: 7.5 }],
    benefits: ["bodyWax", "freeInspection"],
    extraNotes: ["More options to be added"],
  },
];

// මුළු වියදමට අනුව suggest වෙන category එක
export const suggestCategory = (totalSpend) => {
  const spend = Number(totalSpend) || 0;
  for (const cat of CATEGORIES) {
    if (cat.bands.some((b) => spend >= b.min && spend < b.max)) return cat.key;
  }
  return "BLUE";
};

export const formatRs = (n) =>
  n === Infinity ? "∞" : `Rs. ${Number(n).toLocaleString("en-LK")}`;