'use client'

import React, { useRef, useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button, Spinner } from 'react-bootstrap'
import axios from 'axios'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

const formatCurrency = (amount) => {
  return Number(amount).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const InvoicePage = () => {
  const params = useParams()
  const encryptedId = params?.id ? decodeURIComponent(params.id) : ''

  const printRef = useRef()
  const [isDownloading, setIsDownloading] = useState(false)

  const [company, setCompany] = useState({ settings: {} })
  const [isLoadingCompany, setIsLoadingCompany] = useState(false)
  const [isErrorCompany, setIsErrorCompany] = useState(false)

  const [terms, setTerms] = useState([])
  const [termsLoading, setTermsLoading] = useState(false)
  const [termsError, setTermsError] = useState(false)

  const [viewInvoice, setViewInvoice] = useState(null)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [invoiceError, setInvoiceError] = useState(false)

  // Fetch company details
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        setIsLoadingCompany(true)
        setIsErrorCompany(false)

        const res = await fetch(`${baseUrl}/client-view/get-company-details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        if (!res.ok) throw new Error('Failed to fetch company details')

        const data = await res.json()
        setCompany(data)
      } catch (error) {
        console.error(error)
        setIsErrorCompany(true)
      } finally {
        setIsLoadingCompany(false)
      }
    }

    fetchCompanyDetails()
  }, [])

  // Fetch invoice terms
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setTermsLoading(true)
        setTermsError(false)

        const res = await axios.get(`${baseUrl}/client-view/get-invoice-terms`)
        setTerms(res.data.terms || [])
      } catch (err) {
        console.error('Failed to fetch terms:', err)
        setTermsError(true)
      } finally {
        setTermsLoading(false)
      }
    }

    fetchTerms()
  }, [])

  // Fetch invoice by encrypted ID
  useEffect(() => {
    if (!encryptedId) return
    const fetchInvoice = async () => {
      try {
        setInvoiceLoading(true)
        setInvoiceError(false)
        const res = await fetch(`${baseUrl}/client-view/view-invoices/${encryptedId}`)
        const json = await res.json()
        if (!res.ok || !json.data) throw new Error(json.message || 'Invoice not found')
        setViewInvoice(json.data)
      } catch (err) {
        console.error(err)
        setInvoiceError(true)
      } finally {
        setInvoiceLoading(false)
      }
    }
    fetchInvoice()
  }, [encryptedId])

  const handlePrint = () => {
    if (!printRef.current) return
    const printContents = printRef.current.innerHTML
    const originalContents = document.body.innerHTML
    document.body.innerHTML = printContents
    window.print()
    document.body.innerHTML = originalContents
    window.location.reload()
  }

  const handleDownloadPdf = async () => {
    if (!printRef.current) return
    try {
      setIsDownloading(true)
      const html2pdf = (await import('html2pdf.js')).default
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Invoice-${viewInvoice.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }
      await html2pdf().set(opt).from(printRef.current).save()
    } catch (error) {
      console.error('PDF download failed', error)
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoadingCompany || invoiceLoading)
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spinner animation="border" />
      </div>
    )
  if (isErrorCompany) return <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>Failed to load company information.</div>
  if (invoiceError) return <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>Failed to load invoice.</div>
  if (!viewInvoice) return null

  const totalPaid = viewInvoice.total_paid || 0
  const totalDue = viewInvoice.invoice_sub_pay_amount - totalPaid

  const subTotal = viewInvoice.item_sub_pay_amount || 0

  const actualGlobalDiscount =
    viewInvoice.global_discount_type === 'percent' ? (subTotal * viewInvoice.global_discount) / 100 : viewInvoice.global_discount || 0

  // Responsive styles
  const styles = {
    container: {
      padding: '12px',
      background: '#f9f9f9',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    invoiceWrapper: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '16px',
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 0 20px rgba(0,0,0,0.1)',
      fontSize: '14px',
      color: '#333',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '30px',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '20px',
    },
    companyInfo: {
      flex: '1 1 280px',
      minWidth: '250px',
    },
    invoiceInfo: {
      textAlign: 'right',
      minWidth: '200px',
      flex: '1 1 250px',
    },
    statusBadge: {
      marginTop: '10px',
      padding: '6px 12px',
      border: '1px solid',
      fontWeight: 600,
      borderRadius: '4px',
      display: 'inline-block',
      minWidth: '70px',
      textAlign: 'center',
      userSelect: 'none',
    },
    tableContainer: {
      overflowX: 'auto',
      marginBottom: '20px',
      WebkitOverflowScrolling: 'touch',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px',
      color: '#333',
      minWidth: '500px',
    },
    buttonContainer: {
      maxWidth: '900px',
      margin: '20px auto',
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      padding: '0 12px',
    },
    termsList: {
      paddingLeft: '20px',
      marginTop: '4px',
      lineHeight: 1.4,
    },
  }

  // Media query styles using CSS-in-JS with style tags
  const responsiveCSS = `
    @media (max-width: 768px) {
      .invoice-header {
        flex-direction: column !important;
      }
      .invoice-info {
        text-align: left !important;
      }
      .invoice-table th,
      .invoice-table td {
        padding: 8px !important;
        font-size: 12px !important;
      }
      .company-logo {
        width: 100px !important;
      }
      .status-badge {
        display: inline-block !important;
        margin-top: 10px !important;
      }
    }
    
    @media print {
      .no-print {
        display: none !important;
      }
      .invoice-wrapper {
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      body {
        padding: 0 !important;
        margin: 0 !important;
      }
    }
    
    @media (max-width: 480px) {
      .invoice-table th,
      .invoice-table td {
        padding: 6px !important;
        font-size: 11px !important;
      }
      .invoice-wrapper {
        padding: 12px !important;
      }
      .company-name {
        font-size: 16px !important;
      }
      .invoice-title {
        font-size: 20px !important;
      }
      .button-container button {
        font-size: 12px !important;
        padding: 6px 12px !important;
      }
    }
  `

  return (
    <div style={styles.container}>
      <style>{responsiveCSS}</style>
      
      <div className="invoice-wrapper" ref={printRef} style={styles.invoiceWrapper}>
        {/* Header */}
        <div className="invoice-header" style={styles.header}>
          <div style={styles.companyInfo}>
            <img 
              src={company?.settings?.logo_url} 
              alt="Company Logo" 
              className="company-logo"
              style={{ width: '140px', marginBottom: '10px', maxWidth: '100%', height: 'auto' }} 
            />
            <div
              className="company-name"
              style={{
                fontWeight: 'bold',
                fontSize: '18px',
                marginBottom: '8px',
                color: '#000',
              }}>
              {company?.settings?.company_name}
            </div>
            <div
              style={{
                whiteSpace: 'pre-line',
                marginBottom: '4px',
                lineHeight: 1.3,
                color: '#333',
                wordBreak: 'break-word',
              }}>
              {company?.settings?.company_address_1}
              <br />
              {company?.settings?.company_address_2}
            </div>
            <div style={{ color: '#333' }}>{company?.settings?.phone}</div>
          </div>

          <div className="invoice-info" style={styles.invoiceInfo}>
            <h3 className="invoice-title" style={{ marginBottom: '10px', fontSize: '24px' }}>INVOICE</h3>
            <div>
              Invoice Number: <strong>{viewInvoice.id}</strong>
            </div>
            <div>Invoice Date: {formatDate(viewInvoice.invoice_date)}</div>
            <div>Due Date: {formatDate(viewInvoice.due_date)}</div>
            <div
              className="status-badge"
              style={{
                ...styles.statusBadge,
                borderColor: viewInvoice.status === 'paid' ? '#16a34a' : '#b91c1c',
                color: viewInvoice.status === 'paid' ? '#16a34a' : '#b91c1c',
              }}>
              {viewInvoice.status.toLowerCase() === 'pending' ? 'UNPAID' : viewInvoice.status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div style={{ marginBottom: '30px', color: '#000', wordBreak: 'break-word' }}>
          <strong>Billed To</strong>
          <br />
          {viewInvoice.client_name}
          <br />
          {viewInvoice.client_email}
          <br />
          {viewInvoice.client_company_name}
        </div>

        {/* Invoice Table */}
        <div className="table-container" style={styles.tableContainer}>
          <table className="invoice-table" style={styles.table}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '10px' }}>Description</th>
                <th style={{ padding: '10px', minWidth: '70px', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '10px', minWidth: '100px', textAlign: 'right' }}>Unit Price (LKR)</th>
                <th style={{ padding: '10px', minWidth: '80px', textAlign: 'right' }}>Discount</th>
                <th style={{ padding: '10px', minWidth: '100px', textAlign: 'right' }}>Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {viewInvoice.details.map((d, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>
                      <div>
                        <div>
                          <strong>{d.package_name || d.product_name || d.item_name || `Service #${d.software_service_id}`}</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                          {[d.package_name, d.product_name, d.item_name]
                            .filter((name, index, arr) => name && arr.indexOf(name) === index)
                            .filter((name) => name !== (d.package_name || d.product_name || d.item_name))
                            .join(' • ')}
                        </div>
                        {d.description && <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>{d.description}</div>}
                      </div>
                    </td>{' '}
                  <td style={{ padding: '10px', textAlign: 'center' }}>1</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(d.amount)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(d.discount)}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(d.sub_pay_amount)}</td>
                </tr>
              ))}

              {/* Subtotal */}
              <tr>
                <td colSpan="3" />
                <td style={{ padding: '10px', fontWeight: 600, textAlign: 'right' }}>Sub Total</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(viewInvoice.item_sub_pay_amount)}</td>
              </tr>

              {/* Discount */}
              {viewInvoice?.global_discount > 0 && (
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <td colSpan="3" />
                  <td style={{ padding: '8px', fontWeight: '600', textAlign: 'right' }}>
                    {viewInvoice.global_discount_type === 'percent' ? `Discount (${viewInvoice.global_discount}%)` : 'Discount'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(actualGlobalDiscount)}</td>
                </tr>
              )}

              {/* Total */}
              <tr>
                <td colSpan="3" />
                <td style={{ padding: '10px', fontWeight: 700, textAlign: 'right' }}>Total</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(viewInvoice.invoice_sub_pay_amount)}</td>
              </tr>

              {/* Paid */}
              <tr>
                <td colSpan="3" />
                <td style={{ padding: '10px', textAlign: 'right' }}>Total Paid</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(totalPaid)}</td>
              </tr>

              {/* Due */}
              {totalDue > 0 && (
                <tr>
                  <td colSpan="3" />
                  <td style={{ padding: '10px', fontWeight: 600, textAlign: 'right' }}>Total Due</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>{formatCurrency(totalDue)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Terms */}
        <div style={{ fontSize: '12px', color: '#444' }}>
          <div>Thank you for your business.</div>
          <div style={{ marginTop: '10px' }}>
            <strong>Terms and Conditions</strong>
            <ol style={styles.termsList}>
              {termsLoading && <li>Loading terms...</li>}
              {termsError && <li>Failed to load terms.</li>}
              {!termsLoading && !termsError && terms.map((t, i) => <li key={i}>{t}</li>)}
            </ol>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="no-print button-container" style={styles.buttonContainer}>
        <Button variant="primary" onClick={handlePrint}>
          🖨️ Print Invoice
        </Button>
        <Button variant="success" onClick={handleDownloadPdf} disabled={isDownloading}>
          {isDownloading ? (
            <>
              <Spinner as="span" animation="border" size="sm" /> Downloading...
            </>
          ) : (
            '📥 Download PDF'
          )}
        </Button>
      </div>
    </div>
  )
}

export default InvoicePage