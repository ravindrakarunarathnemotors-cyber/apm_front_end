"use client";

import { useEffect, useRef, useState } from "react";
import { InputGroup, FormControl, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useLazySearchCustomersQuery } from "@/store/features/apiSlice";

// Search by mobile / name / NIC / vehicle number and show matching customers in a dropdown.
// Calls onSelect(customer) when the user picks one.
export default function CustomerSearch({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(null);
  const boxRef = useRef(null);

  // Real search: GET /api/customers/search?q=...  (name / NIC / mobile / vehicle number)
  const [triggerSearch] = useLazySearchCustomersQuery();

  // Debounced search (300ms)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        // always fetch fresh data, so category / approval status changes are never stale
        const data = await triggerSearch(q).unwrap();
        if (!cancelled) {
          setResults(data);
          setOpen(true);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (c) => {
    onSelect(c);
    setLoaded(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="position-relative mb-2 rounded-4 px-3 py-2" style={{ background: "linear-gradient(135deg,#f4f4f5,#f4f4f5)", border: "1px solid #efeff0" }}>
      <div className="d-flex align-items-center gap-2 mb-1">
        <Icon icon="mdi:account-search-outline" width="20" height="20" style={{ color: "#111111" }} />
        <span className="fw-bold" style={{ color: "#0f172a", fontSize: ".85rem" }}>Existing customer?</span>
        <span className="text-muted d-none d-sm-inline" style={{ fontSize: ".7rem" }}>Search and the form fills itself</span>
      </div>

      <style>{`.cs-input::placeholder{color:#64748b!important;opacity:1!important}`}</style>
      <InputGroup className="shadow-sm" style={{ borderRadius: 12, overflow: "visible" }}>
        <InputGroup.Text className="bg-white border-end-0" style={{ borderRadius: "12px 0 0 12px", paddingLeft: 16 }}>
          <Icon icon="mdi:magnify" width="20" height="20" style={{ color: "#111111" }} />
        </InputGroup.Text>
        <FormControl
          className="border-start-0 cs-input" style={{ minHeight: 44, fontSize: ".9rem" }}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Type mobile number, customer name, NIC or vehicle number to search..."
          autoComplete="off"
        />
        {loading && (
          <InputGroup.Text className="bg-white">
            <Spinner animation="border" size="sm" />
          </InputGroup.Text>
        )}
        {!loading && query && (
          <InputGroup.Text
            className="bg-white"
            role="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <Icon icon="mdi:close" width="18" height="18" />
          </InputGroup.Text>
        )}
      </InputGroup>

      {open && (
        <div
          className="position-absolute w-100 bg-white"
          style={{ zIndex: 1050, maxHeight: 300, overflowY: "auto", marginTop: 4, left: 0, borderRadius: 12, border: "1.5px solid #111111", boxShadow: "0 18px 40px -12px rgba(15,23,42,.35)" }}
        >
          <style>{`.cs-row{cursor:pointer;transition:background .12s;border-bottom:1px solid #f1f1f3}.cs-row:last-child{border-bottom:0}.cs-row .gap-1{margin-top:2px}.cs-row:hover{background:#f4f4f5}`}</style>
          {results.length === 0 ? (
            <div className="text-muted p-2 text-center" style={{ fontSize: ".8rem" }}>
              <Icon icon="mdi:account-search-outline" width="22" height="22" /> No customers found
            </div>
          ) : (
            results.map((c) => (
              <div key={c.customerId} className="cs-row d-flex align-items-start gap-2 px-2 py-1" onClick={() => pick(c)}>
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold text-white flex-shrink-0"
                  style={{ width: 32, height: 32, background: "linear-gradient(135deg,#3d3d3d,#000000)", fontSize: ".85rem" }}
                >
                  {(c.customerName || "?").trim().charAt(0).toUpperCase()}
                </span>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <strong style={{ fontSize: ".85rem", color: "#0f172a" }}>{c.customerName}</strong>
                    <span className="rounded-pill px-2 fw-semibold" style={{ fontSize: ".64rem", background: "#111", color: "#fff" }}>{c.customerId}</span>
                    {c.categoryName && (
                      <span className="rounded-pill px-2 fw-semibold" style={{ fontSize: ".64rem", background: "#efeff0", color: "#111111" }}>{c.categoryName}</span>
                    )}
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-0" style={{ fontSize: ".72rem", color: "#475569" }}>
                    {c.contactNumber && (
                      <span><Icon icon="mdi:phone-outline" width="13" height="13" style={{ color: "#111111" }} /> {c.contactNumber}</span>
                    )}
                    {c.nic && (
                      <span><Icon icon="mdi:card-account-details-outline" width="13" height="13" style={{ color: "#111111" }} /> {c.nic}</span>
                    )}
                    {c.ownReferralCode && (
                      <span><Icon icon="mdi:gift-outline" width="13" height="13" style={{ color: "#111111" }} /> {c.ownReferralCode}</span>
                    )}
                    {c.loyaltyPoints > 0 && (
                      <span><Icon icon="mdi:star-circle-outline" width="13" height="13" style={{ color: "#111111" }} /> {c.loyaltyPoints} pts</span>
                    )}
                  </div>
                  {c.vehicles?.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      {c.vehicles.map((v) => (
                        <span key={v.regNo} className="fw-bold rounded px-1" style={{ fontSize: ".68rem", background: "#facc15", color: "#111", border: "1px solid #111", letterSpacing: ".04em" }}>
                          {v.regNo}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Icon icon="mdi:chevron-right" width="18" height="18" className="flex-shrink-0 align-self-center" style={{ color: "#94a3b8" }} />
              </div>
            ))
          )}
        </div>
      )}

      {loaded && (
        <div className="text-success mt-1" style={{ fontSize: ".75rem" }}>
          <Icon icon="mdi:check-circle-outline" width="16" height="16" /> Loaded{" "}
          <strong>{loaded.customerName}</strong> ({loaded.customerId}). Details have been auto-filled and can still be edited.
          {loaded.vehicles?.length > 0 &&
            ` ${loaded.vehicles.length} saved vehicle(s) can be selected in the next step.`}
        </div>
      )}
    </div>
  );
}