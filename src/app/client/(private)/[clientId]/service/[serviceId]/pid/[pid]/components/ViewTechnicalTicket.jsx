'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Badge, Form, Stack } from 'react-bootstrap'
import { BiRefresh, BiListUl, BiUserCircle, BiLayer, BiPaperclip, BiTimeFive } from 'react-icons/bi'
import axios from 'axios'
import Swal from 'sweetalert2'

const ViewTechnicalTicket = ({ id = '523', onBack }) => {
  const [ticket, setTicket] = useState(null)
  const [isFetching, setIsFetching] = useState(true)

  const fetchTicket = async () => {
    try {
      setIsFetching(true)
      const res = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/client-view/tickets/${id}`)
      // If API returns { success: true, ticket: {...} }
      setTicket(res.data.ticket || null)
    } catch (err) {
      console.error('Failed to fetch ticket:', err)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch ticket data. Please try again.',
      })
    } finally {
      setIsFetching(false)
    }
  }

  // Safe fallback while loading or on error
  const safeTicket = ticket || {
    id: '',
    title: '',
    client_name: '',
    client_id: '',
    date: '',
    priority: '',
    department: '',
    status: '',
    updates: [],
  }

  const ticketData = safeTicket
  const updates = ticketData.updates || [] // ⚡ Safe default

  const messageInputRef = useRef(null)
  const [messageText, setMessageText] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [visibleCount, setVisibleCount] = useState(5)

  const updatesToShow = updates.slice(0, visibleCount)

  useEffect(() => {
    fetchTicket()
  }, [id])

  const DarkSwal = Swal.mixin({
    background: '#ffffff',
    confirmButtonColor: '#2563eb',

    didOpen: () => {
      const title = Swal.getTitle()
      const text = Swal.getHtmlContainer()

      if (title) title.style.color = '#6b6b6b'
      if (text) text.style.color = '#6b6b6b'
    },
  })

  const handleSendMessage = async (closeAfterSend = false) => {
    if (!messageText.trim() && !attachment) {
      await DarkSwal.fire({
        icon: 'warning',
        title: 'Empty Message!',
        text: 'Please type a message or attach a file before sending.',
        iconColor: '#facc15',
        confirmButtonColor: '#facc15',
      })
      messageInputRef.current?.focus()
      return
    }

    let attachmentUrl = null

    try {
      if (attachment) {
        const now = new Date()
        const pad = (n) => (n < 10 ? '0' + n : n)

        const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
          now.getMinutes(),
        )}:${pad(now.getSeconds())}`

        const newFileName = `${formattedDate}-technical_ticket-${attachment.name}`
        const renamedFile = new File([attachment], newFileName, {
          type: attachment.type,
        })

        const formData = new FormData()
        formData.append('file', renamedFile)

        const uploadRes = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        if (uploadRes.data?.fileUrl) {
          const url = new URL(uploadRes.data.fileUrl)
          url.hostname = 'd8y1.c2.e2-9.dev'
          attachmentUrl = url.toString()
        }
      }

      await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/client-view/tickets/${id}/sendMessage`, {
        message: messageText,
        file: attachmentUrl,
        // 👇 THIS is the important fix
        close: closeAfterSend ? ticketData.status?.toLowerCase() !== 'closed' : false,

        client_id: ticketData.client_id,
      })

      setMessageText('')
      setAttachment(null)

      await DarkSwal.fire({
        icon: 'success',
        title: 'Message Sent!',
        text: 'Your message has been successfully sent.',
        iconColor: '#22c55e',
        confirmButtonColor: '#22c55e',
        timer: 2000,
        showConfirmButton: false,
      })

      if (closeAfterSend && onBack) {
        onBack()
      } else {
        fetchTicket()
      }
    } catch (err) {
      console.error('Send message failed:', err)

      await DarkSwal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Failed to send message. Please try again!',
        iconColor: '#ef4444',
        confirmButtonColor: '#ef4444',
      })
    }
  }

  const handleLoadMore = () => setVisibleCount((prev) => prev + 5)

  const Loader = () => (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  )

  if (isFetching) return <Loader />

  return (
    <Container fluid className="p-4" style={{ backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-4">
        <Stack direction="horizontal" gap={3} className="mb-2 align-items-center">
          <div className="d-flex border rounded overflow-hidden small font-monospace">
            <span className="bg-secondary bg-opacity-25 px-2 py-1 fw-bold text-secondary">TICKET</span>
            <span className="bg-white px-2 py-1 fw-bold text-dark">#{ticketData.id}</span>
          </div>
          <h1 className="h3 mb-0 fw-extrabold text-dark" style={{ letterSpacing: '-0.03em' }}>
            {ticketData.title}
          </h1>
        </Stack>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <Stack direction="horizontal" gap={2}>
            <Badge
              pill
              bg="danger"
              className="bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-2 d-flex align-items-center gap-2 p-2"
              style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <span className="p-1 bg-danger rounded-circle"></span>
              {ticketData.priority}
            </Badge>

            <Badge
              pill
              bg="light"
              className="text-primary border px-3 py-2 d-flex align-items-center gap-2"
              style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <BiLayer /> {ticketData.department}
            </Badge>

            <Badge
              pill
              bg="warning"
              className="bg-opacity-10 text-warning-emphasis border border-warning border-opacity-25 px-3 py-2 d-flex align-items-center gap-2"
              style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <BiTimeFive /> {ticketData.status}
            </Badge>
          </Stack>

          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant="dark"
              className="shadow-sm fw-bold text-uppercase d-flex align-items-center gap-2"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.65rem',
                fontSize: '0.85rem',
                border: '1px solid #d1d5db',
                background: 'linear-gradient(145deg, #1e75cc, #03459b)',
              }}
              onClick={fetchTicket}>
              <BiRefresh /> Refresh
            </Button>

            <Button
              variant="dark"
              className="shadow-sm fw-bold text-uppercase d-flex align-items-center gap-2"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.65rem',
                fontSize: '0.85rem',
                border: '1px solid #d1d5db',
                background: 'linear-gradient(145deg, #1e75cc, #03459b)',
              }}
              onClick={onBack}>
              <BiListUl /> TICKET LIST
            </Button>
          </div>
        </div>
      </div>

      <Row>
        <Col lg={12}>
          {/* Message Input */}
          <Card className="border-0 shadow-sm rounded-4 mb-4">
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3">Message</h6>
              <Form.Control
                as="textarea"
                rows={4}
                ref={messageInputRef}
                className="bg-light border-0 rounded-3 mb-3 p-3"
                placeholder="Type your response..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />

              <div className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <div
                    className="border border-dashed rounded-3 p-2 d-flex align-items-center gap-2 flex-grow-1"
                    style={{ cursor: 'pointer', backgroundColor: '#f8f9fa' }}
                    onClick={() => document.getElementById('attachmentInput').click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) setAttachment(e.dataTransfer.files[0])
                    }}>
                    <BiPaperclip size={18} className="text-primary" />
                    <span className="text-muted">{attachment ? attachment.name : 'Click or drag file here'}</span>
                    {attachment && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="ms-auto"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAttachment(null)
                        }}>
                        Remove
                      </Button>
                    )}
                  </div>

                  <Form.Control
                    type="file"
                    id="attachmentInput"
                    className="d-none"
                    onChange={(e) => e.target.files[0] && setAttachment(e.target.files[0])}
                  />

                  <Stack direction="horizontal" gap={2}>
                    <Button variant="outline-primary" className="rounded-3 px-4 fw-bold" onClick={() => handleSendMessage(true)}>
                      {ticketData.status?.toLowerCase() === 'closed' ? 'Send & Open' : 'Send & Close'}
                    </Button>

                    <Button variant="primary" className="rounded-3 px-4 fw-bold" onClick={() => handleSendMessage(false)}>
                      Send Message
                    </Button>
                  </Stack>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Conversation History */}
          <Card className="border-0 shadow-sm rounded-4" style={{ maxHeight: '1200px', overflowY: 'auto' }}>
            <Card.Header className="bg-white border-bottom p-4" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <h6 className="fw-bold mb-0">Conversation History</h6>
            </Card.Header>

            <Card.Body className="p-4">
              {updates.length === 0 && <div className="text-center text-muted">No messages yet.</div>}

              {updatesToShow.map((update) => (
                <div key={update.id} className="mb-4">
                  {update.type === 'note' ? (
                    <div className="bg-warning bg-opacity-10 border border-warning border-dashed rounded-3 p-3 text-center mb-4">
                      <small className="text-warning-emphasis fw-bold text-uppercase">Internal Note: {update.message}</small>
                    </div>
                  ) : (
                    <div className="d-flex gap-3">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm"
                        style={{ width: '40px', height: '40px', background: update.type === 'admin' ? '#1e293b' : '#4f46e5', flexShrink: 0 }}>
                        <BiUserCircle style={{ width: '70%', height: '70%' }} />
                      </div>

                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between mb-1">
                          <span className={`fw-bold ${update.type === 'admin' ? 'text-primary' : ''}`}>
                            {update.type === 'client'
                              ? 'You'
                              : update.sender
                                ? update.sender
                                    .split(' ')
                                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                    .join(' ')
                                : 'Unknown'}
                          </span>

                          <small className="text-muted">
                            <BiTimeFive /> {update.time ? update.time.slice(0, 16) : '—'}
                          </small>
                        </div>

                        <div
                          className={`p-3 rounded-3 ${update.type === 'admin' ? 'bg-primary bg-opacity-10 border-start border-primary border-4' : 'bg-light border'}`}>
                          {update.message}
                          {update.file && (
                            <div className="mt-2">
                              <a href={update.file} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                📎 View File
                              </a>
                            </div>
                          )}
                          {update.sys_url && (
                            <div className="mt-1">
                              <a href={update.sys_url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                🔗 Open System Link
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {visibleCount < updates.length && (
                <div className="text-center">
                  <Button variant="outline-primary" size="sm" onClick={handleLoadMore}>
                    Load More
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default ViewTechnicalTicket
