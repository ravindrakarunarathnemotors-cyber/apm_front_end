"use client";

import { useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, FormLabel, FormControl } from "react-bootstrap";

const TestMail = ({ show, handleClose }) => {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleTestEmail = () => {
    if (!email || !subject || !message) {
      alert("Please enter Email, Subject, and Message.");
      return;
    }

    alert(`Test Email Sent Successfully!\nTo: ${email}\nSubject: ${subject}\nMessage: ${message}`);
    
    // Here, you should replace with an actual API call to send an email
    // Example: sendTestEmailAPI({ email, subject, message });

    handleClose(); // Close modal after sending
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <ModalHeader closeButton>
        <h6 className="modal-title m-0">Send Test Email</h6>
      </ModalHeader>

      <ModalBody>
        {/* Email Address Input */}
        <div className="mb-3">
          <FormLabel htmlFor="email">Recipient Email</FormLabel>
          <FormControl
            type="email"
            id="email"
            placeholder="Enter recipient email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Subject Input */}
        <div className="mb-3">
          <FormLabel htmlFor="subject">Email Subject</FormLabel>
          <FormControl
            type="text"
            id="subject"
            placeholder="Enter email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Email Message Input */}
        <div className="mb-3">
          <FormLabel htmlFor="message">Email Message</FormLabel>
          <FormControl
            as="textarea"
            rows={3}
            id="message"
            placeholder="Enter your email message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleTestEmail}>
          Send
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default TestMail;
