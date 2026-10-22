'use client'

import React, { useState } from 'react'
import { Modal, Button, Collapse } from 'react-bootstrap'
import { BiChevronDown, BiReceipt, BiNote, BiShieldQuarter, BiX } from 'react-icons/bi'

export default function PaymentDetailsModal({ show, handleClose, invoice }) {
  const [openNotes, setOpenNotes] = useState(true)

  if (!invoice) return null

  const { receipt_url, payment_admin_approvel, payment_client_note, status } = invoice

  const statusStyles = {
    pending: { color: '#D97706', bg: '#FFFBEB', label: 'Under Review' },
    approved: { color: '#059669', bg: '#ECFDF5', label: 'Verified' },
    rejected: { color: '#DC2626', bg: '#FEF2F2', label: 'Rejected' },
  }

  const currentStatus = statusStyles[status] || { color: '#4B5563', bg: '#F3F4F6', label: status }

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      size="md"
      contentClassName="border-0 shadow-lg overflow-hidden"
    >
      {/* Reduced Header Padding */}
      <div className="d-flex justify-content-between align-items-center px-4 py-3 bg-dark border-bottom border-dark">
        <div>
          <p className="text-uppercase text-light fw-bold mb-0" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>
            Invoice Details
          </p>
          <h6 className="fw-bold text-light mb-0">#{invoice.id}</h6>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 px-2 py-1 rounded-pill" style={{ backgroundColor: currentStatus.bg }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: currentStatus.color }}></div>
            <span className="fw-bold" style={{ color: currentStatus.color, fontSize: '0.7rem' }}>{currentStatus.label}</span>
          </div>
          <BiX size={24} color="#6B7280" onClick={handleClose} style={{ cursor: 'pointer' }} />
        </div>
      </div>

      <Modal.Body className="px-4 py-3">
        {/* Compact Receipt Preview */}
        {receipt_url && (
          <div className="mb-3">
            <div 
              className="position-relative overflow-hidden rounded-4 border shadow-sm"
              style={{ height: '140px' }} // Fixed short height
            >
              <img
                src={receipt_url}
                alt="Receipt"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
              />
              <div className="position-absolute bottom-0 start-0 w-100 p-2 bg-dark bg-opacity-50 backdrop-blur d-flex justify-content-between align-items-center">
                <span className="text-white small fw-medium ps-2"><BiReceipt className="me-1"/> Payment Proof</span>
                <a href={receipt_url} target="_blank" className="btn btn-sm btn-light py-0 px-2 fw-bold" style={{fontSize: '0.7rem'}}>View Full</a>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Section with Grid Layout */}
        <div 
          className="d-flex align-items-center justify-content-between mb-2" 
          style={{ cursor: 'pointer' }}
          onClick={() => setOpenNotes(!openNotes)}
        >
          <span className="small fw-bold text-muted" style={{ fontSize: '0.7rem' }}>REMARKS & FEEDBACK</span>
          <BiChevronDown 
            size={18} 
            style={{ transform: openNotes ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} 
          />
        </div>

        <Collapse in={openNotes}>
          <div id="notes-collapse">
            <div className="row g-2"> {/* Using Grid to reduce height */}
              {payment_client_note && (
                <div className={payment_admin_approvel ? "col-6" : "col-12"}>
                  <div className="p-2 bg-light rounded-3 h-100">
                    <div className="d-flex align-items-center gap-1 text-muted fw-bold mb-1" style={{ fontSize: '0.65rem' }}>
                      <BiNote /> CLIENT
                    </div>
                    <p className="mb-0 text-secondary small-text">{payment_client_note}</p>
                  </div>
                </div>
              )}

              {payment_admin_approvel && (
                <div className={payment_client_note ? "col-6" : "col-12"}>
                  <div className="p-2 rounded-3 h-100" style={{ backgroundColor: '#F0F9FF', border: '1px solid #E0F2FE' }}>
                    <div className="d-flex align-items-center gap-1 text-primary fw-bold mb-1" style={{ fontSize: '0.65rem' }}>
                      <BiShieldQuarter /> ADMIN
                    </div>
                    <p className="mb-0 text-secondary small-text">{payment_admin_approvel}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Collapse>
      </Modal.Body>

      <Modal.Footer className="border-0 px-4 pb-3 pt-0 ">
        <Button
          className=" py-2 shadow-sm border-0"
          onClick={handleClose}
          style={{
            background: '#b4b4b4',
            borderRadius: '12px',
            fontWeight: '400',
            fontSize: '0.85rem'
          }}
        >
          Close
        </Button>
      </Modal.Footer>

      <style jsx>{`
        .small-text { 
          font-size: 0.8rem; 
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .backdrop-blur { backdrop-filter: blur(4px); }
      `}</style>
    </Modal>
  )
}