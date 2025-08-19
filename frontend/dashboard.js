// 📊 Bar Chart: Production vs Planned
const barCtx = document.getElementById('barChart1');
new Chart(barCtx, {
  type: 'bar',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Units Produced',
        data: [240, 180, 320, 290, 170, 230],
        backgroundColor: '#3498db'
      },
      {
        label: 'Planned Units',
        data: [250, 200, 300, 310, 200, 250],
        backgroundColor: '#e67e22'
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true },
    },
    plugins: {
      legend: { position: 'top' }
    }
  }
});

// 🍩 Load Pie Chart Data
async function loadDashboardChart() {
  try {
    const res = await fetch("http://localhost:5000/api/items/chart-data");
    const chartData = await res.json();

    Highcharts.chart('pieChart3D', {
      chart: {
        type: 'pie',
        options3d: { enabled: true, alpha: 45 }
      },
      title: { text: '' },
      tooltip: { pointFormat: '{series.name}: <b>{point.y}</b>' },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          depth: 35,
          dataLabels: { enabled: true, format: '{point.name}: {point.y}' }
        }
      },
      series: [{
        name: 'Quantity',
        data: chartData.labels.map((label, i) => [label, chartData.data[i]])
      }]
    });
  } catch (err) {
    console.error("Failed to load 3D pie chart", err);
  }
}

// 📈 Update KPIs
async function updateDashboardKPIs() {
  try {
    const res = await fetch("http://localhost:5000/api/items");
    const items = await res.json();

    let totalValue = 0;
    let lowStockCount = 0;

    items.forEach(item => {
      totalValue += item.quantity * item.unitCost;
      if (item.quantity < item.reorderLevel) lowStockCount++;
    });

    const valueCard = document.querySelectorAll(".kpi-card")[0];
    valueCard.querySelector("p").textContent = `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    valueCard.querySelector("span").textContent = `Updated on ${new Date().toLocaleDateString()}`;

    const lowCard = document.querySelector(".kpi-card.low");
    lowCard.querySelector("p").textContent = lowStockCount;
    lowCard.querySelector("span").textContent = lowStockCount === 0 ? "All items in stock" : "Requires attention";

  } catch (err) {
    console.error("Failed to fetch KPI data", err);
  }
}


// 🔃 Initial Load + Button Events
window.addEventListener("DOMContentLoaded", () => {
  updateDashboardKPIs();
  loadDashboardChart();

  // Attach individual process start buttons

});
