'use client'

import React, { useState, useEffect } from 'react'
import { Card, Button, Form, Row, Col, Spinner } from 'react-bootstrap'
import { BiChevronDown } from 'react-icons/bi'
import axios from 'axios'
import Swal from 'sweetalert2'
import InvoiceModal from './InvoiceModal'

export default function PaidInvoicesTab({ clientId, serviceId }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const [showFilters, setShowFilters] = useState(true)
  const [filters, setFilters] = useState({
    invoiceId: '',
    status: '',
    fromDate: '',
    toDate: '',
  })
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)

  // Handle filter changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  // Fetch invoices
  const fetchInvoices = async () => {
    if (!clientId || !serviceId) return

    setIsLoading(true)
    setIsError(false)

    try {
      const params = {
        clientId,
        serviceId,
        invoiceId: filters.invoiceId || undefined,
        status: 'paid',
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        page,
        limit: 10,
      }

      const { data } = await axios.get(`${baseUrl}/client-view/invoices`, { params })

      setInvoices(data.data || [])
      setPage(data.page || 1)
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      console.error('Error fetching invoices:', err)
      setIsError(true)
      setInvoices([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [filters, page, clientId, serviceId])

  // Pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  // Mark invoice as paid
  const handleMarkPaid = async (invoiceId) => {
    const result = await Swal.fire({
      title: `<span style="color:#22c55e">Mark Invoice #${invoiceId} as Paid?</span>`,
      html: '<span style="color:#000000">Are you sure you want to mark this invoice as paid?</span>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, mark paid!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      background: '#ffffff',
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#6b7280',
    })

    if (result.isConfirmed) {
      try {
        await axios.put(`${baseUrl}/client-view/invoices/${invoiceId}/markPaid`, { clientId, serviceId })

        Swal.fire({
          title: `<span style="color:#22c55e">Marked Paid!</span>`,
          html: `<span style="color:#000000">Invoice #${invoiceId} has been marked as paid.</span>`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#ffffff',
        })

        fetchInvoices()
      } catch (err) {
        console.error('Error marking invoice as paid:', err)
        Swal.fire({
          title: `<span style="color:#dc2626">Oops...</span>`,
          html: `<span style="color:#000000">Failed to update invoice. Please try again.</span>`,
          icon: 'error',
          background: '#ffffff',
        })
      }
    }
  }

  const handleClearFilters = () => {
    setFilters({
      invoiceId: '',
      fromDate: '',
      toDate: '',
    })
    setPage(1)
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="d-flex align-items-center gap-3 mb-1">
            <h4
              className="fw-bold m-0"
              style={{
                fontSize: '1.6rem',
                color: '#0f172a', // Deep slate for text
                letterSpacing: '-0.03em',
              }}>
              Paid Invoice Queue
            </h4>
            <span
              style={{
                backgroundColor: 'rgba(1, 86, 184, 0.1)',
                color: '#0156b8',
                padding: '2px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '700',
              }}>
              {invoices.length} TOTAL
            </span>
          </div>
          <p className="text-muted m-0" style={{ fontSize: '0.85rem' }}>
            Monitor payment status and download billing history.
          </p>
        </div>

        {/* Right Side: Subtle Action Button */}
        <div className="d-flex align-items-center gap-3">
          {showFilters && (
            <button
              onClick={handleClearFilters}
              style={{
                background: 'transparent',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
              }}>
              Clear Filters
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: showFilters ? '#0156b8' : 'transparent',
              color: showFilters ? '#ffffff' : '#475569',
              border: `1px solid ${showFilters ? '#0156b8' : '#e2e8f0'}`,
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: showFilters ? '0 4px 12px rgba(1, 86, 184, 0.2)' : 'none',
            }}>
            <BiChevronDown
              size={20}
              style={{
                transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
              }}
            />
            {showFilters ? 'Hide Filters' : 'Filter View'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col md={4}>
                <Form.Label>Invoice ID</Form.Label>
                <Form.Control type="text" placeholder="Invoice #" name="invoiceId" value={filters.invoiceId} onChange={handleChange} />
              </Col>

              <Col md={4}>
                <Form.Label>From Date</Form.Label>
                <Form.Control type="date" name="fromDate" value={filters.fromDate} onChange={handleChange} />
              </Col>

              <Col md={4}>
                <Form.Label>To Date</Form.Label>
                <Form.Control type="date" name="toDate" value={filters.toDate} onChange={handleChange} />
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Invoice List */}
      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : isError ? (
        <div className="text-center text-danger py-5">Failed to load invoices.</div>
      ) : !invoices.length ? (
        <div className="text-center text-muted py-5">No invoices found.</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {invoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="p-3 shadow-sm"
              style={{ borderRadius: '12px', cursor: 'pointer', position: 'relative' }}
              onClick={() => setSelectedInvoiceId(invoice.id)}>
              {/* Status Strip */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '5px',
                  borderRadius: '12px 0 0 12px',
                  backgroundColor: invoice.status === 'overdue' ? '#ef4444' : invoice.status === 'pending' ? '#f59e0b' : '#10b981',
                }}
              />

              <Row className="align-items-center g-2">
                <Col xs="auto">
                  <span className="fw-bold text-muted">#{invoice.id}</span>
                </Col>
                {/* <Col md={4}>
                  <small className="fw-semibold">{invoice.subject || 'Invoice'}</small>
                </Col> */}

                <Col xs="auto">
                  <span
                    className="text-capitalize"
                    style={{
                      backgroundColor: invoice.status === 'pending' ? '#fffbeb' : invoice.status === 'paid' ? '#f0fdf4' : '#fee2e2',
                      color: invoice.status === 'pending' ? '#92400e' : invoice.status === 'paid' ? '#166534' : '#991b1b',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                    }}>
                    {invoice.status}
                  </span>
                </Col>

                <Col xs="auto">
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>LKR {Number(invoice.invoice_sub_pay_amount ?? 0).toFixed(2)}</span>
                </Col>

                <Col className="text-end">
                  {/* Always show Invoice Created Date */}
                  <div style={{ fontWeight: 500, fontSize: '0.75rem', color: '#6b7280' }}>
                    Invoice Date: {new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>

                  {/* Conditional main date */}
                  <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    {invoice.status === 'paid'
                      ? `Paid on: ${new Date(invoice.paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : invoice.status === 'pending'
                        ? `Due on: ${new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : `Overdue: ${new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  </div>
                </Col>

                {invoice.status !== 'paid' && (
                  <Col xs="auto">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkPaid(invoice.id)
                      }}>
                      Mark Paid
                    </Button>
                  </Col>
                )}

                <Col xs="auto">
                  <Button size="sm" variant="primary" onClick={() => setViewingInvoice(invoice)}>
                    View
                  </Button>
                </Col>
              </Row>
            </Card>
          ))}
        </div>
      )}
      <InvoiceModal viewingInvoice={viewingInvoice} handleCloseView={() => setViewingInvoice(null)} />

      {/* Pagination */}
      {invoices.length > 0 && (
        <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
          <Button size="sm" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button size="sm" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
