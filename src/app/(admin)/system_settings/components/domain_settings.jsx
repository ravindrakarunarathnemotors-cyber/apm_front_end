'use client'

import { useState } from 'react'
import { Button, Modal, Form } from 'react-bootstrap'
import { Icon } from '@iconify/react'
import Swal from 'sweetalert2'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import { useGetAllDomainsQuery, useAddDomainSettingsMutation, useUpdateDomainSettingsMutation } from '@/store/features/apiSlice'

const DomainSettings = () => {
  // ===== Pagination =====
  const [page, setPage] = useState(1)
  const limit = 10 // items per page

  // Fetch all domains with pagination
  const { data, isLoading, refetch } = useGetAllDomainsQuery({ page, limit })
  const domains = data?.data || []
  const totalPages = data?.pagination?.totalPages || 1

  // ===== Mutations =====
  const [addDomain, { isLoading: isAdding }] = useAddDomainSettingsMutation()
  const [updateDomain, { isLoading: isUpdating }] = useUpdateDomainSettingsMutation()

  // ===== Add Domain Form State =====
  const [domainName, setDomainName] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [cloudflareToken, setCloudflareToken] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // ===== Edit Modal State =====
  const [showModal, setShowModal] = useState(false)
  const [editDomainId, setEditDomainId] = useState(null)
  const [editDomainName, setEditDomainName] = useState('')
  const [editZoneId, setEditZoneId] = useState('')
  const [editCloudflareToken, setEditCloudflareToken] = useState('')
  const [editHasChanges, setEditHasChanges] = useState(false)

  // ===== Handlers =====
  const resetAddForm = () => {
    setDomainName('')
    setZoneId('')
    setCloudflareToken('')
    setHasChanges(false)
  }

  const handleAddChange = () => {
    if (!hasChanges) setHasChanges(true)
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!domainName || !zoneId || !cloudflareToken) {
      return Swal.fire({
        icon: 'warning',
        title: 'All fields are required',
        text: 'Please fill in all domain configuration fields.',
      })
    }

    try {
      await addDomain({
        domain_name: domainName.trim(),
        zone_id: zoneId.trim(),
        cloudflare_api_token: cloudflareToken.trim(),
      }).unwrap()

      await refetch()
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Domain added successfully',
        timer: 2000,
        showConfirmButton: false,
      })
      resetAddForm()
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.data?.message || 'Failed to add domain',
      })
    }
  }

  // Open edit modal without prefilling sensitive fields
  const handleEditClick = (domain) => {
    setEditDomainId(domain.id)
    setEditDomainName(domain.domain_name || '')
    setEditZoneId('') // leave blank
    setEditCloudflareToken('') // leave blank
    setEditHasChanges(false)
    setShowModal(true)
  }

  const handleEditChange = () => {
    if (!editHasChanges) setEditHasChanges(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editDomainName || !editZoneId || !editCloudflareToken) {
      return Swal.fire({
        icon: 'warning',
        title: 'All fields are required',
        text: 'Please fill in all domain configuration fields.',
      })
    }

    try {
      await updateDomain({
        id: editDomainId,
        domain_name: editDomainName.trim(),
        zone_id: editZoneId.trim(),
        cloudflare_api_token: editCloudflareToken.trim(),
      }).unwrap()

      await refetch()
      setShowModal(false)
      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Domain updated successfully',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.data?.message || 'Failed to update domain',
      })
    }
  }

  if (isLoading) return <p>Loading domains...</p>

  return (
    <ComponentContainerCard title="Domain Configuration">
      {/* ===== Add Domain Form ===== */}
      <form onSubmit={handleAddSubmit}>
        <div className="mb-3">
          <label className="form-label">Domain Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter domain name"
            value={domainName}
            onChange={(e) => {
              setDomainName(e.target.value)
              handleAddChange()
            }}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Zone ID</label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter Cloudflare Zone ID"
            value={zoneId}
            onChange={(e) => {
              setZoneId(e.target.value)
              handleAddChange()
            }}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Cloudflare API Token</label>
          <input
            type="password"
            className="form-control"
            placeholder="Enter Cloudflare API Token"
            value={cloudflareToken}
            onChange={(e) => {
              setCloudflareToken(e.target.value)
              handleAddChange()
            }}
            required
          />
        </div>

        <div className="d-flex justify-content-end mt-3">
          <Button variant="primary" type="submit" disabled={!hasChanges || isAdding}>
            <Icon icon="mdi:content-save" width={20} height={20} className="me-1" />
            {isAdding ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>

      {/* ===== Domain List Table ===== */}
      <div className="mt-5">
        <h5 className="mb-3 text-primary fw-bold">Domain List</h5>
        {domains.length === 0 ? (
          <div className="alert alert-info">No domains added yet.</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover table-striped align-middle shadow-sm rounded">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '25%' }}>Domain Name</th>
                    <th style={{ width: '25%' }}>Zone ID</th>
                    <th style={{ width: '25%' }}>Cloudflare Token</th>
                    <th style={{ width: '20%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((domain, index) => (
                    <tr key={domain.id}>
                      <td>{index + 1 + (page - 1) * limit}</td>
                      <td className="fw-semibold">{domain.domain_name}</td>
                      <td>{domain.zone_id || '-'}</td>
                      <td>
                        <span className="text-monospace">
                          {domain.cloudflare_api_token
                            ? domain.cloudflare_api_token.length > 8
                              ? `${domain.cloudflare_api_token.slice(0, 4)}****${domain.cloudflare_api_token.slice(-4)}`
                              : domain.cloudflare_api_token
                            : '-'}
                        </span>
                      </td>
                      <td>
                        <Button size="sm" variant="outline-primary" onClick={() => handleEditClick(domain)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ===== Pagination Controls ===== */}
            <div className="d-flex justify-content-between mt-3">
              <Button disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button disabled={page === totalPages} onClick={() => setPage((prev) => prev + 1)}>
                Next
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ===== Edit Modal ===== */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Domain</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Domain Name</Form.Label>
              <Form.Control
                type="text"
                value={editDomainName}
                onChange={(e) => {
                  setEditDomainName(e.target.value)
                  handleEditChange()
                }}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Zone ID</Form.Label>
              <Form.Control
                type="text"
                value={editZoneId}
                onChange={(e) => {
                  setEditZoneId(e.target.value)
                  handleEditChange()
                }}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Cloudflare API Token</Form.Label>
              <Form.Control
                type="text"
                value={editCloudflareToken}
                onChange={(e) => {
                  setEditCloudflareToken(e.target.value)
                  handleEditChange()
                }}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!editHasChanges || isUpdating}>
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </ComponentContainerCard>
  )
}

export default DomainSettings
