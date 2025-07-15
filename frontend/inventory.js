let pieChart;

// Load Real-Time Chart from Backend
async function updatePieChart() {
  try {
    const res = await fetch("http://localhost:5000/api/items/chart-data");
    const chartData = await res.json();

    const ctx = document.getElementById("inventoryPieChart");

    if (pieChart) {
      pieChart.data.labels = chartData.labels;
      pieChart.data.datasets[0].data = chartData.data;
      pieChart.update();
    } else {
      pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: chartData.labels,
          datasets: [{
            data: chartData.data,
            backgroundColor: ['#2980b9', '#27ae60', '#f1c40f', '#e67e22', '#9b59b6']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  } catch (err) {
    console.error("Error loading chart data:", err);
  }
}

// Search Function
const searchInput = document.getElementById("search");
searchInput.addEventListener("keyup", function () {
  const filter = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll("#inventoryTable tbody tr");
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(filter) ? "" : "none";
  });
});

// Form Submit Handler
const form = document.getElementById("addItemForm");
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const item = {
    itemCode: document.getElementById("itemCode").value,
    itemName: document.getElementById("itemName").value,
    category: document.getElementById("category").value,
    quantity: parseInt(document.getElementById("quantity").value),
    reorderLevel: parseInt(document.getElementById("reorderLevel").value),
    unitCost: parseFloat(document.getElementById("unitCost").value)
  };

  try {
    const res = await fetch('http://localhost:5000/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Server error");

    alert("✅ Item added successfully");
    form.reset();
    await loadInventory();
    await updatePieChart();
  } catch (err) {
    alert("Server error");
    console.error(err);
  }
});

// Inventory Table + KPI Load
async function loadInventory() {
  try {
    const res = await fetch('http://localhost:5000/api/items');
    const items = await res.json();

    const tableBody = document.querySelector("#inventoryTable tbody");
    const alertList = document.querySelector(".alerts ul");
    let lowStockCount = 0;
    let totalValue = 0;

    tableBody.innerHTML = "";
    alertList.innerHTML = "";

    items.forEach(item => {
      const isLow = item.quantity < item.reorderLevel;
      if (isLow) {
        lowStockCount++;
        const alertItem = document.createElement("li");
        alertItem.textContent = `${item.itemName} (${item.quantity} units, reorder level: ${item.reorderLevel})`;
        alertList.appendChild(alertItem);
      }

      totalValue += item.quantity * item.unitCost;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.itemCode}</td>
        <td>${item.itemName}</td>
        <td>${item.category}</td>
        <td class="${isLow ? 'low-stock' : ''}">${item.quantity}</td>
        <td>${item.reorderLevel}</td>
        <td>$${item.unitCost.toFixed(2)}</td>
        <td>${item.lastUpdated ? new Date(item.lastUpdated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</td>
      `;
      tableBody.appendChild(row);
    });

    //  Update Low Stock Card
    const lowCard = document.querySelector(".kpi-card.low");
    lowCard.querySelector("p").textContent = lowStockCount;
    lowCard.querySelector("span").textContent = lowStockCount === 0 ? "All items in stock" : "Requires attention";

    //  Update Total Inventory Value
    const valueCard = document.querySelector(".kpi-card:not(.low)");
    valueCard.querySelector("p").textContent = `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    valueCard.querySelector("span").textContent = `Updated on ${new Date().toLocaleDateString()}`;

  } catch (err) {
    console.error("Failed to load inventory:", err);
  }
}

function downloadExcel() {
  const table = document.getElementById("inventoryTable");
  const rows = Array.from(table.querySelectorAll("tr"));
  let csvContent = "";

  rows.forEach(row => {
    const cols = Array.from(row.querySelectorAll("th, td"));
    const rowData = cols.map(col => `"${col.textContent.trim()}"`).join(",");
    csvContent += rowData + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "inventory_data.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}



//  Initial Load
window.addEventListener("DOMContentLoaded", () => {
  loadInventory();
  updatePieChart();
});


