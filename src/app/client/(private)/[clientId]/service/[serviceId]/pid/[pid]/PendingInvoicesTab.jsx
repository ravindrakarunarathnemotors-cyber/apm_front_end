'use client'

import React, { useState, useEffect } from 'react'
import { Card, Button, Form, Row, Col, Spinner, Badge, Dropdown } from 'react-bootstrap'
import { BiChevronDown } from 'react-icons/bi'
import axios from 'axios'
import Swal from 'sweetalert2'
import InvoiceModal from './InvoiceModal'
import MarkPaidModal from './MarkAsPaidModal'
import PaymentDetailsModal from './PaymentDetailsModal'
import Script from 'next/script'

export default function InvoicesTab({ clientId, serviceId }) {
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
  const [markPaidInvoiceId, setMarkPaidInvoiceId] = useState(null)
  const [viewPaymentInvoice, setViewPaymentInvoice] = useState(null)
  const [totalRecords, setTotalRecords] = useState(0)
  const [paymentMethods, setPaymentMethods] = useState([])
  
  // Additional state for PayHere payment
  const [payhereConfig, setPayhereConfig] = useState(null)
  const [userData, setUserData] = useState(null)

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    try {
      const { data } = await axios.get(`${baseUrl}/client-view/payment-methods`);
      console.log('Payment methods response:', data);
      
      const activeMethods = (data.data || []).filter(method => method.status === "active");
      setPaymentMethods(activeMethods);
      
      const payHereMethod = activeMethods.find(m => m.method_name === 'PayHere');
      if (payHereMethod && payHereMethod.api_array) {
        setPayhereConfig({
          merchant_id: payHereMethod.api_array.merchant_id || '',
          merchantSecret: payHereMethod.api_array.merchantSecret || '',
          sandbox: payHereMethod.api_array.sandbox === true
        });
      }
    } catch (err) {
      console.error('Failed to load payment methods', err);
    }
  };

  // Fetch user data - Updated to match your client table structure
  const fetchUserData = async () => {
    try {
      const { data } = await axios.get(`${baseUrl}/client-view/user/${clientId}`);
      console.log('User data response:', data);
      setUserData(data.data || {});
    } catch (err) {
      console.error('Failed to load user data', err);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
    if (clientId) {
      fetchUserData();
    }
  }, [clientId]);

  const handleChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
  }

  const fetchInvoices = async () => {
    if (!clientId || !serviceId) return

    setIsLoading(true)
    setIsError(false)

    try {
      const params = {
        clientId,
        serviceId,
        invoiceId: filters.invoiceId || undefined,
        status: 'pending',
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        page,
        limit: 10,
      }

      const { data } = await axios.get(`${baseUrl}/client-view/invoices`, { params })

      setInvoices(data.data || [])
      setPage(data.page || 1)
      setTotalPages(data.totalPages || 1)
      setTotalRecords(data.totalRecords || 0)
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

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleClearFilters = () => {
    setFilters({
      invoiceId: '',
      status: '',
      fromDate: '',
      toDate: '',
    })
    setPage(1)
  }

  // Handle PayHere payment
  const handlePayHerePayment = async (invoice, e) => {
    if (e) e.stopPropagation();
    
    if (!invoice) return;
    
    try {
      const order_id = invoice.id.toString(); // Convert to string
      const amount = parseFloat(invoice.invoice_sub_pay_amount).toFixed(2);
      
      console.log('Sending to backend:', { order_id, amount });
      
      // Get the payment hash from backend
      const response = await fetch(`${baseUrl}/client-view/payherehash`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: order_id,
          amount: amount,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Backend response:', data);

        if (data) {
          // Set up PayHere callbacks
          window.payhere.onCompleted = function onCompleted(orderId) {
            console.log("Payment completed. OrderID:" + orderId);
            Swal.fire({
              title: "Payment Successful!",
              text: `Your payment was completed. Order ID: ${orderId}`,
              icon: "success",
              confirmButtonText: "OK",
            }).then(() => {
              fetchInvoices(); // Refresh invoices list
            });
          };

          window.payhere.onDismissed = function onDismissed() {
            console.log("Payment dismissed");
            Swal.fire({
              title: "Payment Cancelled",
              text: "You have cancelled the payment.",
              icon: "info",
              confirmButtonText: "OK",
            });
          };

          window.payhere.onError = function onError(error) {
            console.log("Error:" + error);
            Swal.fire({
              title: "Payment Error",
              text: "An error occurred during payment. Please try again.",
              icon: "error",
              confirmButtonText: "OK",
            });
          };

          // Get user data with fallbacks for missing fields
          const firstName = userData?.first_name || userData?.name?.split(' ')[0] || 'Customer';
          const lastName = userData?.last_name || userData?.name?.split(' ').slice(1).join(' ') || '';
          
          // Use company_email as primary email, fallback to contact_person_email
          const email = userData?.email || userData?.company_email || userData?.contact_person?.email || '';
          
          // Use company_phone_1 as primary phone, fallback to contact_person_phone
          const phone = userData?.phone || userData?.company_phone_1 || userData?.contact_person?.phone || '';
          
          // Use company_address as primary address
          const address = userData?.address || userData?.company_address || '';
          
          // City might not be in client table, use empty string if not available
          const city = userData?.city || '';

          // Payment variables
          var payment = {
            sandbox: data.sandbox,
            merchant_id: data.merchant_id,
            return_url: process.env.NEXT_PUBLIC_RETURN_URL,
            cancel_url: process.env.NEXT_PUBLIC_CANCEL_URL,
            notify_url: process.env.NEXT_PUBLIC_NOTIFY_URL,
            order_id: order_id,
            items: `Invoice #${invoice.id}`,
            amount: amount,
            currency: data.currency,
            hash: data.local_md5sig,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            address: address,
            city: city,
            country: 'Sri Lanka',
            delivery_address: address,
            delivery_city: city,
            delivery_country: 'Sri Lanka',
            custom_1: clientId?.toString() || '',
            custom_2: invoice.id?.toString() || ''
          };

          console.log('Payment object:', payment);
          window.payhere.startPayment(payment);
        }
      } else {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        Swal.fire({
          icon: 'error',
          title: 'Payment Error',
          text: errorData.message || 'Failed to initialize payment',
        });
      }
    } catch (err) {
      console.error("PayHere payment error:", err);
      Swal.fire({
        icon: 'error',
        title: 'Payment Error',
        text: err.message || 'Failed to initialize payment. Please try again.',
      });
    }
  };

  const handleBankTransfer = (invoiceId, e) => {
    if (e) e.stopPropagation();
    setMarkPaidInvoiceId(invoiceId);
  };

  const handleCardClick = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
  };

  return (
    <>
      <Script 
        src="https://www.payhere.lk/lib/payhere.js"
        strategy="afterInteractive"
      />
      
      <div>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-end mb-4 px-1">
          <div>
            <div className="d-flex align-items-center gap-3 mb-1">
              <h4
                className="fw-bold m-0"
                style={{
                  fontSize: '1.6rem',
                  color: '#0f172a',
                  letterSpacing: '-0.03em',
                }}>
                Invoice Queue
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
                {totalRecords} TOTAL
              </span>
            </div>
            <p className="text-muted m-0" style={{ fontSize: '0.85rem' }}>
              Monitor payment status and download billing history.
            </p>
          </div>

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
                <Col md={3}>
                  <Form.Label>Invoice ID</Form.Label>
                  <Form.Control type="text" placeholder="Invoice #" name="invoiceId" value={filters.invoiceId} onChange={handleChange} />
                </Col>

                <Col md={3}>
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={filters.status} onChange={handleChange}>
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
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

        {/* Invoice List */}
        {isLoading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
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
                style={{ 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  position: 'relative' 
                }}
                onClick={() => handleCardClick(invoice.id)}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '5px',
                    borderRadius: '12px 0 0 12px',
                    backgroundColor: invoice.status === 'unpaid' ? '#ef4444' : invoice.status === 'pending' ? '#f59e0b' : '#10b981',
                  }}
                />

                <Row className="align-items-center g-2">
                  <Col xs="auto" className="d-flex flex-column align-items-start">
                    <span className="fw-bold text-muted">#{invoice.id}</span>
                    {invoice.is_recurring && (
                      <Badge bg="info" className="mt-1">
                        {invoice.invoice_type}
                      </Badge>
                    )}
                  </Col>

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
                    <div style={{ fontWeight: 500, fontSize: '0.75rem', color: '#6b7280' }}>
                      Invoice Date: {new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>

                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                      {invoice.status === 'paid'
                        ? `Paid on: ${new Date(invoice.paid_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : invoice.status === 'pending'
                          ? `Due on: ${new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                          : `Overdue: ${new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </div>
                  </Col>

                  {invoice.status !== 'paid' && invoice.status !== 'pending'&& paymentMethods.length > 0 && (
                    <Col xs="auto" onClick={(e) => e.stopPropagation()}>
                      <Dropdown>
                        <Dropdown.Toggle 
                          size="sm" 
                          variant="success" 
                          id={`payment-dropdown-${invoice.id}`}
                        >
                          Pay Now
                        </Dropdown.Toggle>

                        <Dropdown.Menu>
                          {paymentMethods.map((method) => (
                            <Dropdown.Item 
                              key={method.payment_method_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (method.method_name === 'Bank Transfer') {
                                  handleBankTransfer(invoice.id, e);
                                } else if (method.method_name === 'PayHere') {
                                  handlePayHerePayment(invoice, e);
                                }
                              }}
                            >
                              {method.logo && (
                                <img 
                                  src={method.logo} 
                                  alt={method.method_name}
                                  style={{ 
                                    width: '20px', 
                                    height: '20px', 
                                    marginRight: '8px',
                                    objectFit: 'contain'
                                  }} 
                                />
                              )}
                              {method.method_name}
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>
                  )}

                  {invoice.status === 'pending' && (
                    <Col xs="auto" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="info"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewPaymentInvoice(invoice);
                        }}>
                        Details
                      </Button>
                    </Col>
                  )}

                  <Col xs="auto" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      size="sm" 
                      variant="outline-primary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingInvoice(invoice);
                      }}
                    >
                      View
                    </Button>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}
        
        {/* Modals */}
        <InvoiceModal 
          viewingInvoice={viewingInvoice} 
          handleCloseView={() => setViewingInvoice(null)} 
        />
        
        <MarkPaidModal
          show={!!markPaidInvoiceId}
          handleClose={() => setMarkPaidInvoiceId(null)}
          invoiceId={markPaidInvoiceId}
          clientId={clientId}
          serviceId={serviceId}
          invoiceAmount={invoices.find((inv) => inv.id === markPaidInvoiceId)?.invoice_sub_pay_amount || 0}
          onSuccess={fetchInvoices}
          paymentInstructions={paymentMethods.find(m => m.method_name === 'Bank Transfer')?.payment_intraduction}
        />
        
        <PaymentDetailsModal 
          show={!!viewPaymentInvoice} 
          handleClose={() => setViewPaymentInvoice(null)} 
          invoice={viewPaymentInvoice} 
        />

        {/* Pagination */}
        {invoices.length > 0 && (
          <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
            <Button 
              variant="outline-secondary" 
              size="sm" 
              disabled={page <= 1} 
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="fw-bold">
              Page {page} of {totalPages}
            </span>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              disabled={page >= totalPages} 
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  )
}