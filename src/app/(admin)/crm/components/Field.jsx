import { Col, InputGroup } from "react-bootstrap";

// Desktop (md+): label on the left, input on the right (InputGroup, as before)
// Phone / tablet (< md): label ABOVE the input, input is full width
export default function Field({ label, error, md = "6", labelWidth = 190, children }) {
  return (
    <Col md={md} className="mb-2">
      <style>{`
        @media (max-width: 767.98px) {
          .fld-group { flex-wrap: wrap; }
          .fld-group > .input-group-text {
            width: 100% !important;
            flex: 0 0 100%;
            border-radius: 0.375rem 0.375rem 0 0 !important;
            border-bottom: 0;
            padding: 0.35rem 0.75rem;
          }
          .fld-group > .form-control,
          .fld-group > .form-select {
            width: 100% !important;
            flex: 0 0 100% !important;
            margin-left: 0 !important;
            border-radius: 0 0 0.375rem 0.375rem !important;
          }
        }
      `}</style>

      <InputGroup hasValidation className="fld-group">
        <InputGroup.Text
          className="fw-semibold text-start"
          style={{
            width: labelWidth,
            whiteSpace: "normal",
            fontSize: "0.85rem",
            backgroundColor: "#f1f5f9",
          }}
        >
          {label}
        </InputGroup.Text>
        {children}
      </InputGroup>
      <p className="text-danger small mb-0" style={{ minHeight: 20 }}>{error}</p>
    </Col>
  );
}