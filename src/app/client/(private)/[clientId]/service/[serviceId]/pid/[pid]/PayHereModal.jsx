'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Spinner, Alert } from 'react-bootstrap'
import { BiCreditCard, BiErrorCircle, BiInfoCircle } from 'react-icons/bi'
import axios from 'axios'

export default function PayHereModal({ 
  show, 
  handleClose, 
  invoiceId, 
  clientId, 
  serviceId, 
  invoiceAmount = 0, 
  onSuccess,
  paymentMethod 
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [paymentData, setPaymentData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState({})

  // Get PayHere config
  const payhereConfig = paymentMethod?.api_array || {}
  const merchantId = payhereConfig.merchant_id
  const merchantSecret = payhereConfig.merchantSecret
  const isSandbox = payhereConfig.sandbox === true

  // Fetch user data
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      setUserData(user)
    } catch (e) {
      console.error('Error parsing user data:', e)
    }
  }, [])

  // Fetch hash when modal opens
  useEffect(() => {
    const fetchHash = async () => {
      if (show && invoiceAmount > 0 && merchantId && merchantSecret) {
        setIsLoading(true)
        setError(null)
        try {
          console.log('Requesting hash for amount:', invoiceAmount)
          
          const response = await axios.post(`${baseUrl}/client-view/calculate-payhere-hash`, {
            amount: invoiceAmount,
            merchantId: merchantId,
            merchantSecret: merchantSecret
          })
          
          console.log('Hash response:', response.data)
          setPaymentData(response.data)
        } catch (err) {
          console.error("Hash error:", err)
          setError(err.response?.data?.error || "Failed to initialize payment")
        } finally {
          setIsLoading(false)
        }
      }
    }

    if (show) {
      fetchHash()
    }
  }, [show, invoiceAmount, merchantId, merchantSecret, baseUrl])

  // Handle payment
  const handlePayment = (e) => {
    e.preventDefault()
    
    if (!paymentData) {
      setError("Payment not initialized")
      return
    }

    setIsProcessing(true)

    // PayHere Checkout URL
    const actionUrl = isSandbox 
      ? 'https://sandbox.payhere.lk/pay/checkout' 
      : 'https://www.payhere.lk/pay/checkout'

    // Create form
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = actionUrl

    // Parameters exactly as per PayHere docs
    const params = {
      merchant_id: merchantId,
      return_url: `${window.location.origin}/payment-success`,
      cancel_url: `${window.location.origin}/payment-cancelled`,
      notify_url: `${baseUrl}/client-view/payhere-notify`,
      first_name: userData.firstName || 'Customer',
      last_name: userData.lastName || '',
      email: userData.email || 'customer@example.com',
      phone: userData.phone || '0771234567',
      address: userData.address || 'No 1, Main Street',
      city: userData.city || 'Colombo',
      country: 'Sri Lanka',
      order_id: paymentData.orderId,
      items: `Invoice #${invoiceId}`,
      currency: 'LKR',
      amount: paymentData.amount,
      hash: paymentData.hash,
      custom_1: clientId?.toString() || '',
      custom_2: invoiceId?.toString() || ''
    }

    // Log params for debugging
    console.log('Submitting to PayHere:', {
      url: actionUrl,
      merchant_id: params.merchant_id,
      order_id: params.order_id,
      amount: params.amount,
      hash: params.hash
    })

    // Create hidden inputs
    Object.keys(params).forEach(key => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = params[key]
      form.appendChild(input)
    })

    // Submit form
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <img 
            src={paymentMethod?.logo || '/payhere-logo.png'} 
            alt="PayHere" 
            style={{ height: '25px', marginRight: '10px' }}
          />
          Pay Invoice #{invoiceId}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger">
            <BiErrorCircle className="me-2" />
            {error}
          </Alert>
        )}

        {isSandbox && (
          <Alert variant="warning">
            <BiInfoCircle className="me-2" />
            <strong>Sandbox Mode</strong> - Use test cards
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Initializing secure payment...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <h2>LKR {Number(invoiceAmount).toFixed(2)}</h2>
              <p className="text-muted">Invoice #{invoiceId}</p>
            </div>

            {isSandbox && (
              <div className="mb-3 p-3 bg-light rounded small">
                <strong>Test Cards:</strong><br />
                Visa: 4916217501611292<br />
                Master: 5307732125531191<br />
                Expiry: Any future date<br />
                CVV: Any 3 digits
              </div>
            )}

            <Button
              variant="success"
              size="lg"
              className="w-100"
              onClick={handlePayment}
              disabled={isProcessing || !paymentData}
            >
              {isProcessing ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Redirecting...
                </>
              ) : (
                'Pay with PayHere'
              )}
            </Button>
          </>
        )}
      </Modal.Body>
    </Modal>
  )
}