'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import { useUpdateTicketDepartmentMutation } from '@/store/features/apiSlice'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'

const departments = [
  { id: 1, name: 'Technical' },
  { id: 2, name: 'Billing' },
  { id: 3, name: 'Sales' },
]

const SelectDepartmentModal = ({ show, onHide, ticketId, refetch, currentDepartment }) => {
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [updateTicketDepartment] = useUpdateTicketDepartmentMutation()
  const router = useRouter()

  useEffect(() => {
    if (show && currentDepartment) {
      const dept = departments.find((d) => d.name.toLowerCase() === currentDepartment.toLowerCase() || d.id === Number(currentDepartment))
      if (dept) setSelectedDepartment(dept.id.toString())
    }
  }, [show, currentDepartment])

  const handleDepartmentChange = async () => {
    if (!selectedDepartment) return

    const dept = departments.find((d) => d.id.toString() === selectedDepartment)
    if (!dept) {
      Swal.fire({ icon: 'error', title: 'Invalid Department' })
      return
    }

    try {
      await updateTicketDepartment({
        ticketId,
        department: dept.name,
      }).unwrap()

      Swal.fire({
        icon: 'success',
        title: 'Department Updated',
        timer: 1500,
        showConfirmButton: false,
      })

      refetch()
      setSelectedDepartment('')

      // Close modal
      onHide()

      // ✅ Option 1: Reload the page
      setTimeout(() => {
        window.location.reload()
      }, 200) // slight delay for smooth modal closing animation

      // ✅ Option 2 (if using Next.js App Router): refresh data without full reload
      // router.refresh()
    } catch (err) {
      console.error('Update failed:', err)
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: 'Could not update department',
      })
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Select Department</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Form.Select>

        <Button className="mt-3 w-100" onClick={handleDepartmentChange} disabled={!selectedDepartment || selectedDepartment === currentDepartment}>
          Update Department
        </Button>
      </Modal.Body>
    </Modal>
  )
}

export default SelectDepartmentModal
