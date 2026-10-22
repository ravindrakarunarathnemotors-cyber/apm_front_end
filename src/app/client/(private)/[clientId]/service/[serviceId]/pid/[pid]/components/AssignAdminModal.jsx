'use client'

import React, { useEffect, useState } from 'react'
import { Modal, Button } from 'react-bootstrap'
import Select from 'react-select'
import { useAssignAdminMutation, useLazySearchAdminsQuery } from '@/store/features/apiSlice'
import Swal from 'sweetalert2'

const AssignAdminModal = ({ show, onHide, ticketId, currentAdmin, refetch }) => {
  const [selectedAdmin, setSelectedAdmin] = useState(null)

  const [searchAdmins, { data = [], isFetching }] = useLazySearchAdminsQuery()
  const [assignAdmin, { isLoading }] = useAssignAdminMutation()

  // Load default admins
  useEffect(() => {
    if (show) {
      searchAdmins({ query: '', limit: 10 })
      setSelectedAdmin(null)
    }
  }, [show, searchAdmins])

  // Convert API data → react-select options
  const options = data.map((admin) => ({
    value: admin.id,
    label: `${admin.first_name} ${admin.last_name} (${admin.username}) - #${admin.id}`,
  }))

  const handleInputChange = (inputValue) => {
    searchAdmins({ query: inputValue, limit: 10 })
  }

  const handleAssign = async () => {
    if (!selectedAdmin) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Admin',
        text: 'Please select an admin',
      })
      return
    }

    try {
      await assignAdmin({
        ticketId,
        adminId: selectedAdmin.value,
      }).unwrap()

      Swal.fire({
        icon: 'success',
        title: 'Admin Assigned',
        timer: 1500,
        showConfirmButton: false,
      })

      onHide()
      refetch()
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: 'Could not assign admin',
      })
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Assign Admin</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Select
          placeholder="Type admin name, username or ID..."
          options={options}
          onInputChange={handleInputChange}
          onChange={setSelectedAdmin}
          isLoading={isFetching}
          isClearable
        />

        <Button className="mt-3 w-100" onClick={handleAssign} disabled={isLoading}>
          Assign
        </Button>
      </Modal.Body>
    </Modal>
  )
}

export default AssignAdminModal
