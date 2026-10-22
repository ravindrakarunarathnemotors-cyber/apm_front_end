'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { decodeId } from '@/utils/encode'
import { BiReceipt, BiSupport, BiChevronRight, BiChevronDown } from 'react-icons/bi'
import { Card, Row, Col, Badge, Container, Nav, Tab, Spinner } from 'react-bootstrap'
import InvoicesTab from './InvoicesTab'
import TicketsTab from './TicketsTab'
import PaidInvoicesTab from './PaidInvoiceTab'
import UnpaidInvoicesTab from './UnpaidInvoicesTab'
import PendingInvoicesTab from './PendingInvoicesTab'

export default function ServicePage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  const { clientId, serviceId, pid } = useParams()
  const realClientId = clientId
  const realServiceId = serviceId
  const realPid = pid

  const [service, setService] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [invoicesExpanded, setInvoicesExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('invoices')

  useEffect(() => {
    if (!realClientId || !realServiceId) return

    const fetchService = async () => {
      try {
        setIsLoading(true)
        setIsError(false)

        // Make credentialed request to pass secure verification middleware on backend
        const res = await fetch(`${baseUrl}/client-view/clients/${realClientId}/services/${realServiceId}${realPid ? `?pid=${realPid}` : ''}`, {
          method: 'GET',
          credentials: 'include', // CRITICAL: Transmits cryptographic session cookies to the server
          headers: { 'Content-Type': 'application/json' },
        })

        if (!res.ok) {
          throw new Error('Failed to fetch service data or session verification failed')
        }

        const data = await res.json()
        setService(data.service)
      } catch (err) {
        console.error(err)
        setIsError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchService()
  }, [realClientId, realServiceId, realPid, baseUrl])

  const toggleInvoicesExpand = () => {
    setInvoicesExpanded(!invoicesExpanded)
  }

  const handleTabSelect = (selectedTab) => {
    setActiveTab(selectedTab)

    // Auto-expand invoices when selecting any invoice-related tab
    if (selectedTab.startsWith('invoices')) {
      setInvoicesExpanded(true)
    } else {
      // Auto-collapse invoices when selecting other tabs
      setInvoicesExpanded(false)
    }
  }

  // =========================
  // Loading State
  // =========================
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }} className="d-flex justify-content-center align-items-center">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  const STATUS_CONFIG = {
    active: {
      label: 'ACTIVE',
      color: '#4ade80', // green
    },
    temporary_active: {
      label: 'TEMPORARY ACTIVE',
      color: '#facc15', // yellow
    },
    inactive: {
      label: 'INACTIVE',
      color: '#ff4d4d', // red
    },
    suspended: {
      label: 'SUSPENDED',
      color: '#fb7185', // soft red
    },
  }

  const statusConfig = STATUS_CONFIG[service?.status] || {
    label: service?.status ? service.status.toUpperCase() : 'UNKNOWN',
    color: '#9ca3af', // gray fallback
  }

  // =========================
  // Error State
  // =========================
  if (isError || !service) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }} className="d-flex justify-content-center align-items-center">
        <Card
          className="shadow-premium rounded-4 text-center p-5"
          style={{
            maxWidth: '450px',
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'linear-gradient(135deg, #ffffff, #f1f5f9)',
          }}>
          {/* Glowing Icon */}
          <div
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              backgroundColor: '#ff4d4d',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              margin: '0 auto 25px auto',
              boxShadow: '0 8px 20px rgba(255, 77, 77, 0.4)',
            }}>
            <BiSupport size={32} color="#fff" />
          </div>

          {/* Title */}
          <h4 className="fw-bold mb-2" style={{ color: '#b91c1c', letterSpacing: '-0.5px' }}>
            Access Denied
          </h4>

          {/* Subtitle */}
          <p className="text-muted mb-0" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
            We couldnt verif `&apos;` y your active session. URL alteration or unauthorized link cloning detected. Please revisit securely via the main ERP ecosystem platform.
          </p>
        </Card>
      </div>
    )
  }

  // =========================
  // Main Page
  // =========================
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', color: '#212529' }} data-bs-theme="light">
      {/* Top Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0156b8 0%, #013d82 100%)', // Your brand blue to a deeper blue
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '28px 0',
          marginBottom: '32px',
          boxShadow: '0 10px 25px -5px rgba(1, 86, 184, 0.3)', // Glow matching your brand color
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '0 0 24px 24px', // Subtle curve at the bottom for a modern feel
        }}>
        {/* Modern abstract accent */}
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-5%',
            width: '250px',
            height: '250px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <Container className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            {/* Icon Wrapper - White glass effect */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '12px',
                borderRadius: '16px',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
              }}>
              <BiSupport size={28} color="#ffffff" />
            </div>

            <div>
              <h4
                className="fw-bold m-0"
                style={{
                  fontSize: '1.6rem',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}>
                Service Management
              </h4>
              <div className="d-flex align-items-center gap-2 mt-1">
                <BiReceipt size={14} color="rgba(255,255,255,0.7)" />
                <p className="m-0" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', fontWeight: '500' }}>
                  System Overview & Invoices
                </p>
              </div>
            </div>
          </div>

          {/* Modern White-Glass Status Badge */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '8px 20px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: statusConfig.color,
                boxShadow: `0 0 10px ${statusConfig.color}`,
              }}
            />
            {statusConfig.label}
          </div>
        </Container>
      </div>
      <Container>
        {/* Tabs Row */}
        <Tab.Container id="service-tabs" defaultActiveKey="invoices" activeKey={activeTab} onSelect={handleTabSelect}>
          <Row className="g-4">
            {/* Sidebar */}
            <Col lg={3}>
              {/* Visual Identity Card */}
              <Card className="border-0 shadow-premium rounded-4 overflow-hidden mb-4 bg-white">
                {/* Header with Gradient */}
                <div
                  className="brand-gradient-bg p-4 d-flex justify-content-center"
                  style={{
                    height: '110px',
                    position: 'relative',
                    background: 'linear-gradient(135deg, #a1caf3 0%, #90c7fd98 100%)',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  }}>
                  {/* Floating Icon Container */}
                  <div
                    className="product-icon-box shadow-sm"
                    style={{
                      width: '85px',
                      height: '85px',
                      backgroundColor: '#ffffff',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      padding: '12px',
                      position: 'absolute',
                      bottom: '-42px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 5,
                      border: '4px solid #ffffff',
                    }}>
                    <img
                      src={service.product_image || '/placeholder.png'}
                      alt={service.product_name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                </div>

                {/* Card Body with Spacer */}
                <Card.Body className="text-center" style={{ paddingTop: '55px' }}>
                  <h6 className="fw-bold mb-1 text-dark" style={{ letterSpacing: '-0.3px' }}>
                    {service.product_name}
                  </h6>
                  <p className="text-muted mb-3" style={{ fontSize: '0.75rem' }}>
                    {service.product_domain}
                  </p>

                  <Badge bg="light" text="dark" className="border px-3 py-2 rounded-pill fw-medium" style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                    {service.package_name}
                  </Badge>
                </Card.Body>
              </Card>

              {/* Navigation Card */}
              <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
                <Card.Body className="p-2">
                  <Nav variant="pills" className="flex-column custom-nav">
                    {/* Invoices Main Tab Group */}
                    <div className="mb-1">
                      <div
                        className="d-flex align-items-center py-2 px-3 rounded-3"
                        onClick={toggleInvoicesExpand}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          userSelect: 'none',
                          // Active or Expanded State uses your brand blue
                          backgroundColor: invoicesExpanded || activeTab.startsWith('invoices') ? '#0156b8fa' : 'transparent',
                          boxShadow: invoicesExpanded || activeTab.startsWith('invoices') ? '0 4px 12px rgba(1, 86, 184, 0.2)' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!invoicesExpanded && !activeTab.startsWith('invoices')) {
                            e.currentTarget.style.backgroundColor = 'rgba(1, 86, 184, 0.05)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!invoicesExpanded && !activeTab.startsWith('invoices')) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}>
                        <BiReceipt
                          className="me-2"
                          size={18}
                          style={{
                            color: invoicesExpanded || activeTab.startsWith('invoices') ? '#fff' : '#64748b',
                            transition: 'color 0.3s',
                          }}
                        />
                        <span
                          className="small fw-bold"
                          style={{
                            color: invoicesExpanded || activeTab.startsWith('invoices') ? '#fff' : '#1e293b',
                            fontSize: '0.85rem',
                          }}>
                          Invoices
                        </span>

                        {invoicesExpanded ? (
                          <BiChevronDown className="ms-auto" size={18} style={{ color: '#fff' }} />
                        ) : (
                          <BiChevronRight className="ms-auto" size={18} style={{ color: activeTab.startsWith('invoices') ? '#fff' : '#cbd5e1' }} />
                        )}
                      </div>

                      {/* Invoice Sub-menu */}
                      {invoicesExpanded && (
                        <div className="ms-2 ps-3 mb-2 mt-1 border-start" style={{ marginLeft: '1.25rem', borderColor: '#e2e8f0 !important' }}>
                          {[
                            { key: 'invoices', label: 'All Invoices' },
                            { key: 'invoices-pending', label: 'Pending' },
                            { key: 'invoices-paid', label: 'Paid' },
                            { key: 'invoices-unpaid', label: 'Unpaid' },
                          ].map((item) => (
                            <Nav.Item key={item.key}>
                              <Nav.Link
                                eventKey={item.key}
                                className="py-1 px-3 small rounded-2 d-flex align-items-center mb-1"
                                style={{
                                  color: activeTab === item.key ? '#0156b8fa' : '#64748b',
                                  fontWeight: activeTab === item.key ? '700' : '500',
                                  backgroundColor: activeTab === item.key ? 'rgba(1, 86, 184, 0.08)' : 'transparent',
                                  transition: 'all 0.2s',
                                }}>
                                <span
                                  className="me-2"
                                  style={{
                                    fontSize: '14px',
                                    color: activeTab === item.key ? '#ffffff' : '#cbd5e1',
                                  }}>
                                  •
                                </span>
                                {item.label}
                              </Nav.Link>
                            </Nav.Item>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tickets Tab */}
                    <Nav.Item>
                      <Nav.Link
                        eventKey="tickets"
                        className="d-flex align-items-center py-2 px-3 rounded-3"
                        style={{
                          backgroundColor: activeTab === 'tickets' ? '#0156b8f6' : 'transparent',
                          boxShadow: activeTab === 'tickets' ? '0 4px 12px rgba(1, 86, 184, 0.2)' : 'none',
                          color: activeTab === 'tickets' ? '#fff' : '#1e293b',
                          transition: 'all 0.3s',
                        }}>
                        <BiSupport className="me-2" size={18} style={{ color: activeTab === 'tickets' ? '#fff' : '#64748b' }} />
                        <span className="small fw-bold" style={{ fontSize: '0.85rem' }}>
                          Tickets
                        </span>
                        <BiChevronRight className="ms-auto" size={18} style={{ color: activeTab === 'tickets' ? '#fff' : '#cbd5e1' }} />
                      </Nav.Link>
                    </Nav.Item>
                  </Nav>
                </Card.Body>
              </Card>
            </Col>

            {/* Content */}
            <Col lg={9}>
              <Card className="border-0 shadow-sm rounded-3 bg-white" style={{ minHeight: '400px' }}>
                <Card.Body className="p-4">
                  <Tab.Content>
                    <Tab.Pane eventKey="invoices">
                      <InvoicesTab clientId={realClientId} serviceId={realServiceId} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="invoices-pending">
                      <PendingInvoicesTab clientId={realClientId} serviceId={realServiceId} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="invoices-paid">
                      <PaidInvoicesTab clientId={realClientId} serviceId={realServiceId} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="invoices-unpaid">
                      <UnpaidInvoicesTab clientId={realClientId} serviceId={realServiceId} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="tickets">
                      <TicketsTab clientId={realClientId} serviceId={realServiceId} />
                    </Tab.Pane>
                  </Tab.Content>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab.Container>
      </Container>

      {/* Global Styles */}
      <style jsx global>{`
        .custom-nav .nav-link {
          color: #495057 !important;
          background: transparent;
          border: none;
          text-align: left;
        }

        .custom-nav .nav-link:hover {
          background-color: #f8f9fa !important;
        }

        .custom-nav .nav-link.active {
          background-color: #0156b8 !important;
          color: #ffffff !important;
          font-weight: 600;
        }

        .custom-nav .ms-4 .nav-link {
          font-size: 0.8rem;
          padding: 0.25rem 0.5rem;
        }

        .custom-nav .ms-4 .nav-link.active {
          background-color: rgba(1, 86, 184, 0.15) !important;
          color: #0156b8 !important;
          font-weight: 600;
        }

        .custom-nav .ms-4 .nav-link:hover {
          background-color: rgb(1, 86, 184) !important;
        }

        .bg-view {
          background-color: #0156b8;
        }

        .shadow-premium {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .text-view {
          color: #0156b8;
        }

        .cursor-pointer {
          cursor: pointer;
        }

        .expanded-main-tab {
          background-color: #0156b8 !important;
          color: #ffffff !important;
        }

        .expanded-main-tab:hover {
          background-color: #014a9e !important;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #6c757d;
        }

        .custom-nav .ms-4 .nav-link.active .dot {
          background-color: #0156b8;
        }
      `}</style>
    </div>
  )
}