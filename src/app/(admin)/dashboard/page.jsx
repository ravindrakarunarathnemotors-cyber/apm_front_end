'use client';

import React, { useState } from "react";
import { 
  Card, Col, Row, Table, Badge, 
  Form, Button 
} from "react-bootstrap";
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import withAuthorization from '@/hoc/withAuthorization';
import { useRouter } from "next/navigation"; 
import { before, chain, head } from "lodash";
import { Tally1 } from "lucide-react";
import { combineReducers } from "@reduxjs/toolkit";
import { off } from "process";

const Dashboard = () => {
   const router = useRouter(); 
  const [activeDepartment, setActiveDepartment] = useState(null);

const departments = [
    { name: "CRM", route: "/crm" },
    { name: "Mechanical", route: "/mechanical" },
    { name: "Wash", route: "/wash" },
    { name: "Detailing", route: "/detailing" },
    { name: "HRM" },
    { name: "Accounts" },
    { name: "Administration" },
    { name: "Logistic & Stock Transport" },
    { name: "Contact Center" },
  ];

  const handleDepartmentClick = (dept) => {
    if (dept.route) {
      router.push(dept.route);
      return;
    }
    setActiveDepartment(activeDepartment === dept.name ? null : dept.name);
  };

  return (
    <div className="container-fluid px-2 px-sm-3 px-md-4 py-3 bg-premium min-vh-100">
      <style>{`
        .bg-premium { background: #f8fafc; }
        .bg-card { background: #ffffff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); }
        .table-custom th { background-color: #f1f5f9; font-size: 0.8rem; text-transform: uppercase; color: #475569; white-space: nowrap; }
        .table-custom td { font-size: 0.875rem; white-space: nowrap; }
        .section-title { font-size: 0.95rem; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }

        /* --- 5 COLUMNS PER ROW IN DESKTOP VIEW --- */
        @media (min-width: 992px) {
          .col-lg-2-4 {
            flex: 0 0 auto;
            width: 20%;
          }
        }

        /* --- LARGE DEPARTMENT BUTTONS --- */
        .dept-card-container {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.05);
          padding: 16px;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }

        @media (min-width: 768px) {
          .dept-card-container {
            padding: 20px;
          }
        }

        .dept-btn-lg {
          width: 100%;
          min-height: 52px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02);
          padding: 8px 12px;
          line-height: 1.2;
        }

        .dept-btn-lg:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 18px rgba(0,0,0,0.08);
          background: #ffffff;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .dept-btn-lg.active-dept {
          background: #6366f1;
          color: #ffffff;
          border-color: #6366f1;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }

        /* Responsive text tweaks */
        @media (max-width: 576px) {
          .company-title {
            font-size: 1rem;
          }
          .dept-btn-lg {
            font-size: 0.8rem;
            min-height: 48px;
          }
        }
      `}</style>

      {/* --- HEADER: COMPANY LOGO & SYSTEM STATS --- */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 p-3 bg-card shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-primary text-white p-2 rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 45, height: 45 }}>
            <IconifyIcon icon="solar:garage-bold" className="fs-3" />
          </div>
          <div>
            <h5 className="mb-0 fw-bold text-dark company-title">Karunaratne Motors Auto Zone (Pvt) LTD</h5>
            <small className="text-muted fw-semibold">ERP Management System</small>
          </div>
        </div>
        <div className="text-start text-md-end w-100 w-md-auto border-top border-md-0 pt-2 pt-md-0">
          <Badge bg="success" className="px-3 py-2 fs-6 rounded-pill shadow-sm d-inline-block">
            Todays Online Employees: 18
          </Badge>
          <div className="small text-muted mt-1 fw-bold">Thursday | Date: 01/10/2026</div>
        </div>
      </div>

      {/* --- DEPARTMENT BUTTON CARDS SECTION (FULLY RESPONSIVE GRID) --- */}
      <div className="dept-card-container mb-4">
        <div className="d-flex align-items-center mb-3">
          <IconifyIcon icon="solar:widget-add-bold-duotone" className="me-2 text-primary fs-4" />
          <span className="section-title">Select Department</span>
        </div>
        
      <Row className="g-2 g-md-3">
  {departments.map((dept) => (
    <Col key={dept.name} className="col-12 col-sm-6 col-md-4 col-lg-2-4">
      <Button
        onClick={() => handleDepartmentClick(dept)}
        className={`dept-btn-lg ${activeDepartment === dept.name ? "active-dept" : ""}`}
      >
        {dept.name}
      </Button>
    </Col>
  ))}
</Row>
      </div>

      {/* --- REPORT OVERVIEW & JOB REPORTS --- */}
      <Row className="g-3 g-md-4 mb-4">
        <Col lg={8}>
          <Card className="bg-card shadow-sm h-100 border-0">
            <Card.Header className="bg-white border-0 pt-3 pt-md-4 px-3 px-md-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span className="section-title">
                <IconifyIcon icon="solar:document-text-bold-duotone" className="me-2 text-primary fs-4" />
                Job Report Overview {activeDepartment ? `(${activeDepartment})` : "(All Departments)"}
              </span>
              <Button variant="outline-secondary" size="sm" className="rounded-pill px-3 ms-auto ms-sm-0">
                Toggle Hide/Show
              </Button>
            </Card.Header>
            <Card.Body className="p-3 p-md-4">
              <Table responsive bordered hover className="table-custom align-middle mb-0">
                <thead>
                  <tr>
                    <th>Periods</th>
                    <th>Total Jobs</th>
                    <th>Finished Jobs</th>
                    <th>Ongoing Jobs</th>
                    <th>Warranty Repair</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="fw-bold">Today</td>
                    <td>12</td>
                    <td>8</td>
                    <td>3</td>
                    <td>1</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Last Week</td>
                    <td>84</td>
                    <td>75</td>
                    <td>6</td>
                    <td>3</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Last Month</td>
                    <td>340</td>
                    <td>315</td>
                    <td>18</td>
                    <td>7</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* --- APPOINTMENTS OVERVIEW --- */}
        <Col lg={4}>
          <Card className="bg-card shadow-sm h-100 border-0">
            <Card.Header className="bg-white border-0 pt-3 pt-md-4 px-3 px-md-4 d-flex justify-content-between align-items-center">
              <span className="section-title">
                <IconifyIcon icon="solar:calendar-bold-duotone" className="me-2 text-warning fs-4" />
                Appointments Overview
              </span>
            </Card.Header>
            <Card.Body className="p-3 p-md-4">
              <div className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between align-items-center p-2 p-md-3 rounded-3 border bg-light">
                  <span className="fw-semibold small-responsive">Today</span>
                  <Badge bg="primary" className="px-3 py-2 rounded-pill">5 Nos.</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center p-2 p-md-3 rounded-3 border bg-light">
                  <span className="fw-semibold small-responsive">Tomorrow</span>
                  <Badge bg="info" className="px-3 py-2 rounded-pill">8 Nos.</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center p-2 p-md-3 rounded-3 border bg-light">
                  <span className="fw-semibold small-responsive">Day after Tomorrow</span>
                  <Badge bg="secondary" className="px-3 py-2 rounded-pill">3 Nos.</Badge>
                </div>
              </div>
              <Button variant="link" className="w-100 text-center mt-3 p-0 text-decoration-none fw-bold text-primary">
                See more appointments <IconifyIcon icon="solar:arrow-right-linear" />
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* --- CUSTOMERS & REPEATED CUSTOMERS --- */}
      <Row className="g-3 g-md-4 mb-4">
        <Col lg={6}>
          <Card className="bg-card shadow-sm h-100 border-0">
            <Card.Header className="bg-white border-0 pt-3 pt-md-4 px-3 px-md-4">
              <span className="section-title">
                <IconifyIcon icon="solar:user-plus-bold-duotone" className="me-2 text-success fs-4" />
                New Customer Registration
              </span>
            </Card.Header>
            <Card.Body className="p-3 p-md-4">
              <Table responsive bordered hover className="table-custom mb-0">
                <thead>
                  <tr>
                    <th>Periods</th>
                    <th>Nos. of Customers</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Today</td><td>4</td></tr>
                  <tr><td>Last Week</td><td>28</td></tr>
                  <tr><td>Last Month</td><td>110</td></tr>
                  <tr><td>Last Three Months</td><td>320</td></tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="bg-card shadow-sm h-100 border-0">
            <Card.Header className="bg-white border-0 pt-3 pt-md-4 px-3 px-md-4">
              <span className="section-title">
                <IconifyIcon icon="solar:users-group-two-rounded-bold-duotone" className="me-2 text-danger fs-4" />
                Repeated Customers
              </span>
            </Card.Header>
            <Card.Body className="p-3 p-md-4">
              <Table responsive bordered hover className="table-custom mb-2">
                <thead>
                  <tr>
                    <th>Periods</th>
                    <th>Customer / Vehicle Number</th>
                    <th>Repeated Nos.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Last Week</td><td>WP CAD-1234</td><td>2</td></tr>
                  <tr><td>Last Month</td><td>WP BCD-5678</td><td>4</td></tr>
                  <tr><td>Last Three Months</td><td>EP KAZ-9900</td><td>5</td></tr>
                </tbody>
              </Table>
              <small className="text-muted fst-italic">
                * Note: Customers who came to service center more than 1 time (Warranty Repair is not included).
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* --- JOB RANGE VALUE --- */}
      <Row className="g-3 g-md-4 mb-4">
        <Col lg={12}>
          <Card className="bg-card shadow-sm border-0">
            <Card.Header className="bg-white border-0 pt-3 pt-md-4 px-3 px-md-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <span className="section-title">
                <IconifyIcon icon="solar:tag-price-bold-duotone" className="me-2 text-info fs-4" />
                Job Range Value Breakdown
              </span>
              <Form.Select style={{ maxWidth: '220px' }} size="sm" className="rounded-3 fw-semibold w-100 w-sm-auto">
                <option value="">Select Department</option>
                <option>Department: Mechanical</option>
                <option>Department: Wash</option>
                <option>Department: Detailing</option>
              </Form.Select>
            </Card.Header>
            <Card.Body className="p-3 p-md-4">
              <Row className="g-2 g-md-3">
                {[
                  { range: "Rs.0.00 to Rs.4,999", count: 15 },
                  { range: "Rs.5,000 to Rs.9,999", count: 22 },
                  { range: "Rs.10,000 to Rs.14,999", count: 18 },
                  { range: "Rs.15,000 to Rs.19,999", count: 9 },
                  { range: "Rs.20,000 to Rs.24,999", count: 12 },
                  { range: "Rs.25,000 to Rs.29,999", count: 7 },
                  { range: "Rs.30,000 to Rs.34,999", count: 5 },
                  { range: "Rs.35,000 to Rs.39,999", count: 4 },
                  { range: "Rs.40,000 to Rs.49,999", count: 3 },
                  { range: "Rs.50,000 to Rs.59,999", count: 6 },
                  { range: "Rs.60,000 to Rs.69,000", count: 2 },
                  { range: "Rs.70,000 to Rs.79,999", count: 1 },
                  { range: "Rs.80,000 to Rs.89,000", count: 0 },
                  { range: "Rs.90,000 to Rs.99,000", count: 1 },
                  { range: "Rs.100,000 to Rs.124,999", count: 3 },
                  { range: "Rs.125,000 to Rs.149,000", count: 1 },
                  { range: "Rs.150,000 to Rs.174,999", count: 0 },
                  { range: "Rs.175,000 to Rs.199,000", count: 1 },
                  { range: "Rs.200,000 to Rs.249,000", count: 2 },
                  { range: "Rs.250,000 to Rs.299,000", count: 0 },
                  { range: "Rs.300,000 to Rs.349,999", count: 0 },
                  { range: "Rs.350,000 to Rs.399,999", count: 0 },
                  { range: "Rs.400,000 to Rs.449,000", count: 1 },
                  { range: "Rs.450,000 to Rs.499,999", count: 0 },
                  { range: "Rs.500,000 to Rs.599,000", count: 0 },
                  { range: "Rs.600,000 to Rs.699,999", count: 0 },
                  { range: "Rs.700,000 to Rs.799,999", count: 0 },
                  { range: "Rs.800,000 to Rs.899,000", count: 0 },
                  { range: "Rs.900,000 to Rs.999,999", count: 0 },
                  { range: "Rs.1M to Rs.1.499M", count: 0 },
                  { range: "Rs.1.5M to Rs.1.999M", count: 0 },
                  { range: "Over 2M", count: 0 },
                ].map((item, idx) => (
                  <Col key={idx} className="col-12 col-sm-6 col-md-4 col-lg-3">
                    <div className="p-2 border rounded-3 d-flex justify-content-between align-items-center bg-light">
                      <small className="fw-semibold text-secondary">{item.range}</small>
                      <Badge bg="dark" className="rounded-pill ms-2">{item.count}</Badge>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};



export default withAuthorization(Dashboard);