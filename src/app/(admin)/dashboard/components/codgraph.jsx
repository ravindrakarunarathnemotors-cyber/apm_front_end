import React from "react";
import { useGetCODCollectionQuery } from "@/store/features/apiSlice";
import { Spinner } from "react-bootstrap";
import ReactApexChart from "react-apexcharts";
import ComponentContainerCard from "@/components/ComponentContainerCard";
import { useLayoutContext } from '@/context/useLayoutContext';

const CODCollectionChart = ({ clientId }) => {
  const { data, isLoading, isError } = useGetCODCollectionQuery();


  

  const collected = data?.collected || 0;
  const pending = data?.pending || 0;

  const columnChartOpts = {
    chart: { type: "bar", toolbar: { show: false } },
    xaxis: { categories: ["Collected", "Pending"] },
    yaxis: { title: { text: "Amount (LKR)" } },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "50%", endingShape: "rounded" },
    },
    dataLabels: { enabled: false },
    colors: ["#28a745", "#ff9f43"], // Green for collected, Red for pending
  };

  return (
    <ComponentContainerCard title="COD Collection (Collected vs. Pending)">
      <DivWithThemeBG>
        <ReactApexChart options={columnChartOpts} series={[{ data: [collected, pending] }]} type="bar" height={360} />
      </DivWithThemeBG>
    </ComponentContainerCard>
  );
};

export default CODCollectionChart;

const DivWithThemeBG = ({
    children
  }) => {
    const {
      theme
    } = useLayoutContext();
    const getBgColor = () => theme === 'dark' ? '#00000030' : '#fefefe';
    return <div style={{
      backgroundColor: getBgColor()
    }}>{children}</div>;
  };
