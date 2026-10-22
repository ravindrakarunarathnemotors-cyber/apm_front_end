'use client';

import React, { useState } from 'react';
import { useGetParcelTrendsQuery } from '@/store/features/apiSlice';
import ReactApexChart from 'react-apexcharts';
import { Card, CardBody, CardHeader, CardTitle, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row, Spinner } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';


const ParcelTrendChart = ({client_id}) => {
  const [trendType, setTrendType] = useState('daily'); 

 

  // Fetch Data from RTK Query
  const { data, isLoading } = useGetParcelTrendsQuery({ type: trendType ,client_id});

  // Prepare data for chart
  const chartData = data?.trends || [];

  const chartOptions = {
    chart: {
      height: 280,
      type: 'line',
      toolbar: { show: false }
    },
    colors: ['#22c55e', '#EF4444'], // Green for delivered, Red for failed
    stroke: {
      show: true,
      curve: 'smooth',
      width: [3, 3]
    },
    xaxis: {
      categories: chartData.map((item) => item.label) || [],
      title: { text: trendType === 'daily' ? 'Days' : 'Weeks' }
    },
    yaxis: {
      title: { text: 'Parcels' }
    },
    grid: { strokeDashArray: 3 },
    legend: { show: true }
  };

  const chartSeries = [
    {
      name: 'Delivered Parcels',
      data: chartData.map((item) => item.delivered) || []
    },
    {
      name: 'Return Parcels',
      data: chartData.map((item) => item.failed) || []
    }
  ];

  return (
    <Card>
      <CardHeader>
        <Row className="align-items-center">
          <Col>
            <CardTitle as="h4">Parcel Trend Over Time</CardTitle>
          </Col>
          <Col xs="auto">
            <Dropdown>
              <DropdownToggle className="btn btn-light icons-center">
                <i className="icofont-calendar fs-5 me-1" />
                {trendType === 'daily' ? 'Daily' : 'Weekly'}
                <IconifyIcon icon="la:angle-down" className="ms-1" />
              </DropdownToggle>
              <DropdownMenu align="end">
                <DropdownItem onClick={() => setTrendType('daily')}>Daily</DropdownItem>
                <DropdownItem onClick={() => setTrendType('weekly')}>Weekly</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </Col>
        </Row>
      </CardHeader>
      <CardBody className="pt-0">
        {isLoading ? (
          <div className="d-flex justify-content-center">
            <Spinner animation="border" />
          </div>
        ) : (
          <ReactApexChart height={280} series={chartSeries} options={chartOptions} type="line" />
        )}
      </CardBody>
    </Card>
  );
};

export default ParcelTrendChart;
