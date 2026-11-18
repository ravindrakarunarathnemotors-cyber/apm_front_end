"use client";

import ItemsTab from "./ItemsTab";

// Item Master (parts catalog): items with part no / OEM / SKU / barcode / category / brand / unit / reorder / bin / prices,
// compatible vehicles + alternate part numbers (inside the item, Items > Edit).
// The "Vehicle fit finder" sub-tab was removed from here. The backend route (fit-finder) and the compatible-vehicle data are untouched.
export default function MasterTab() {
  return <ItemsTab />;
}