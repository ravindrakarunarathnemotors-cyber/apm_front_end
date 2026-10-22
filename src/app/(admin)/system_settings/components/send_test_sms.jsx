"use client";

import { useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, FormLabel, FormControl } from "react-bootstrap";

const TestSms = ({ show, handleClose, smsConfig }) => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTestSMS = async () => {
    if (!mobileNumber || !message) {
      alert("Please enter both Mobile Number and Message.");
      return;
    }

    if (!smsConfig.sms_user_id || !smsConfig.sms_api_key || !smsConfig.sms_sender_id || !smsConfig.sms_api_endpoint) {
      alert("Missing SMS configuration. Please check your settings.");
      return;
    }

    setIsLoading(true);

    try {
      // Construct the API URL as a string directly
      const apiUrl = `${smsConfig.sms_api_endpoint}/v1/send/?user_id=${smsConfig.sms_user_id}&api_key=${smsConfig.sms_api_key}&sender_id=${smsConfig.sms_sender_id}&message=${encodeURIComponent(
        message
      )}&recipient_contact_no=${mobileNumber}`;

      console.log("Sending request to:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to send SMS: ${response.statusText}`);
      }

      const result = await response.text(); // Get response as a string
      console.log("API Response:", result);

      alert(`Test SMS Sent Successfully!\nTo: ${mobileNumber}\nMessage: ${message}\nResponse: ${result}`);

    } catch (error) {
      console.error("Error sending test SMS:", error);
      alert("Error sending SMS. Please try again.");
    } finally {
      setIsLoading(false);
      handleClose(); // Close modal after sending
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <ModalHeader closeButton>
        <h6 className="modal-title m-0">Send Test SMS</h6>
      </ModalHeader>

      <ModalBody>
        <div className="mb-3">
          <FormLabel htmlFor="mobileNumber">Mobile Number</FormLabel>
          <FormControl
            type="text"
            id="mobileNumber"
            placeholder="Enter Mobile Number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <FormLabel htmlFor="message">Message</FormLabel>
          <FormControl
            as="textarea"
            rows={3}
            id="message"
            placeholder="Enter your SMS message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleTestSMS} disabled={isLoading}>
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default TestSms;
