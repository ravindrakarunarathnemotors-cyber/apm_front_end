// TicketsTab.jsx
'use client'

import React, { useState, useEffect } from 'react'
import { Card, Button, Form, Row, Col, Spinner } from 'react-bootstrap'
import { BiX, BiChevronDown, BiSupport } from 'react-icons/bi'
import axios from 'axios'
import Swal from 'sweetalert2'
import AddTicketModal from './AddTicketModal'
import ViewTechnicalTicket from './components/ViewTechnicalTicket'

export default function TicketsTab({ clientId, serviceId }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const [showAddModal, setShowAddModal] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [filters, setFilters] = useState({
    department: '',
    priority: '',
    fromDate: '',
    toDate: '',
  })
  const [tickets, setTickets] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedTicketId, setSelectedTicketId] = useState(null) // <-- Track selected ticket
  const [blinkOn, setBlinkOn] = useState(true)          // <-- new

  // Handle input changes for filters
  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  // Fetch tickets from backend
  const fetchTickets = async () => {
    if (!clientId || !serviceId) return

    setIsLoading(true)
    setIsError(false)

    try {
      const params = {
        clientId,
        serviceId,
        department: filters.department || undefined,
        priority: filters.priority || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        page,
        limit: 10,
      }

      const { data } = await axios.get(`${baseUrl}/client-view/tickets`, { params })

      setTickets(data.data || [])
      setPage(data.page || 1)
      setTotalPages(data.totalPages || 1)
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setIsError(true)
      setTickets([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch tickets whenever filters, page, clientId or serviceId change
  useEffect(() => {
    fetchTickets()
  }, [filters, page, clientId, serviceId])

  // Pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  // Close Ticket
  const handleCloseTicket = async (ticketId) => {
    const result = await Swal.fire({
      title: `<span style="color:#dc2626">Close Ticket #${ticketId}?</span>`,
      html: '<span style="color:#000000">Are you sure you want to close this ticket?</span>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, close it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      background: '#ffffff',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    })

    if (result.isConfirmed) {
      try {
        await axios.put(`${baseUrl}/client-view/tickets/${ticketId}/close`, { clientId, serviceId })

        Swal.fire({
          title: `<span style="color:#22c55e">Closed!</span>`,
          html: `<span style="color:#000000">Ticket #${ticketId} has been closed.</span>`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          background: '#ffffff',
        })

        fetchTickets()
      } catch (err) {
        console.error('Error closing ticket:', err)
        Swal.fire({
          title: `<span style="color:#dc2626">Oops...</span>`,
          html: `<span style="color:#000000">Failed to close the ticket. Please try again.</span>`,
          icon: 'error',
          background: '#ffffff',
        })
      }
    }
  }

    useEffect(() => {                                      // <-- new
    const interval = setInterval(() => {
      setBlinkOn(prev => !prev)
    }, 500)
    return () => clearInterval(interval)
  }, [])
  
  // If a ticket is selected, show the detail page
  if (selectedTicketId) {
    return (
      <ViewTechnicalTicket
        id={selectedTicketId}
        onBack={() => {
          setSelectedTicketId(null)
          fetchTickets() // ✅ call refresh after returning
        }}
      />
    )
  }

  const handleClearFilters = () => {
    setFilters({
      department: '',
      priority: '',
      toDate: '',
    })
    setPage(1)
  }




  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        {/* Left Side: Title with Brand Accent */}
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: '4px',
              height: '28px',
              backgroundColor: '#0156b8',
              borderRadius: '4px',
            }}
          />
          <div>
            <h4
              className="fw-bold m-0"
              style={{
                fontSize: '1.5rem',
                color: '#0f172a',
                letterSpacing: '-0.03em',
              }}>
              Support Queue
            </h4>
            <p className="m-0 text-muted" style={{ fontSize: '0.85rem' }}>
              Manage and track your service requests
            </p>
          </div>
        </div>

        {/* Right Side: Action Group */}
        <div className="d-flex gap-2">
          {/* Filter Toggle - Subtle Style */}

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

          {/* Add Ticket - Primary Brand Style */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#0156b8',
              color: '#ffffff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(1, 86, 184, 0.25)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#014ba0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0156b8'
            }}>
            <BiSupport size={18} />
            Add Ticket
          </button>
        </div>
      </div>

      {/* Add Ticket Modal */}
      <AddTicketModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        clientId={clientId}
        serviceId={serviceId}
        onTicketAdded={fetchTickets}
      />

      {/* Filters */}
      {showFilters && (
        <Card className="mb-4">
          <Card.Body>
            <Row className="g-3">
              <Col md={3}>
                <Form.Label>Department</Form.Label>
                <Form.Select name="department" value={filters.department} onChange={handleChange}>
                  <option value="">All</option>
                  <option value="technical">Technical</option>
                  <option value="sales">Sales</option>
                  <option value="billing">Billing</option>
                </Form.Select>
              </Col>

              <Col md={3}>
                <Form.Label>Priority</Form.Label>
                <Form.Select name="priority" value={filters.priority} onChange={handleChange}>
                  <option value="">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="immediate">Immediate</option>
                </Form.Select>
              </Col>

              <Col md={3}>
                <Form.Label>From Date</Form.Label>
                <Form.Control type="date" name="fromDate" value={filters.fromDate} onChange={handleChange} />
              </Col>

              <Col md={3}>
                <Form.Label>To Date</Form.Label>
                <Form.Control type="date" name="toDate" value={filters.toDate} onChange={handleChange} />
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Ticket List */}
      {isLoading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : isError ? (
        <div className="text-center text-danger py-5">Failed to load tickets.</div>
      ) : !tickets.length ? (
        <div className="text-center text-muted py-5">No tickets found.</div>
      ) : (
        <div className="d-flex flex-column gap-0">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="p-3 shadow-sm"
              style={{ borderRadius: '12px', cursor: 'pointer', position: 'relative' }}
              onClick={() => setSelectedTicketId(ticket.id)}>
              {/* Priority Strip */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '5px',
                  borderRadius: '12px 0 0 12px',
                  backgroundColor:
                    ticket.priority === 'immediate' || ticket.priority === 'high' ? '#ef4444' : ticket.priority === 'medium' ? '#f59e0b' : '#10b981',
                }}
              />

              <Row className="align-items-center g-2">
                <Col xs="auto">
                  <span className="fw-bold text-muted">#{ticket.id}</span>
                </Col>
              
<Col md={4}>
  <small className="fw-semibold">
    {ticket.subject}
    {parseInt(ticket.unread_count) > 0 && (
      <span
        style={{
          backgroundColor: '#ef4444',
          color: '#ffffff',
          borderRadius: '9999px',
          padding: '2px 8px',
          fontSize: '10px',
          fontWeight: 'bold',
          marginLeft: '8px',
          display: 'inline-block',
          opacity: blinkOn ? 1 : 0.3,
          transition: 'opacity 0.3s ease',
        }}
      >
        {ticket.unread_count} new
      </span>
    )}
  </small>
</Col>
                <Col xs="auto">
                  <span
                    className="text-capitalize"
                    style={{
                      backgroundColor:
                        ticket.department === 'technical'
                          ? '#eff6ff'
                          : ticket.department === 'sales'
                            ? '#ecfdf5'
                            : ticket.department === 'billing'
                              ? '#fff1f2'
                              : '#f9fafb',
                      color:
                        ticket.department === 'technical'
                          ? '#2563eb'
                          : ticket.department === 'sales'
                            ? '#059669'
                            : ticket.department === 'billing'
                              ? '#e11d48'
                              : '#4b5563',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${
                        ticket.department === 'technical'
                          ? '#dbeafe'
                          : ticket.department === 'sales'
                            ? '#d1fae5'
                            : ticket.department === 'billing'
                              ? '#fee2e2'
                              : '#f3f4f6'
                      }`,
                    }}>
                    {ticket.department}
                  </span>
                </Col>

                <Col xs="auto">
                  <span
                    className="text-capitalize"
                    style={{
                      backgroundColor:
                        ticket.priority === 'immediate' || ticket.priority === 'high'
                          ? '#fef2f2'
                          : ticket.priority === 'medium'
                            ? '#fffbeb'
                            : '#f0fdf4',
                      color:
                        ticket.priority === 'immediate' || ticket.priority === 'high'
                          ? '#991b1b'
                          : ticket.priority === 'medium'
                            ? '#92400e'
                            : '#166534',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                    }}>
                    {ticket.priority}
                  </span>
                </Col>

                <Col xs="auto">
                  <span
                    className="text-capitalize"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      fontSize: '11px',
                      fontWeight: '500',
                      padding: '3px 10px 3px 22px',
                      borderRadius: '20px',
                      border: '1px solid #e5e7eb',
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}>
                    <span
                      style={{
                        height: '6px',
                        width: '6px',
                        borderRadius: '50%',
                        backgroundColor: ticket.status === 'open' ? '#22c55e' : ticket.status === 'hold' ? '#f59e0b' : '#ff4949',
                        position: 'absolute',
                        left: '10px',
                      }}
                    />
                    {ticket.status}
                  </span>
                </Col>

               <Col className="text-end">
  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
    {ticket.date.split('T')[0]}
  </div>
  <small className="text-muted">
    {ticket.date.split('T')[1].substring(0, 5)}
  </small>
</Col>

                {ticket.status !== 'closed' && (
                  <Col xs="auto">
                    <Button
                      title="Close Ticket"
                      style={{
                        backgroundColor: '#dc2626', // red
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCloseTicket(ticket.id)
                      }}>
                      <BiX size={18} />
                      Close
                    </Button>
                  </Col>
                )}
              </Row>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {tickets.length > 0 && (
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
