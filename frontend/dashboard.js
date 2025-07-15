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
      y: { beginAtZero: true }
    },
    plugins: {
      legend: { position: 'top' }
    }
  }
});

// 🍩 Dynamic Inventory Pie Chart (3D)
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
      accessibility: { point: { valueSuffix: '' } },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          depth: 35,
          dataLabels: {
            enabled: true,
            format: '{point.name}: {point.y}'
          }
        }
      },
      series: [{
        name: 'Quantity',
        data: chartData.labels.map((label, i) => [label, chartData.data[i]])
      }]
    });
  } catch (err) {
    console.error("Failed to load 3D pie chart data", err);
  }
}

// 📈 KPI Update
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
    console.error("Failed to fetch KPIs:", err);
  }
}

// 🏭 Manufacturing Process Tracker
let processData = {
  cutting: { start: null, end: null, timer: null },
  assembly: { start: null, end: null, timer: null },
  packaging: { start: null, end: null, timer: null }
};

function formatTime(date) {
  return date.toLocaleTimeString();
}

function calcDuration(start, end) {
  const ms = end - start;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}m ${sec}s`;
}

function updateCard(id, start, end) {
  const card = document.getElementById(id);
  card.querySelector('.start-time').textContent = `Start: ${formatTime(start)}`;
  card.querySelector('.end-time').textContent = `End: ${formatTime(end)}`;
  card.querySelector('.duration').textContent = `Duration: ${calcDuration(start, end)}`;
}

function showGap(currentId, prevId) {
  const prevEnd = processData[prevId].end;
  const currStart = processData[currentId].start;
  const gap = calcDuration(prevEnd, currStart);
  const card = document.getElementById(currentId);
  const gapEl = card.querySelector('.gap');
  if (gapEl) gapEl.textContent = `Gap: ${gap}`;
}

function startCountdown(id, duration) {
  const card = document.getElementById(id);
  const countdownEl = card.querySelector('.countdown');
  let remaining = duration / 1000;

  countdownEl.textContent = `⏳ Timer: ${formatCountdown(remaining)}`;
  processData[id].timer = setInterval(() => {
    remaining--;
    countdownEl.textContent = `⏳ Timer: ${formatCountdown(remaining)}`;
    if (remaining <= 0) clearInterval(processData[id].timer);
  }, 1000);
}

function formatCountdown(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function startProcess(id) {
  const duration = 5000; // 1 hour = 3600000ms (can reduce to 5000 for testing)
  const startTime = new Date();
  processData[id].start = startTime;

  const card = document.getElementById(id);
  card.classList.add("active");

  startCountdown(id, duration);

  setTimeout(() => {
    const endTime = new Date();
    processData[id].end = endTime;
    updateCard(id, startTime, endTime);
    card.classList.remove("active");

    // Proceed to next
    if (id === "cutting") {
      startNext("assembly", "cutting");
    } else if (id === "assembly") {
      startNext("packaging", "assembly");
    }
  }, duration);
}

function startNext(currentId, prevId) {
  processData[currentId].start = new Date();
  showGap(currentId, prevId);
  startProcess(currentId);
}

// 🔃 Initial Load
window.addEventListener("DOMContentLoaded", () => {
  updateDashboardKPIs();
  loadDashboardChart();

  // Start button for process
  const btn = document.getElementById("startBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      if (!processData.cutting.start) {
        startProcess("cutting");
      }
    });
  }
});
