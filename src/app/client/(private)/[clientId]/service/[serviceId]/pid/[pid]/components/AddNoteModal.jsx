'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Form } from 'react-bootstrap'
import { useAddNoteMutation } from '@/store/features/apiSlice'
import Swal from 'sweetalert2'

const AddNoteModal = ({ show, onHide, ticketId, note, refetch }) => {
  const [noteText, setNoteText] = useState('')
  const [addNote] = useAddNoteMutation()

  // Prefill textarea with existing note when modal opens
  useEffect(() => {
    if (show) {
      setNoteText(note || '')
    }
  }, [show, note])

  const handleAddOrUpdateNote = async () => {
    if (!noteText.trim()) {
      Swal.fire({ icon: 'warning', title: 'Empty Note', text: 'Please type a note before submitting.' })
      return
    }

    try {
      await addNote({
        ticketId,
        note: noteText,
      }).unwrap()

      Swal.fire({
        icon: 'success',
        title: note ? 'Note Updated' : 'Note Added',
        timer: 1500,
        showConfirmButton: false,
      })

      setNoteText('')
      onHide()
      refetch() // refresh ticket data
    } catch (err) {
      console.error('Add/Update note failed:', err)
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not save note.' })
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{note ? 'Edit Internal Note' : 'Add Internal Note'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          as="textarea"
          rows={4}
          placeholder="Type internal note here..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <Button
          className="mt-3 w-100"
          onClick={handleAddOrUpdateNote}
          disabled={!noteText.trim()}
        >
          {note ? 'Update Note' : 'Add Note'}
        </Button>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default AddNoteModal
