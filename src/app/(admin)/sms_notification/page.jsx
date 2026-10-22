'use client'

import ComponentContainerCard from '@/components/ComponentContainerCard'
import { Button, Col, FormLabel, FormControl, Row, Form, Card } from 'react-bootstrap'
import React, { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { useRefreshTokenMutation, useGetSMSActionsQuery, useAddSMSTemplateMutation } from '@/store/features/apiSlice'
import Swal from 'sweetalert2'
import SMSTemplates from './sms-template/page'
import { FaInfoCircle } from 'react-icons/fa'
import withAuthorization from '@/hoc/withAuthorization'

const SMSTemplate = () => {
  const user_id = sessionStorage.getItem('user_id')
  const role_id = sessionStorage.getItem('role_id')
  // const accessToken = sessionStorage.getItem('access_token') // ✅ Fix: Fetch access token
  const [selectedActionName, setSelectedActionName] = useState('')

  // Fetch SMS actions for dropdown
  const { data: smsActions, isLoading: isLoadingActions, refetch, error } = useGetSMSActionsQuery()

  // Mutation for adding SMS Template
  const [addSMSTemplate, { isLoading }] = useAddSMSTemplateMutation()
  const [refreshToken] = useRefreshTokenMutation()

  // Logout User
  const logoutUser = () => {
    sessionStorage.clear()
    localStorage.clear()
    window.location.href = '/auth/login'
  }

  // Function to refresh the access token
  const handleTokenRefresh = async () => {
    if (typeof window === 'undefined') return

    const refreshTokenStored = localStorage.getItem('refresh_token')
    if (!refreshTokenStored) {
      console.log('No refresh token found, logging out...')
      logoutUser()
      return false
    }

    try {
      console.log('Refreshing access token...')
      const response = await refreshToken(refreshTokenStored).unwrap()
      sessionStorage.setItem('access_token', response.access_token)
      console.log('Token refreshed successfully.')
      return true
    } catch (refreshError) {
      console.error('Error refreshing token:', refreshError)
      logoutUser()
      return false
    }
  }

  // Handle token expiration errors
  useEffect(() => {
    if (error?.status === 403 && error?.data?.message === 'Access token expired') {
      console.warn('Token expired. Attempting to refresh...')
      handleTokenRefresh().then((refreshed) => {
        if (refreshed) {
          refetch() // ✅ Retry fetching settings after refreshing token
        } else {
          Swal.fire({
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
            icon: 'warning',
            confirmButtonText: 'OK',
          }).then(() => logoutUser())
        }
      })
    }

    if (error?.status === 401) {
      Swal.fire({
        title: 'Unauthorized Access',
        text: 'Your session has expired. Please log in again.',
        icon: 'error',
        confirmButtonText: 'OK',
      }).then(() => logoutUser())
    }
  }, [error, refetch])

  // Form state
  const [formData, setFormData] = useState({
    sms: '',
    action: '',
    Admin: false,
    Client: false,
    status: '',
  })

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    if (name === 'action') {
      const selected = smsActions?.find((a) => a.id === parseInt(value))
      setSelectedActionName(selected?.name || '')
    }
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  // Submit form
  const handleSubmit = async () => {
 

    if (!formData.sms || !formData.action || !formData.status) {
      Swal.fire({ icon: 'warning', title: 'Missing Data', text: 'Please fill all required fields!' })
      return
    }

    try {
      await addSMSTemplate({
        user_id,
        role_id,
        sms: formData.sms,
        action: parseInt(formData.action, 10), // ✅ Ensure action is an integer
        Admin: formData.Admin ? 'Yes' : '',
        Client: formData.Client ? 'Yes' : '',
        status: formData.status,
      }).unwrap()

      Swal.fire({ icon: 'success', title: 'Added!', text: 'SMS Template added successfully', timer: 2000, showConfirmButton: false })

      // Reset form
      setFormData({ sms: '', action: '', Admin: false, Client: false, status: '' })
    } catch (err) {
      console.error('Error submitting form:', err)

      if (err?.status === 403 && err?.data?.message === 'Access token expired') {
        const refreshed = await handleTokenRefresh()
        if (refreshed) {
          console.log('Token refreshed. Retrying submission...')
          await handleSubmit() // ✅ Retry submission after token refresh
        } else {
          Swal.fire({
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
            icon: 'warning',
            confirmButtonText: 'OK',
          }).then(() => logoutUser())
        }
        return
      }

      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: err?.data?.message || 'Something went wrong. Please try again!',
      })
    }
  }

  const NoActionSelected = () => (
    <div
      style={{
        textAlign: 'center',
        color: '#bebebeff',
        fontSize: '0.9rem',
        padding: '30px 10px',
      }}>
      <FaInfoCircle size={40} style={{ marginBottom: 10, color: '#c2c2c2ff' }} />
      <div>Select an action to view dynamic variables.</div>
    </div>
  )

  const renderVariableBlock = () => {
    switch (selectedActionName) {
      case 'Payment Reminder':
        return (
          <Row>
            <Col md={6}>
              <FormLabel className="fw-bold text-view mb-1">Customer Details</FormLabel>
              <p className="text-muted small lh-1 mb-1">[name]</p>
              <p className="text-muted small lh-1 mb-1">[phone]</p>
              <p className="text-muted small lh-1 mb-1">[email]</p>

              <FormLabel className="fw-bold text-view mb-1">Invoice Information</FormLabel>
              <p className="text-muted small lh-1 mb-1">[Inv_Link]</p>
              <p className="text-muted small lh-1 mb-1">[Inv_ID]</p>
            </Col>
            <Col md={6}>
              <FormLabel className="fw-bold text-view mt-0">Branding Details</FormLabel>
              <p className="text-muted small lh-1 mb-1">[Hotline]</p>
              <p className="text-muted small lh-1 mb-1">[Webname]</p>
              <p className="text-muted small lh-1 mb-1">[company_email]</p>
            </Col>
          </Row>
        )

      case 'Send Invoice':
        return (
          <Row>
            <Col md={6}>
              <FormLabel className="fw-bold text-view mb-1">Customer Details</FormLabel>
              <p className="text-muted small lh-1 mb-1">[name]</p>
              <p className="text-muted small lh-1 mb-1">[phone]</p>
              <p className="text-muted small lh-1 mb-1">[email]</p>

              <FormLabel className="fw-bold text-view mb-1">Invoice Information</FormLabel>
              <p className="text-muted small lh-1 mb-1">[Inv_Link]</p>
              <p className="text-muted small lh-1 mb-1">[Inv_ID]</p>
            </Col>
            <Col md={6}>
              <FormLabel className="fw-bold text-view mt-0">Branding Details</FormLabel>
              <p className="text-muted small lh-1 mb-1">[Hotline]</p>
              <p className="text-muted small lh-1 mb-1">[Webname]</p>
              <p className="text-muted small lh-1 mb-1">[company_email]</p>
            </Col>
          </Row>
        )

      case 'Send Quotation':
        return (
          <Row>
            <Col md={6}>
              <FormLabel className="fw-bold text-view mb-1">Customer Details</FormLabel>
              <p className="text-muted small lh-1 mb-1">[name]</p>
              <p className="text-muted small lh-1 mb-1">[phone]</p>
              <p className="text-muted small lh-1 mb-1">[email]</p>

              <FormLabel className="fw-bold text-view mb-1">Quotation Information</FormLabel>
              <p className="text-muted small lh-1 mb-1">[Quo_Link]</p>
            </Col>
            <Col md={6}>
              <FormLabel className="fw-bold text-view mt-0">Branding Details</FormLabel>
              <p className="text-muted small lh-1 mb-1">[Hotline]</p>
              <p className="text-muted small lh-1 mb-1">[Webname]</p>
              <p className="text-muted small lh-1 mb-1">[company_email]</p>
            </Col>
          </Row>
        )

      case 'Servise Installation':
        return (
          <Row>
            <Col md={6}>
              <FormLabel className="fw-bold text-view mb-1">Customer Details</FormLabel>
              <p className="text-muted small lh-1 mb-1">[name]</p>
              <p className="text-muted small lh-1 mb-1">[phone]</p>
              <p className="text-muted small lh-1 mb-1">[email]</p>

              <FormLabel className="fw-bold text-view mb-1">Servise Details</FormLabel>
              <p className="text-muted small lh-1 mb-1">[Servise_Name]</p>
              <p className="text-muted small lh-1 mb-1">[Servise_ID]</p>
              <p className="text-muted small lh-1 mb-1">[Website_URLs]</p>
              <p className="text-muted small lh-1 mb-1">[Admin_URLs]</p>
              <p className="text-muted small lh-1 mb-1">[Default_Credentials]</p>
            </Col>
            <Col md={6}>
              <FormLabel className="fw-bold text-view mt-0">Branding Details</FormLabel>
              <p className="text-muted small lh-1 mb-1">[Hotline]</p>
              <p className="text-muted small lh-1 mb-1">[Webname]</p>
              <p className="text-muted small lh-1 mb-1">[company_email]</p>
            </Col>
          </Row>
        )

      default:
        return <NoActionSelected />
    }
  }

  return (
    <>
      <Row>
        {/* Left Side - SMS Form */}
        <Col md={8}>
          <Card className="p-3 h-100">
            <Form>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Create SMS Template</h5>
                <div className="d-flex align-items-center" style={{ gap: '8px' }}></div>
              </div>

              <Row className="mb-3">
                <Col md={6}>
                  <FormLabel>Action</FormLabel>
                  <Form.Select name="action" value={formData.action} onChange={handleChange}>
                    <option value="" disabled hidden>
                      Select
                    </option>
                    {isLoadingActions ? (
                      <option>Loading...</option>
                    ) : (
                      smsActions?.map((action) => (
                        <option key={action.id} value={action.id}>
                          {action.name}
                        </option>
                      ))
                    )}
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <FormLabel>Status</FormLabel>
                  <Form.Select name="status" value={formData.status} onChange={handleChange}>
                    <option value="" disabled hidden>
                      Select
                    </option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={12}>
                  <FormLabel htmlFor="sms">SMS</FormLabel>
                  <FormControl
                    as="textarea"
                    rows={3}
                    id="sms"
                    name="sms"
                    value={formData.sms}
                    onChange={handleChange}
                    placeholder="Enter SMS Template"
                  />

                  <small className="text-muted d-block mt-1">
                    {`Sample: "Hello [Name], your invoice [InvID] is ready. View it: [InvLink]. Need help? Contact: [Hotline]."`}
                  </small>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={4}>
                  <Form.Check type="checkbox" label="Admin" name="Admin" checked={formData.Admin} onChange={handleChange} />
                </Col>
                <Col md={4}>
                  <Form.Check type="checkbox" label="Client" name="Client" checked={formData.Client} onChange={handleChange} />
                </Col>
              </Row>

              <Row className="mt-4">
                <Col sm={12} className="text-end">
                  <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
                    <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
                    {isLoading ? 'Saving...' : 'Add'}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Right Side - Dynamic SMS Variables */}
        <Col md={4}>
          <Card className="p-3 border-0 shadow-sm h-100">
            <Card.Body className="p-2">{renderVariableBlock()}</Card.Body>
          </Card>
        </Col>
      </Row>

      <SMSTemplates />
    </>
  )
}

// export default SMSTemplate
export default withAuthorization(SMSTemplate);
