import React, { useRef, useEffect, useState } from 'react'
import { Modal, Button, Spinner } from 'react-bootstrap'
import { useGetCompanyDetailsQuery } from '@/store/features/apiSlice'
import axios from 'axios'

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

const InvoiceModal = ({ viewingInvoice, handleCloseView }) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const [isDownloading, setIsDownloading] = React.useState(false)

  const printRef = useRef()
  const [company, setCompany] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  // term and condition fetch state
  const [terms, setTerms] = useState([])
  const [termsLoading, setTermsLoading] = useState(false)
  const [termsError, setTermsError] = useState(false)

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        setIsLoading(true)
        setIsError(false)

        const res = await fetch(`${baseUrl}/client-view/get-company-details`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        })

        if (!res.ok) throw new Error('Failed to fetch')

        const data = await res.json()
        setCompany(data)
      } catch (error) {
        console.error(error)
        setIsError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanyDetails()
  }, [])

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setTermsLoading(true)
        setTermsError(false)

        const res = await axios.get(`${baseUrl}/client-view/get-invoice-terms`) // no auth needed

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

  if (!viewingInvoice) return null

  // Compute totals
  const subTotal = viewingInvoice.details?.reduce((sum, d) => sum + Number(d.amount), 0) || 0
  const totalDiscount = viewingInvoice.details?.reduce((sum, d) => sum + Number(d.discount), 0) || 0
  const total = subTotal - totalDiscount
  const totalPaid = viewingInvoice.total_paid || 0
  const totalDue = total - totalPaid

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML
    const originalContents = document.body.innerHTML
    document.body.innerHTML = printContents
    window.print()
    document.body.innerHTML = originalContents
    window.location.reload() // 💣 brute-force reset
  }

  const handleDownloadPdf = async () => {
    if (!printRef.current) return

    try {
      setIsDownloading(true)

      const html2pdf = (await import('html2pdf.js')).default

      const opt = {
        margin: 10,
        filename: `Invoice-${viewingInvoice.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      }

      await html2pdf().set(opt).from(printRef.current).save()
    } catch (error) {
      console.error('PDF download failed', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const actualGlobalDiscount =
  viewingInvoice.global_discount_type === 'percent'
    ? (subTotal * viewingInvoice.global_discount) / 100
    : viewingInvoice.global_discount || 0



  return (
    <>
      {viewingInvoice && <div className="modal-blur-overlay"></div>}
      <Modal show={!!viewingInvoice} onHide={handleCloseView} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Invoice #{viewingInvoice.id}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div ref={printRef} style={{ padding: '10px', color: '#111' }}>
            {/* Company Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                {isLoading && <div>Loading company info...</div>}
                {!isLoading && isError && <div>Error loading company info</div>}

                {!isLoading && company?.settings && (
                  <>
                    {company.settings.logo_url ? (
                      <img src={company.settings.logo_url} alt="Company Logo" style={{ width: '150px', marginBottom: '10px' }} />
                    ) : (
                      <img src="/logo.png" alt="Company Logo" style={{ width: '120px', marginBottom: '10px' }} />
                    )}
                    <h4>{company.settings.company_name}</h4>
                    <div>{company.settings.company_address_1}</div>
                    <div>{company.settings.company_address_2}</div>
                    <div>{company.settings.phone}</div>
                  </>
                )}
              </div>

              {/* Invoice Info */}
              <div style={{ textAlign: 'right' }}>
                <h3>INVOICE</h3>
                <div>Invoice Number: {viewingInvoice.id}</div>
                <div>Invoice Date: {formatDate(viewingInvoice.invoice_date)}</div>

<div className="mb-2">
  {viewingInvoice?.status === 'paid' ? (
    <div>
      <strong>Paid Date:</strong> {formatDate(viewingInvoice.paid_date)}
    </div>
  ) : (
    <div>
      <strong>Due Date:</strong> {formatDate(viewingInvoice.due_date)}
    </div>
  )}
</div>                <div
                  style={{
                    marginTop: '10px',
                    padding: '6px 12px',
                    border: `1px solid ${
                      viewingInvoice.status === 'paid'
                        ? '#16a34a' // green
                        : viewingInvoice.status === 'pending'
                          ? '#f97316' // orange
                          : '#b91c1c' // red fallback
                    }`,
                    color: viewingInvoice.status === 'paid' ? '#16a34a' : viewingInvoice.status === 'pending' ? '#f97316' : '#b91c1c',
                    fontWeight: '600',
                    borderRadius: '4px',
                    display: 'inline-block',
                  }}>
                  {viewingInvoice.status.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div style={{ marginBottom: '20px' }}>
              <strong>Billed To</strong>
              <br />
              {viewingInvoice.client_name || 'N/A'}
              <br />
              {viewingInvoice.client_email || 'N/A'}
              <br />
              {viewingInvoice.client_company_name || 'N/A'}
            </div>

            {/* Invoice Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Description</th>
                  <th style={{ padding: '8px', width: '80px' }}>Quantity</th>
                  <th style={{ padding: '8px', width: '120px' }}>Unit Price (LKR)</th>
                  <th style={{ padding: '8px', width: '80px' }}>Discount (LKR)</th>
                  <th style={{ padding: '8px', width: '120px' }}>Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {viewingInvoice.details?.map((d, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #ccc' }}>
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

                    <td style={{ padding: '8px', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(d.amount)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(d.discount)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(d.sub_pay_amount)}</td>
                  </tr>
                ))}

                {/* Subtotal */}
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <td colSpan="3" />
                  <td style={{ padding: '8px', fontWeight: '600', textAlign: 'right' }}>Sub Total</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(viewingInvoice.item_sub_pay_amount)}</td>
                </tr>

                {/* Discount */}
                  {/* Discount */}
            {viewingInvoice?.global_discount > 0 && (
  <tr style={{ borderBottom: '1px solid #ccc' }}>
    <td colSpan="3" />
    <td style={{ padding: '8px', fontWeight: '600', textAlign: 'right' }}>
      {viewingInvoice.global_discount_type === 'percent'
        ? `Discount (${viewingInvoice.global_discount}%)`
        : 'Discount'}
    </td>
    <td style={{ padding: '8px', textAlign: 'right' }}>
      {formatCurrency(actualGlobalDiscount)}
    </td>
  </tr>
)}

                {/* Total */}
                <tr style={{ borderBottom: '1px solid #ccc', fontWeight: '700' }}>
                  <td colSpan="3" />
                  <td style={{ padding: '8px', textAlign: 'right' }}>Total</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(viewingInvoice.invoice_sub_pay_amount)}</td>
                </tr>

                {/* Total Paid */}
                <tr>
                  <td colSpan="3" />
                  <td style={{ padding: '8px', textAlign: 'right' }}>Total Paid</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(totalPaid)}</td>
                </tr>

                {/* Total Due */}
                {viewingInvoice.invoice_sub_pay_amount - totalPaid > 0 && (
                  <tr style={{ fontWeight: '600' }}>
                    <td colSpan="3" />
                    <td style={{ padding: '8px', textAlign: 'right' }}>Total Due</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(viewingInvoice.invoice_sub_pay_amount - totalPaid)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Notes and Terms */}
            <div style={{ marginTop: '24px', fontSize: '12px', color: '#444' }}>
              <div>Thank you for your business.</div>
              <div style={{ marginTop: '8px' }}>
                <strong>Terms and Conditions</strong>
                <br />
                {termsLoading && <span>Loading terms...</span>}
                {termsError && <span>Error loading terms</span>}
                {!termsLoading && !termsError && terms.length > 0 ? (
                  <ol style={{ paddingLeft: '20px', marginTop: '4px' }}>
                    {terms.map((term, idx) => (
                      <li key={idx}>{term}</li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer
          style={{
            borderTop: '1px solid #ccc',
            display: 'flex',
            justifyContent: 'space-between', // spread buttons
            gap: '8px',
          }}>
          {/* Close button on the left */}
          <Button variant="secondary" size="sm" onClick={handleCloseView}>
            Close
          </Button>

          {/* Right buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" size="sm" onClick={handlePrint}>
              Print Invoice
            </Button>

            <Button variant="success" size="sm" onClick={handleDownloadPdf} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                  Downloading...
                </>
              ) : (
                'Download'
              )}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
      <style jsx>{`
        .custom-modal-dialog .modal-content {
          background-color: rgba(61, 61, 61, 0.95);
          color: #fff;
          backdrop-filter: blur(8px);
          border: none;
          border-radius: 12px;
        }
        .modal-blur-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backdrop-filter: blur(2px);
          background-color: rgba(102, 101, 101, 0.34);
          z-index: 1040;
        }
      `}</style>
    </>
  )
}

export default InvoiceModal
