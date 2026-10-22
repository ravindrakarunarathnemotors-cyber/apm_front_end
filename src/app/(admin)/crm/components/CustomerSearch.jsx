"use client";

import { useEffect, useRef, useState } from "react";
import { InputGroup, FormControl, ListGroup, Spinner } from "react-bootstrap";
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
    <div ref={boxRef} className="position-relative mb-3">
      <label className="fw-semibold small mb-1 d-block">Search Existing Customer</label>

      <InputGroup>
        <InputGroup.Text className="bg-white">
          <Icon icon="mdi:magnify" width="20" height="20" />
        </InputGroup.Text>
        <FormControl
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Mobile / Name / NIC / Vehicle number"
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
        <ListGroup
          className="position-absolute w-100 shadow"
          style={{ zIndex: 1050, maxHeight: 280, overflowY: "auto" }}
        >
          {results.length === 0 ? (
            <ListGroup.Item className="text-muted small">No customers found</ListGroup.Item>
          ) : (
            results.map((c) => (
              <ListGroup.Item key={c.customerId} action onClick={() => pick(c)} className="py-2">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <strong>{c.customerName}</strong>
                  <small className="text-muted">{c.customerId}</small>
                </div>
                <div className="small text-muted">
                  <Icon icon="mdi:phone-outline" width="14" height="14" /> {c.contactNumber}
                  {c.nic && (
                    <>
                      {" · "}
                      <Icon icon="mdi:card-account-details-outline" width="14" height="14" /> {c.nic}
                    </>
                  )}
                </div>
                {c.vehicles?.length > 0 && (
                  <div className="small text-muted">
                    <Icon icon="mdi:car-outline" width="14" height="14" />{" "}
                    {c.vehicles.map((v) => v.regNo).join(", ")}
                  </div>
                )}
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
      )}

      {loaded && (
        <div className="text-success small mt-1">
          <Icon icon="mdi:check-circle-outline" width="16" height="16" /> Loaded{" "}
          <strong>{loaded.customerName}</strong> ({loaded.customerId}). Details have been auto-filled and can still be edited.
          {loaded.vehicles?.length > 0 &&
            ` ${loaded.vehicles.length} saved vehicle(s) can be selected in the next step.`}
        </div>
      )}
    </div>
  );
}