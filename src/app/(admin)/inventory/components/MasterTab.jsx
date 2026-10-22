"use client";

import { useState } from "react";
import { Col, Form, FormControl, InputGroup, Row, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useInvGetQuery } from "@/store/features/apiSlice";
import ItemsTab from "./ItemsTab";
import { Empty, Loader, Panel, StatusBadge, SubTabs, money, qtyFmt, useDebounced } from "./inventoryUi";

// Which parts fit this vehicle? (make / model / year)
function FitFinder() {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const dm = useDebounced(make), dd = useDebounced(model), dy = useDebounced(year);
  const { data = [], isFetching } = useInvGetQuery(`fit-finder?make=${encodeURIComponent(dm)}&model=${encodeURIComponent(dd)}&year=${encodeURIComponent(dy)}`);
  const searched = dm || dd || dy;

  return (
    <Panel title="Vehicle fit finder" icon="mdi:car-search-outline">
      <Row className="g-2 mb-3">
        <Col xs={12} md={4}><InputGroup><InputGroup.Text className="bg-white"><Icon icon="mdi:car-outline" width="20" height="20" /></InputGroup.Text><FormControl placeholder="Make (e.g. Toyota)" value={make} onChange={(e) => setMake(e.target.value)} /></InputGroup></Col>
        <Col xs={7} md={4}><FormControl placeholder="Model (e.g. Axio)" value={model} onChange={(e) => setModel(e.target.value)} /></Col>
        <Col xs={5} md={2}><FormControl type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} /></Col>
      </Row>
      {isFetching && !data.length ? <Loader /> : data.length === 0 ? (
        <Empty text={searched ? "No parts are linked to this vehicle yet. Add compatible vehicles in the item (Item Master > Items > Edit)." : "Type a make / model / year to see the parts that fit"} icon="mdi:car-search-outline" />
      ) : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>Part</th><th>Fits</th><th>Category</th><th>Bin</th><th className="text-end">Available</th><th className="text-end">Price</th></tr></thead>
          <tbody>
            {data.map((x, i) => (
              <tr key={`${x.id}-${i}`}>
                <td><div className="fw-semibold">{x.name}</div><small className="text-muted">{[x.partNo, x.oemNo && `OEM ${x.oemNo}`, x.brand, x.quality].filter(Boolean).join(" · ")}</small></td>
                <td className="small">{x.make} {x.model}<div className="text-muted">{x.yearFrom || "any"} – {x.yearTo || "any"}</div></td>
                <td className="small">{x.categoryName}</td>
                <td className="small">{x.binLocation || "-"}</td>
                <td className="text-end"><StatusBadge status={x.available > 0 ? "In stock" : "Out of stock"} /> <span className="ms-1 fw-semibold">{qtyFmt(x.available)}</span></td>
                <td className="text-end">{money(x.price)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

// Item Master (parts catalog): items with part no / OEM / SKU / barcode / category / brand / unit / reorder / bin / prices,
// compatible vehicles + alternate part numbers (inside the item), and the vehicle fit finder.
export default function MasterTab() {
  const [sub, setSub] = useState("items");
  return (
    <>
      <SubTabs
        active={sub}
        onChange={setSub}
        tabs={[
          { key: "items", label: "Items & stock", icon: "mdi:package-variant-closed" },
          { key: "fit", label: "Vehicle fit finder", icon: "mdi:car-search-outline" },
        ]}
      />
      {sub === "items" ? <ItemsTab /> : <FitFinder />}
    </>
  );
}