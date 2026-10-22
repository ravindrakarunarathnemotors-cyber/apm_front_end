'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditSize = ({ show, onClose, size, onSave }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Active');

  useEffect(() => {
    if (size) {
      setName(size.name);
      setStatus(size.status);
    }
  }, [size]);

  const handleSubmit = () => {
    onSave({ ...size, name, status });
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
         <Modal.Title>Edit Size {size?.id ? `#${size.id}` : ''}</Modal.Title>
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

export default EditSize;
