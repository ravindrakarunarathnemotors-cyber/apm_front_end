'use client';

import ReactApexChart from 'react-apexcharts';

const formatLKR = (amount) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
  }).format(amount);


const CompletionChart = ({ selectedUser }) => {
  const transactionLimit = Number(selectedUser?.transaction_fee_limit);
  const creditBalance = Number(selectedUser?.credit_balance);

  const percentage = transactionLimit > 0
    ? Math.min(100, ((creditBalance / transactionLimit) * 100).toFixed(2))
    : 0;

  const ChartOpts = {
    series: [percentage],
    chart: {
      height: 170,
      type: 'radialBar',
      offsetY: -10
    },
    colors: ['var(--bs-primary)'],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        track: {
          background: 'rgba(42, 118, 244, .18)'
        },
        dataLabels: {
          name: {
            fontSize: '13px',
            offsetY: 50
          },
          value: {
            offsetY: 5,
            fontSize: '15px',
            formatter: function (val) {
              return val + '%';
            }
          }
        }
      }
    },
    stroke: {
      dashArray: 2
    },
    labels: ['Credit Usage']
  };

  return (
    <div className="text-center">
      <ReactApexChart
        height={170}
        options={ChartOpts}
        series={ChartOpts.series}
        type="radialBar"
      />
      <h6 className="mt-2">
        <span className="badge bg-primary-subtle text-primary fs-14 px-3 py-2">
          <strong>{formatLKR(creditBalance)}</strong> / {formatLKR(transactionLimit)}


        </span>
      </h6>


    </div>
  );
};

export default CompletionChart;
