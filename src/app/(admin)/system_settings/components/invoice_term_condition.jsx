'use client'

import { useState, useEffect } from 'react'
import { Button, FormLabel, FormControl, Tabs, Tab } from 'react-bootstrap'
import { Icon } from '@iconify/react'
import { useSaveInvoiceTermsMutation, useGetInvoiceTermsQuery } from '@/store/features/apiSlice'
import Swal from 'sweetalert2'
import ComponentContainerCard from '@/components/ComponentContainerCard'

const InvoiceTermsSettings = () => {
  const [invoiceTerms, setInvoiceTerms] = useState('')
  const [quotationTerms, setQuotationTerms] = useState('')
  const [hasInvoiceChanges, setHasInvoiceChanges] = useState(false)
  const [hasQuotationChanges, setHasQuotationChanges] = useState(false)

  const { data } = useGetInvoiceTermsQuery()
  const [saveInvoiceTerms, { isLoading: isSavingInvoice }] = useSaveInvoiceTermsMutation()

  // Load saved terms
  useEffect(() => {
    if (data) {
      if (data?.terms?.length) {
        setInvoiceTerms(data.terms.join('\n'))
        setHasInvoiceChanges(false)
      }
      if (data?.quotation_terms?.length) {
        setQuotationTerms(data.quotation_terms.join('\n'))
        setHasQuotationChanges(false)
      }
    }
  }, [data])

  const handleInvoiceTermsChange = (e) => {
    setInvoiceTerms(e.target.value)
    setHasInvoiceChanges(true)
  }

  const handleQuotationTermsChange = (e) => {
    setQuotationTerms(e.target.value)
    setHasQuotationChanges(true)
  }

  const handleUpdateInvoiceTerms = async () => {
    if (!invoiceTerms.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Empty Terms',
        text: 'Please enter at least one invoice term before saving.',
      })
      return
    }

    const termsArray = invoiceTerms
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      await saveInvoiceTerms({ terms: termsArray }).unwrap()
      setHasInvoiceChanges(false)

      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Invoice Terms & Conditions updated successfully.',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error) {
      console.error('Failed to save invoice terms', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.data?.message || 'Failed to save invoice terms. Please try again.',
      })
    }
  }

  const handleUpdateQuotationTerms = async () => {
    if (!quotationTerms.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Empty Terms',
        text: 'Please enter at least one quotation term before saving.',
      })
      return
    }

    const termsArray = quotationTerms
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      // If your API supports quotation terms, send with a different key
      await saveInvoiceTerms({ quotation_terms: termsArray }).unwrap()
      setHasQuotationChanges(false)

      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Quotation Terms & Conditions updated successfully.',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error) {
      console.error('Failed to save quotation terms', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.data?.message || 'Failed to save quotation terms. Please try again.',
      })
    }
  }

  return (
    <ComponentContainerCard title="Terms & Conditions Settings">
      <Tabs defaultActiveKey="invoice" className="mb-3">
        <Tab eventKey="invoice" title="Invoice Terms">
          <FormLabel>Enter Invoice Terms & Conditions</FormLabel>
          <FormControl
            as="textarea"
            rows={6}
            value={invoiceTerms}
            placeholder="Each new line will appear as a bullet point on invoices"
            onChange={handleInvoiceTermsChange}
          />

          <small className="text-muted d-block mt-2">Each new line will be saved and shown as a bullet point on invoices.</small>

          {/* Preview */}
          {invoiceTerms && (
            <div className="mt-3">
              <strong>Preview:</strong>
              <ul className="mt-2">
                {invoiceTerms
                  .split('\n')
                  .filter(Boolean)
                  .map((term, index) => (
                    <li key={index}>{term}</li>
                  ))}
              </ul>
            </div>
          )}

          {/* Save Button */}
          <div className="d-flex justify-content-end mt-4">
            <Button 
              variant="primary" 
              onClick={handleUpdateInvoiceTerms} 
              disabled={isSavingInvoice || !hasInvoiceChanges}
            >
              <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
              {isSavingInvoice ? 'Saving...' : 'Save Invoice Terms'}
            </Button>
          </div>
        </Tab>

        <Tab eventKey="quotation" title="Quotation Terms">
          <FormLabel>Enter Quotation Terms & Conditions</FormLabel>
          <FormControl
            as="textarea"
            rows={6}
            value={quotationTerms}
            placeholder="Each new line will appear as a bullet point on quotations"
            onChange={handleQuotationTermsChange}
          />

          <small className="text-muted d-block mt-2">Each new line will be saved and shown as a bullet point on quotations.</small>

          {/* Preview */}
          {quotationTerms && (
            <div className="mt-3">
              <strong>Preview:</strong>
              <ul className="mt-2">
                {quotationTerms
                  .split('\n')
                  .filter(Boolean)
                  .map((term, index) => (
                    <li key={index}>{term}</li>
                  ))}
              </ul>
            </div>
          )}

          {/* Save Button */}
          <div className="d-flex justify-content-end mt-4">
            <Button 
              variant="primary" 
              onClick={handleUpdateQuotationTerms} 
              disabled={isSavingInvoice || !hasQuotationChanges}
            >
              <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
              {isSavingInvoice ? 'Saving...' : 'Save Quotation Terms'}
            </Button>
          </div>
        </Tab>
      </Tabs>
    </ComponentContainerCard>
  )
}

export default InvoiceTermsSettings