'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Modal, Button, Spinner, Form, Badge, Alert, ProgressBar } from 'react-bootstrap'
import axios from 'axios'
import { BiCheckCircle, BiUpload, BiFile, BiDollar, BiX, BiErrorCircle, BiReceipt, BiInfoCircle } from 'react-icons/bi'
import Swal from 'sweetalert2'

export default function MarkPaidModal({ show, handleClose, invoiceId, clientId, serviceId, invoiceAmount = 0, onSuccess, paymentInstructions }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [amount, setAmount] = useState(invoiceAmount)
  const [note, setNote] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [parsedInstructions, setParsedInstructions] = useState(null)
  const fileInputRef = useRef(null)

  // Parse payment instructions when they change
  useEffect(() => {
    if (paymentInstructions) {
      try {
        // Try to parse if it's a JSON string
        if (typeof paymentInstructions === 'string') {
          // First, clean up the string if it has malformed JSON
          let cleanString = paymentInstructions;
          
          // Fix common JSON formatting issues
          cleanString = cleanString
            .replace(/"details:([^"]+)"/g, '"details":"$1"')
            .replace(/"notes:([^"]+)"/g, '"notes":"$1"')
            .replace(/\\n/g, '\\n');
          
          const parsed = JSON.parse(cleanString);
          
          // Handle case where parsing succeeded but structure might be different
          const instructions = {
            details: parsed.details || parsed.detail || parsed.account_details || '',
            notes: parsed.notes || parsed.note || parsed.instructions || ''
          };
          
          setParsedInstructions(instructions);
        } else {
          setParsedInstructions(paymentInstructions);
        }
      } catch (e) {
        console.error('Failed to parse payment instructions:', e);
        // If parsing fails, try to extract as plain text
        if (typeof paymentInstructions === 'string') {
          setParsedInstructions({
            details: paymentInstructions.replace(/[{}"\\]/g, '').replace(/details:|notes:/g, '\n'),
            notes: ''
          });
        } else {
          setParsedInstructions(null);
        }
      }
    } else {
      setParsedInstructions(null);
    }
  }, [paymentInstructions]);

  useEffect(() => {
    setAmount(invoiceAmount)
    setNote('')
    setReceiptFile(null)
    setFileName('')
    setError(null)
  }, [invoiceId, invoiceAmount, show])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setReceiptFile(file)
      setFileName(file.name)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setReceiptFile(file)
      setFileName(file.name)
    }
  }

  const handleRemoveFile = () => {
    setReceiptFile(null)
    setFileName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleMarkPaid = async () => {
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    if (!receiptFile) {
      setError('Please upload a receipt.')
      return
    }

    setIsProcessing(true)
    setError(null)

    let receiptUrl = null

    try {
      // 1️⃣ Upload receipt
      const now = new Date()
      const pad = (n) => (n < 10 ? '0' + n : n)
      const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate(),
      )}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`

      const newFileName = `${formattedDate}-client_${clientId}-invoice_${invoiceId}-${receiptFile.name}`
      const renamedFile = new File([receiptFile], newFileName, { type: receiptFile.type })

      const uploadForm = new FormData()
      uploadForm.append('file', renamedFile)

      const uploadRes = await axios.post(`${baseUrl}/file/upload`, uploadForm)
      if (!uploadRes.data?.fileUrl) throw new Error('Receipt upload failed')

      const url = new URL(uploadRes.data.fileUrl)
      url.hostname = 'd8y1.c2.e2-9.dev'
      receiptUrl = url.toString()

      // 2️⃣ Mark invoice as paid
      await axios.put(`${baseUrl}/client-view/invoices/${invoiceId}/markPaid`, {
        clientId,
        serviceId,
        amount,
        note,
        receipt: receiptUrl,
      })

      // 3️⃣ SweetAlert success
      await Swal.fire({
        icon: 'success',
        title: 'Payment Submitted',
        html: `<p>Invoice #${invoiceId} has been marked as <b>pending approval</b>.</p>`,
        confirmButtonText: 'OK',
      })

      onSuccess?.()
      handleClose()
    } catch (err) {
      console.error('Error marking invoice as paid:', err)
      const message = err.response?.data?.message || 'Failed to mark as paid. Please try again.'

      await Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        text: message,
        confirmButtonText: 'OK',
      })

      setError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Render payment instructions
  const renderPaymentInstructions = () => {
    if (!parsedInstructions) return null;

    const details = parsedInstructions.details || '';
    const notes = parsedInstructions.notes || '';

    // If both are empty, don't render anything
    if (!details && !notes) return null;

    return (
      <Alert variant="info" className="mb-3 p-3 border-0" style={{ backgroundColor: '#f0f7ff' }}>
        <div className="d-flex">
          <BiInfoCircle size={20} className="me-2 text-primary flex-shrink-0 mt-1" />
          <div>
            <small className="fw-bold text-primary d-block mb-2">Bank Transfer Instructions:</small>
            {details && (
              <div className="small text-dark mb-2" style={{ whiteSpace: 'pre-line' }}>
                {details.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
            {notes && (
              <>
                {details && <hr className="my-2" />}
                <div className="small text-muted fst-italic">
                  <BiInfoCircle size={12} className="me-1" />
                  {notes}
                </div>
              </>
            )}
          </div>
        </div>
      </Alert>
    );
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="md" backdrop="static" className="markpaid-modal-compact">
      <Modal.Header className="border-0 pb-1 px-3 pt-3">
        <div className="d-flex align-items-center w-100">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle p-2 me-3"
            style={{
              background: 'linear-gradient(135deg, #0156b8 0%, #0178d4 100%)',
              width: '40px',
              height: '40px',
            }}>
            <BiCheckCircle size={18} className="text-white" />
          </div>
          <div className="flex-grow-1">
            <Modal.Title className="h5 fw-bold mb-0">Mark Invoice Paid</Modal.Title>
            <div className="d-flex align-items-center text-muted small mt-1">
              <BiReceipt size={13} className="me-1" />
              <span>Invoice #{invoiceId}</span>
            </div>
          </div>
          <Button
            variant="link"
            onClick={handleClose}
            disabled={isProcessing}
            className="p-1 text-muted"
            style={{ minWidth: '32px', minHeight: '32px' }}>
            <BiX size={18} />
          </Button>
        </div>
      </Modal.Header>

      <Modal.Body className="px-3 py-2">
        {error && (
          <Alert variant="danger" className="d-flex align-items-center mb-2 p-2 small border-0">
            <BiErrorCircle size={15} className="me-2 flex-shrink-0" />
            <span>{error}</span>
          </Alert>
        )}

        {/* Payment Instructions Section */}
        {renderPaymentInstructions()}

        <div>
          {/* Amount Display */}
          <div className="mb-3">
            <Form.Label className="small fw-medium d-flex align-items-center mb-1">Amount to Pay</Form.Label>
            <div className="bg-light rounded p-2 border">
              <div className="d-flex justify-content-between align-items-center">
                <div className="h4 fw-bold mb-0">
                  LKR{' '}
                  {amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25">
                  Full Payment
                </Badge>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <Form.Label className="small fw-medium d-flex align-items-center">
                <BiFile size={15} className="me-1" style={{ color: '#0156b8' }} />
                Payment Notes
              </Form.Label>
              <span className={`text-xs ${note.length > 180 ? 'text-danger' : 'text-muted'}`}>{note.length}/200</span>
            </div>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Add payment reference or notes..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              disabled={isProcessing}
              className="small"
            />
          </div>

          {/* File Upload */}
          <div className="mb-2">
            <Form.Label className="small fw-medium d-flex align-items-center mb-1">
              <BiUpload size={15} className="me-1" style={{ color: '#0156b8' }} />
              Upload Receipt *
            </Form.Label>

            <div
              className={`rounded border bg-light position-relative ${dragActive ? 'border-primary' : 'border-dashed'} ${fileName ? 'border-success' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !fileName && fileInputRef.current?.click()}
              style={{
                cursor: 'pointer',
                minHeight: '52px',
                transition: 'all 0.2s ease',
                borderColor: fileName ? '#10b981' : dragActive ? '#0156b8' : undefined,
                backgroundColor: dragActive ? 'rgba(1, 86, 184, 0.05)' : fileName ? 'rgba(16, 185, 129, 0.05)' : undefined,
              }}>
              {!fileName ? (
                <div className="p-2">
                  <div className="d-flex align-items-center">
                    <BiUpload size={20} className="me-2" style={{ color: '#0156b8' }} />
                    <div className="text-start flex-grow-1">
                      <div className="small fw-medium">Click to upload receipt</div>
                      <div className="x-small text-muted">PDF, JPG, PNG up to 10MB</div>
                    </div>
                    <BiInfoCircle size={14} className="text-muted" />
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  <div className="d-flex align-items-center">
                    <div
                      className="d-flex align-items-center justify-content-center rounded p-2 me-2"
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        width: '40px',
                        height: '40px',
                      }}>
                      <BiFile size={16} className="text-success" />
                    </div>
                    <div className="flex-grow-1 text-truncate">
                      <div className="small fw-medium">{fileName}</div>
                      <div className="x-small text-success d-flex align-items-center">
                        <BiCheckCircle size={12} className="me-1" />
                        Ready to upload
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="rounded-circle p-1 ms-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveFile()
                      }}
                      disabled={isProcessing}
                      style={{ width: '30px', height: '30px' }}>
                      <BiX size={14} />
                    </Button>
                  </div>
                  <ProgressBar now={100} variant="success" className="mt-2" style={{ height: '4px' }} />
                </div>
              )}
              <Form.Control
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="d-none"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={isProcessing}
              />
            </div>

            <div className="mt-1">
              <Form.Text className="text-muted x-small">* Required for payment verification</Form.Text>
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-0 px-3 pb-3 pt-2">
        <div className="w-100 d-flex justify-content-end align-items-center gap-2">
          <Button variant="outline-secondary" onClick={handleClose} disabled={isProcessing} className="rounded-1 px-3 py-1 small">
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleMarkPaid}
            disabled={isProcessing || !receiptFile}
            className="rounded-1 px-4 py-1 small"
            style={{
              background: 'linear-gradient(135deg, #0156b8 0%, #0156b8 100%)',
              border: 'none',
              minWidth: '120px',
            }}>
            {isProcessing ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Processing
              </>
            ) : (
              <>
                <BiCheckCircle size={16} className="me-1" />
                Confirm Payment
              </>
            )}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}