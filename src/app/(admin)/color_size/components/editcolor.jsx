'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditColor = ({ show, onClose, color, onSave }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');

  useEffect(() => {
    if (color) {
      setName(color.color);
      setStatus(color.status);
    }
  }, [color]);

  const handleSubmit = () => {
    onSave({ ...color, name});
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
         <Modal.Title>Edit Color {color?.id ? `#${color.id}` : ''}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group controlId="formSizeName">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>
         
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditColor;
