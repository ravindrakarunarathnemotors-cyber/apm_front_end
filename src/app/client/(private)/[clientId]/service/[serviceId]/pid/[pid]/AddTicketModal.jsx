'use client'

import React, { useState } from 'react'
import { Modal, Button, Form, Alert, Row, Col } from 'react-bootstrap'
import axios from 'axios'
import Swal from 'sweetalert2'

export default function AddTicketModal({ show, onHide, clientId, serviceId, onTicketAdded }) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const [form, setForm] = useState({
    department: '',
    priority: '',
    subject: '',
    comment: '',
    systemUrl: '',
  })
  const [attachmentFile, setAttachmentFile] = useState(null) // File state
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Validate file type and size
  const validateFile = (file) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    const maxSize = 2 * 1024 * 1024 // 2MB in bytes

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only PDF, JPG, and PNG are allowed.')
      return false
    }
    if (file.size > maxSize) {
      setError('File size exceeds 2MB limit.')
      return false
    }
    setError('')
    return true
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && validateFile(file)) {
      setAttachmentFile(file)
    } else {
      setAttachmentFile(null)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setForm({
      department: '',
      priority: '',
      subject: '',
      comment: '',
      systemUrl: '',
    })
    setAttachmentFile(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      let attachmentUrl = null
      let originalAttachmentName = null

      /* ===============================
       1. HANDLE ATTACHMENT (OPTIONAL)
    =============================== */
      if (attachmentFile) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
        const maxSize = 2 * 1024 * 1024 // 2MB

        if (!allowedTypes.includes(attachmentFile.type)) {
          throw new Error('Only PDF, JPG, PNG files are allowed')
        }

        if (attachmentFile.size > maxSize) {
          throw new Error('File size must be less than 2MB')
        }

        originalAttachmentName = attachmentFile.name

        // Format date-time
        const now = new Date()
        const pad = (n) => (n < 10 ? '0' + n : n)
        const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(
          now.getMinutes(),
        )}-${pad(now.getSeconds())}`

        // Rename file
        const newFileName = `${formattedDate}-technical_ticket-${attachmentFile.name}`
        const renamedFile = new File([attachmentFile], newFileName, {
          type: attachmentFile.type,
        })

        const uploadFormData = new FormData()
        uploadFormData.append('file', renamedFile)

        const uploadRes = await axios.post(`${baseUrl}/file/upload`, uploadFormData, { headers: { 'Content-Type': 'multipart/form-data' } })

        if (uploadRes.data?.fileUrl) {
          const url = new URL(uploadRes.data.fileUrl)
          url.hostname = 'd8y1.c2.e2-9.dev'
          attachmentUrl = url.toString()
        }
      }

      /* ===============================
       2. SUBMIT TICKET DATA
    =============================== */
      const res = await axios.post(`${baseUrl}/client-view/add-tickets`, {
        clientId,
        serviceId,
        department: form.department,
        priority: form.priority,
        subject: form.subject,
        comment: form.comment,
        systemUrl: form.systemUrl,
        attachmentUrl,
        originalAttachmentName,
      })

      /* ===============================
       3. SUCCESS SWEET ALERT
    =============================== */
      await Swal.fire({
        icon: 'success',
        title: `<span style="color:#0a008a;font-weight:700;">Ticket Created #${res.data.ticketId}</span>`,

        text: `Ticket #${res.data.ticketId} has been created successfully.`,
        background: '#ffffff',
        confirmButtonColor: '#0a008a',
      })

      /* ===============================
       4. RESET + CLOSE
    =============================== */
      resetForm()
      if (onTicketAdded) onTicketAdded()
      onHide()
    } catch (err) {
      console.error(err)

      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: err.message || 'Failed to add ticket. Please try again.',
        confirmButtonColor: '#dc2626',
      })

      setError(err.message || 'Failed to add ticket. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const styles = {
    header: {
      backgroundColor: '#0156b8',
      borderBottom: '1px solid #e5e7eb',
      padding: '20px 24px',
    },
    title: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    body: {
      backgroundColor: '#f3f4f6',
      padding: '24px',
    },
    label: {
      fontSize: '0.75rem',
      fontWeight: '700',
      color: '#4b5563',
      marginBottom: '8px',
      textTransform: 'uppercase',
    },
    input: {
      borderRadius: '8px',
      padding: '12px',
      border: '1px solid #d1d5db',
      fontSize: '0.9rem',
      backgroundColor: '#ffffff',
      color: '#1f2937',
    },
    subjectInput: {
      borderRadius: '8px',
      padding: '14px 12px',
      border: 'none',
      fontSize: '0.9rem',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    footer: {
      backgroundColor: '#f3f4f6',
      borderTop: 'none',
      padding: '10px 24px 24px 24px',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    btnCreate: {
      backgroundColor: '#0156b8',
      border: 'none',
      padding: '10px 28px',
      borderRadius: '8px',
      fontWeight: '600',
      color: '#ffffff',
    },
    btnCancel: {
      color: '#4b5563',
      fontWeight: '600',
      textDecoration: 'none',
      marginRight: '15px',
    },
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg" contentClassName="border-0 shadow-lg">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton style={styles.header}>
          <Modal.Title style={styles.title}>Create New Ticket</Modal.Title>
        </Modal.Header>

        <Modal.Body style={styles.body}>
          {error && (
            <Alert variant="danger" className="rounded-3">
              {error}
            </Alert>
          )}

          <Row className="mb-4">
            <Col md={6}>
              <Form.Group>
                <Form.Label style={styles.label}>Department</Form.Label>
                <Form.Select name="department" value={form.department} onChange={handleChange} required style={styles.input}>
                  <option value="" disabled>
                    Select Department
                  </option>
                  <option value="technical">Technical</option>
                  <option value="sales">Sales</option>
                  <option value="billing">Billing</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label style={styles.label}>Priority Level</Form.Label>
                <Form.Select name="priority" value={form.priority} onChange={handleChange} required style={styles.input}>
                  <option value="" disabled>
                    Select Priority
                  </option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="immediate">Immediate</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Label style={styles.label}>Subject</Form.Label>
            <Form.Control
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              required
              placeholder="Technical Issue: Unable to Access System / Service"
              style={styles.subjectInput}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label style={styles.label}>Description / Comment</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              name="comment"
              value={form.comment}
              onChange={handleChange}
              placeholder="Describe your issue here..."
              style={styles.input}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group>
                {/* Internal style tag for file selector button */}
                <style>{`
      .white-file-input::file-selector-button {
        background-color: #ffffff !important;
        color: #000000 !important; /* Make button text black for contrast */
        border: none !important;
        border-right: 1px solid #d1d5db !important;
        padding: 18px 16px !important;
        margin-right: 8px !important; /* Slight margin to separate button and file name */
        font-weight: 600 !important;
        height: 100% !important;
        cursor: pointer !important;
      }
      /* Hide the default filename text so we can customize spacing */
      .white-file-input::-webkit-file-upload-button {
        -webkit-appearance: none;
      }
    `}</style>

                <Form.Label style={{ ...styles.label, marginBottom: '6px' }}>ATTACHMENT (PDF, JPG, PNG; MAX 2MB)</Form.Label>

                <Form.Control
                  type="file"
                  accept=".pdf, image/jpeg, image/png"
                  onChange={handleFileChange}
                  className="white-file-input"
                  style={{
                    ...styles.input,
                    backgroundColor: '#ffffff',
                    padding: '0 8px', // left and right padding to keep spacing inside input
                    height: '45px', // consistent height with other inputs
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label style={styles.label}>System URL</Form.Label>
                <Form.Control
                  type="url"
                  name="systemUrl"
                  value={form.systemUrl}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  style={styles.input}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer style={styles.footer}>
          <Button variant="link" onClick={onHide} style={styles.btnCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} style={styles.btnCreate}>
            {isLoading ? 'Creating...' : 'Create Ticket'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
