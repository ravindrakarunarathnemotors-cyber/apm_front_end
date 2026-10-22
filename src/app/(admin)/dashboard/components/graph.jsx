import React from "react";
import ReactApexChart from "react-apexcharts";
import { useGetDeliveryStatsQuery } from "@/store/features/apiSlice";
import { Spinner } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";

const DeliverySuccessRateChart = ({ clientId }) => {
  const { data, isLoading, isError } = useGetDeliveryStatsQuery(clientId, { skip: !clientId });

  if (isLoading)
    return (
      <div className="d-flex justify-content-center mt-3">
        <Spinner animation="border" variant="primary" />
      </div>
    );

  if (isError) return <p className="text-danger text-center">Failed to load data</p>;

  const { delivered = 0, failed = 0 } = data || {};
  const totalAttempts = delivered + failed;
  const successRate = totalAttempts > 0 ? parseFloat(((delivered / totalAttempts) * 100).toFixed(2)) : 0;

  const pieChartOpts = {
    chart: { type: "radialBar" },
    labels: ["Success Rate"],
    colors: ["#22c55e"], // Corrected from "color" to "colors"
    plotOptions: {
      radialBar: {
        hollow: { size: "60%" },
        dataLabels: {
          name: { fontSize: "16px" },
          value: { fontSize: "20px", formatter: (val) => `${val}%` },
        },
      },
    },
  };

  return (
    <ComponentContainerCard title="Delivery Success Rate">
      <ReactApexChart options={pieChartOpts} series={[successRate]} type="radialBar" height={360} />
    </ComponentContainerCard>
  );
};

export default DeliverySuccessRateChart;
