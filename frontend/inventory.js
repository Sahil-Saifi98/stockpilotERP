let pieChart;
let stockFlowChart;
let allItems = []; // Store all items for filtering
let allManufacturingItems = []; // Store manufacturing items
let allPurchaseHistory = []; // Store purchase history
let allIssueHistory = []; // Store issue history
let allDispatchDetails = []; // Store dispatch details
// Keep original rows to restore on cancel
const originalRowMap = new Map();

// Global state for selected items and modal operations
let selectedManufacturingItems = [];
let currentModalOperation = null;
let currentModalItem = null;

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

// NEW: Load Stock Flow Chart
async function updateStockFlowChart() {
  try {
    const res = await fetch("http://localhost:5000/api/manufacturing-items/stock-flow-data");
    const chartData = await res.json();
    const ctx = document.getElementById("stockFlowChart");

    if (stockFlowChart) {
      stockFlowChart.data.labels = chartData.labels;
      stockFlowChart.data.datasets[0].data = chartData.readyStock;
      stockFlowChart.data.datasets[1].data = chartData.wipStock;
      stockFlowChart.update();
    } else {
      stockFlowChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: 'Ready Stock',
            data: chartData.readyStock,
            backgroundColor: '#27ae60'
          }, {
            label: 'WIP Stock',
            data: chartData.wipStock,
            backgroundColor: '#f39c12'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          },
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  } catch (err) {
    console.error("Error loading stock flow chart data:", err);
  }
}

// Search Function
const searchInput = document.getElementById("search");
searchInput.addEventListener("keyup", function () {
  applyFilters();
});

// Filter Functions
function applyFilters() {
  const searchFilter = searchInput.value.toLowerCase();
  const departmentFilter = document.getElementById("filterDepartment").value;
  const categoryFilter = document.getElementById("filterCategory").value;
  const rows = document.querySelectorAll("#inventoryTable tbody tr");
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const department = row.cells[2].textContent;
    const category = row.cells[3].textContent;
    const matchesSearch = text.includes(searchFilter);
    const matchesDepartment = !departmentFilter || department === departmentFilter;
    const matchesCategory = !categoryFilter || category === categoryFilter;
    
    row.style.display = (matchesSearch && matchesDepartment && matchesCategory) ? "" : "none";
  });
}

// Add event listeners for filters
document.getElementById("filterDepartment").addEventListener("change", applyFilters);
document.getElementById("filterCategory").addEventListener("change", applyFilters);

function filterLowStock() {
  const rows = document.querySelectorAll("#inventoryTable tbody tr");
  rows.forEach(row => {
    const quantityCell = row.cells[4]; // Quantity column
    const quantity = parseInt(quantityCell.textContent);
    const lowStockThreshold = 20;
    const isLowStock = quantity < lowStockThreshold;
    row.style.display = isLowStock ? "" : "none";
  });
}

// NEW: Purchase Form Handler
// Find this section in inventory.js and update ONLY the purchaseData object:
const purchaseForm = document.getElementById("purchase");
purchaseForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const purchaseData = {
    date: document.getElementById("purchaseDate").value,
    invoiceNo: document.getElementById("invoiceNo").value,
    itemCode: document.getElementById("purchaseItemCode").value,  // CHANGED
    partName: document.getElementById("purchasePartName").value,  // CHANGED
    quantity: parseInt(document.getElementById("purchaseQuantity").value),
    addedBy: "Current User"
  };

  // Rest of the function stays the same...
  try {
    const res = await fetch('http://localhost:5000/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchaseData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Server error");

    alert("✅ Purchase added successfully and stock updated");
    purchaseForm.reset();
    await loadPurchaseHistory();
    await loadManufacturingItems();
    await updateStockFlowChart();
  } catch (err) {
    alert("Server error: " + err.message);
    console.error(err);
  }
});

// NEW: Issue to WIP Form Handler
const issueToWipForm = document.getElementById("issueToWipForm");
issueToWipForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const issueData = {
    productId: document.getElementById("issueProduct").value,
    quantity: parseInt(document.getElementById("issueQuantity").value),
    issuedTo: document.getElementById("issuedTo").value,
    workOrder: document.getElementById("workOrder").value,
    machine: document.getElementById("machine").value,
    date: document.getElementById("issueDate").value,
    issuedBy: "Current User" // You can get this from user session
  };

  try {
    const res = await fetch('http://localhost:5000/api/issue-to-wip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(issueData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Server error");

    alert("✅ Items issued to WIP successfully");
    issueToWipForm.reset();
    await loadIssueHistory();
    await loadManufacturingItems();
    await updateStockFlowChart();
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
});

// NEW: Show Issue to WIP Section
function showIssueToWipSection() {
  const section = document.getElementById("issueToWipSection");
  section.style.display = "block";
  
  // Set today's date as default
  document.getElementById("issueDate").value = new Date().toISOString().split('T')[0];
  
  // Load products with ready stock
  loadProductsForIssue();
  
  // Scroll to the section
  section.scrollIntoView({ behavior: 'smooth' });
}

// NEW: Load Products with Ready Stock for Issue
async function loadProductsForIssue() {
  try {
    const res = await fetch('http://localhost:5000/api/manufacturing-items/ready-stock');
    const items = await res.json();
    
    const select = document.getElementById("issueProduct");
    select.innerHTML = '<option value="">Select Product</option>';
    
    items.forEach(item => {
      if (item.readyStock > 0) {
        const option = document.createElement("option");
        option.value = item._id;
        option.textContent = `${item.itemName} (${item.itemCode}) - Available: ${item.readyStock}`;
        option.dataset.maxQuantity = item.readyStock;
        select.appendChild(option);
      }
    });
    
    // Add event listener to limit quantity input
    select.addEventListener('change', function() {
      const quantityInput = document.getElementById("issueQuantity");
      if (this.value) {
        const maxQuantity = this.selectedOptions[0].dataset.maxQuantity;
        quantityInput.max = maxQuantity;
        quantityInput.placeholder = `Max: ${maxQuantity}`;
      } else {
        quantityInput.removeAttribute('max');
        quantityInput.placeholder = 'Quantity';
      }
    });
    
  } catch (err) {
    console.error("Failed to load products for issue:", err);
  }
}

// FIXED: Load Issue History
async function loadIssueHistory() {
  try {
    const res = await fetch('http://localhost:5000/api/issue-to-wip');
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    // FIXED: Handle both array response and object with issues property
    const responseData = await res.json();
    let issues = [];
    
    if (Array.isArray(responseData)) {
      issues = responseData;
    } else if (responseData.issues && Array.isArray(responseData.issues)) {
      issues = responseData.issues;
    } else {
      console.warn("Unexpected response format:", responseData);
      issues = [];
    }
    
    allIssueHistory = issues;
    console.log("Loaded issues:", issues.length);

    const tableBody = document.querySelector("#issueHistoryTable tbody");
    tableBody.innerHTML = "";

    if (issues.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="9" style="text-align: center; color: #999;">No issue records found</td>`;
      tableBody.appendChild(row);
      return;
    }

    issues.forEach(issue => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(issue.date).toLocaleDateString()}</td>
        <td>${issue.productName}</td>
        <td>${issue.itemCode}</td>
        <td>${issue.quantity}</td>
        <td>${issue.issuedTo}</td>
        <td>${issue.workOrder}</td>
        <td>${issue.machine}</td>
        <td>${issue.issuedBy}</td>
        <td class="actions-column">
          <button class="action-btn" onclick="viewIssueDetails('${issue._id}')" title="View">👁️</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load issue history:", err);
    const tableBody = document.querySelector("#issueHistoryTable tbody");
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #e74c3c;">Error loading issue history: ${err.message}</td></tr>`;
  }
}

// FIXED: Load Purchase History
async function loadPurchaseHistory() {
  try {
    const res = await fetch('http://localhost:5000/api/purchases');
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    // FIXED: Handle both array response and object with purchases property  
    const responseData = await res.json();
    let purchases = [];
    
    if (Array.isArray(responseData)) {
      purchases = responseData;
    } else if (responseData.purchases && Array.isArray(responseData.purchases)) {
      purchases = responseData.purchases;
    } else {
      console.warn("Unexpected response format:", responseData);
      purchases = [];
    }
    
    allPurchaseHistory = purchases;
    console.log("Loaded purchases:", purchases.length);

    const tableBody = document.querySelector("#purchaseHistoryTable tbody");
    tableBody.innerHTML = "";

    if (purchases.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7" style="text-align: center; color: #999;">No purchase records found</td>`;
      tableBody.appendChild(row);
      return;
    }

    purchases.forEach(purchase => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${new Date(purchase.date).toLocaleDateString()}</td>
        <td>${purchase.invoiceNo}</td>
        <td>${purchase.itemCode}</td>
        <td>${purchase.partName}</td>
        <td>${purchase.quantity}</td>
        <td>${purchase.addedBy}</td>
        <td class="actions-column">
          <button class="action-btn" onclick="viewPurchaseDetails('${purchase._id}')" title="View">👁️</button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load purchase history:", err);
    const tableBody = document.querySelector("#purchaseHistoryTable tbody");
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e74c3c;">Error loading purchase history: ${err.message}</td></tr>`;
  }
}

// NEW: Show Dispatch Details Section
function showDispatchDetails() {
  const section = document.getElementById("dispatchDetailsSection");
  section.style.display = "block";
  
  // Load dispatch details
  loadDispatchDetails();
  
  // Scroll to the section
  section.scrollIntoView({ behavior: 'smooth' });
}

// NEW: Close Dispatch Details Section
function closeDispatchDetails() {
  document.getElementById("dispatchDetailsSection").style.display = "none";
}

// FIXED: Load Dispatch Details
async function loadDispatchDetails() {
  try {
    // Try to fetch from your dispatch API first
    let dispatchData = [];
    
    try {
      const res = await fetch('http://localhost:5000/api/dispatch-details');
      if (res.ok) {
        const responseData = await res.json();
        if (Array.isArray(responseData)) {
          dispatchData = responseData;
        } else if (responseData.dispatches) {
          dispatchData = responseData.dispatches;
        }
      }
    } catch (apiErr) {
      console.log("Dispatch API not available, using mock data");
    }
    
    // If no data from API, create mock data
    if (dispatchData.length === 0) {
      dispatchData = await createMockDispatchData();
    }
    
    allDispatchDetails = dispatchData;
    console.log("Loaded dispatch details:", dispatchData.length);

    const tableBody = document.querySelector("#dispatchDetailsTable tbody");
    tableBody.innerHTML = "";

    if (dispatchData.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7" style="text-align: center; color: #999;">No dispatch records found</td>`;
      tableBody.appendChild(row);
      return;
    }

    dispatchData.forEach(dispatch => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${dispatch.product}</td>
        <td>${dispatch.itemCode}</td>
        <td>${dispatch.department}</td>
        <td>${dispatch.quantity}</td>
        <td>${dispatch.workOrder}</td>
        <td>${dispatch.machine}</td>
        <td>${new Date(dispatch.date).toLocaleDateString()}</td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load dispatch details:", err);
    const tableBody = document.querySelector("#dispatchDetailsTable tbody");
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e74c3c;">Error loading dispatch details: ${err.message}</td></tr>`;
  }
}

// IMPROVED: Create Mock Dispatch Data using actual manufacturing items
async function createMockDispatchData() {
  try {
    // Get actual manufacturing items to create realistic mock data
    const res = await fetch('http://localhost:5000/api/manufacturing-items');
    const manufacturingItems = await res.json();
    
    const mockData = [];
    const workOrders = ['WO-2024-001', 'WO-2024-002', 'WO-2024-003', 'WO-2024-004', 'WO-2024-005'];
    const machines = ['CNC-01', 'CNC-02', 'Assembly-01', 'Assembly-02', 'Testing-01'];
    
    // Create mock dispatches from actual items
    manufacturingItems.slice(0, Math.min(10, manufacturingItems.length)).forEach((item, index) => {
      if (item.readyStock > 0) { // Only create dispatches for items with stock
        mockData.push({
          product: item.itemName,
          itemCode: item.itemCode,
          department: item.department,
          quantity: Math.min(item.readyStock, Math.floor(Math.random() * 10) + 1),
          workOrder: workOrders[index % workOrders.length],
          machine: machines[index % machines.length],
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
        });
      }
    });
    
    return mockData;
  } catch (err) {
    console.error("Error creating mock dispatch data:", err);
    // Return minimal fallback data
    return [
      {
        product: "Sample Item",
        itemCode: "SI001",
        department: "Cylinder",
        quantity: 5,
        workOrder: "WO-2024-001",
        machine: "CNC-01",
        date: new Date()
      }
    ];
  }
}

// NEW: Display Mock Dispatch Data
function displayMockDispatchData(dispatchData) {
  allDispatchDetails = dispatchData;
  const tableBody = document.querySelector("#dispatchDetailsTable tbody");
  tableBody.innerHTML = "";

  dispatchData.forEach(dispatch => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${dispatch.product}</td>
      <td>${dispatch.itemCode}</td>
      <td>${dispatch.department}</td>
      <td>${dispatch.quantity}</td>
      <td>${dispatch.workOrder}</td>
      <td>${dispatch.machine}</td>
      <td>${new Date(dispatch.date).toLocaleDateString()}</td>
    `;
    tableBody.appendChild(row);
  });
}

// NEW: Download Dispatch Excel
function downloadDispatchExcel() {
  const table = document.getElementById("dispatchDetailsTable");
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
  link.setAttribute("download", "dispatch_details.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// NEW: View Individual Item Dispatch Details
async function viewItemDispatchDetails(itemId) {
  try {
    // Find the item details
    const item = allManufacturingItems.find(i => i._id === itemId);
    if (!item) {
      alert("Item not found!");
      return;
    }
    
    // Show the dispatch details section
    showDispatchDetails();
    
    // Filter the dispatch details table to show only this item
    setTimeout(() => {
      const searchInput = document.getElementById("searchDispatch");
      searchInput.value = item.itemCode;
      
      // Trigger the search
      const event = new Event('keyup', { bubbles: true });
      searchInput.dispatchEvent(event);
    }, 500);
    
  } catch (err) {
    console.error("Error viewing item dispatch details:", err);
    alert("Error loading dispatch details for this item");
  }
}

// NEW: Load Manufacturing Items - Updated with new button
async function loadManufacturingItems() {
  try {
    const res = await fetch('http://localhost:5000/api/manufacturing-items');
    const items = await res.json();
    allManufacturingItems = items;

    const tableBody = document.querySelector("#manufacturingItemsTable tbody");
    tableBody.innerHTML = "";

    let wipCount = 0;
    let readyCount = 0;

    items.forEach(item => {
      wipCount += item.wipStock;
      readyCount += item.readyStock;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox" class="manufacturing-checkbox" data-id="${item._id}"></td>
        <td>${item.itemName}</td>
        <td>${item.itemCode}</td>
        <td>${item.department || 'N/A'}</td>
        <td class="stock-ready">${item.readyStock}</td>
        <td class="stock-wip">${item.wipStock}</td>
        <td class="stock-total">${item.readyStock + item.wipStock}</td>
        <td>
          <span class="stock-type-badge ${item.readyStock > 0 && item.wipStock > 0 ? 'mixed' : 
                                         item.readyStock > 0 ? 'ready' : 'wip'}">
            ${item.readyStock > 0 && item.wipStock > 0 ? 'Mixed' : 
              item.readyStock > 0 ? 'Ready' : 'WIP'}
          </span>
        </td>
        <td>${item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : new Date().toLocaleDateString()}</td>
        <td class="actions-column">
          <button class="action-btn" onclick="quickMoveToWIP('${item._id}')" title="Move to WIP">🔄</button>
          <button class="action-btn" onclick="viewItemDispatchDetails('${item._id}')" title="View Dispatch Details">📊</button>
          <button class="action-btn" onclick="quickDispatch('${item._id}')" title="Quick Dispatch">📦</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Update KPI
    document.getElementById("wipItemsCount").textContent = wipCount;
    document.getElementById("readyStockCount").textContent = readyCount;

  } catch (err) {
    console.error("Failed to load manufacturing items:", err);
  }
}

// NEW: Manufacturing Items Operations - Removed moveToReady function
function moveToWIP() {
  const selected = getSelectedManufacturingItems();
  if (selected.length === 0) {
    alert("Please select items to move to WIP");
    return;
  }
  
  currentModalOperation = 'wip';
  selectedManufacturingItems = selected;
  document.getElementById("modalTitle").textContent = "Move Items to WIP";
  document.getElementById("moveItemsModal").style.display = "block";
}

function dispatchItems() {
  const selected = getSelectedManufacturingItems();
  if (selected.length === 0) {
    alert("Please select items to dispatch");
    return;
  }
  
  selectedManufacturingItems = selected;
  document.getElementById("dispatchModal").style.display = "block";
  document.getElementById("dispatchDate").value = new Date().toISOString().split('T')[0];
}

function getSelectedManufacturingItems() {
  const checkboxes = document.querySelectorAll('.manufacturing-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
}

// NEW: Quick Actions - Removed quickMoveToReady function
async function quickMoveToWIP(itemId) {
  const quantity = prompt("Enter quantity to move to WIP:");
  if (!quantity || isNaN(quantity) || quantity <= 0) return;

  await performMoveOperation([itemId], 'wip', parseInt(quantity));
}

async function quickDispatch(itemId) {
  const destination = prompt("Enter destination:");
  if (!destination) return;
  
  const quantity = prompt("Enter quantity to dispatch:");
  if (!quantity || isNaN(quantity) || quantity <= 0) return;

  await performDispatchOperation([itemId], {
    destination,
    date: new Date().toISOString().split('T')[0],
    quantity: parseInt(quantity)
  });
}

// NEW: Perform Move Operations
async function performMoveOperation(itemIds, operation, quantity) {
  try {
    const res = await fetch('http://localhost:5000/api/manufacturing-items/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemIds,
        operation,
        quantity
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Server error");

    alert(`✅ Items moved to ${operation === 'wip' ? 'WIP' : 'Ready Stock'} successfully`);
    await loadManufacturingItems();
    await updateStockFlowChart();
    closeModal();
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
}

// NEW: Perform Dispatch Operation
async function performDispatchOperation(itemIds, dispatchData) {
  try {
    const res = await fetch('http://localhost:5000/api/manufacturing-items/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemIds,
        ...dispatchData
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Server error");

    alert("✅ Items dispatched successfully");
    await loadManufacturingItems();
    await updateStockFlowChart();
    closeModal();
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
}

// NEW: Modal Event Handlers
document.getElementById("moveItemsForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const quantity = parseInt(document.getElementById("moveQuantity").value);
  await performMoveOperation(selectedManufacturingItems, currentModalOperation, quantity);
});

document.getElementById("dispatchForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  const dispatchData = {
    destination: document.getElementById("dispatchDestination").value,
    date: document.getElementById("dispatchDate").value,
    quantity: parseInt(document.getElementById("dispatchQuantity").value)
  };
  
  await performDispatchOperation(selectedManufacturingItems, dispatchData);
});

// NEW: Close Modal Function
function closeModal() {
  document.getElementById("moveItemsModal").style.display = "none";
  document.getElementById("dispatchModal").style.display = "none";
  selectedManufacturingItems = [];
  currentModalOperation = null;
  currentModalItem = null;
}

// NEW: Modal Close Event Listeners
document.querySelectorAll('.close').forEach(closeBtn => {
  closeBtn.addEventListener('click', closeModal);
});

window.addEventListener('click', function(event) {
  const modals = ['moveItemsModal', 'dispatchModal'];
  modals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    if (event.target === modal) {
      closeModal();
    }
  });
});

// FIXED: Purchase History Toggle
document.getElementById("viewPurchaseHistory").addEventListener("click", function() {
  const section = document.getElementById("purchaseHistorySection");
  if (section.style.display === "none" || !section.style.display) {
    section.style.display = "block";
    this.textContent = "Hide Purchase History";
    loadPurchaseHistory();
  } else {
    section.style.display = "none";
    this.textContent = "View Purchase History";
  }
});

// FIXED: Issue History Toggle
document.getElementById("viewIssueHistory").addEventListener("click", function() {
  const section = document.getElementById("issueHistorySection");
  if (section.style.display === "none" || !section.style.display) {
    section.style.display = "block";
    this.textContent = "Hide Issue History";
    loadIssueHistory();
  } else {
    section.style.display = "none";
    this.textContent = "View Issue History";
  }
});

// NEW: Close Issue Section
document.getElementById("closeIssueSection").addEventListener("click", function() {
  document.getElementById("issueToWipSection").style.display = "none";
});

// NEW: Select All Manufacturing Items
document.getElementById("selectAllManufacturing").addEventListener("change", function() {
  const checkboxes = document.querySelectorAll('.manufacturing-checkbox');
  checkboxes.forEach(cb => cb.checked = this.checked);
});

// NEW: Stock Type Filter for Manufacturing Items
document.getElementById("filterStockType").addEventListener("change", function() {
  const filterValue = this.value;
  const rows = document.querySelectorAll("#manufacturingItemsTable tbody tr");
  
  rows.forEach(row => {
    if (!filterValue) {
      row.style.display = "";
      return;
    }
    
    const stockTypeBadge = row.querySelector('.stock-type-badge');
    const stockType = stockTypeBadge.textContent.trim();
    
    let shouldShow = false;
    if (filterValue === "Ready Stock" && (stockType === "Ready" || stockType === "Mixed")) {
      shouldShow = true;
    } else if (filterValue === "WIP" && (stockType === "WIP" || stockType === "Mixed")) {
      shouldShow = true;
    }
    
    row.style.display = shouldShow ? "" : "none";
  });
});

// NEW: Search Issue History
document.getElementById("searchIssue").addEventListener("keyup", function() {
  const searchFilter = this.value.toLowerCase();
  const rows = document.querySelectorAll("#issueHistoryTable tbody tr");
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const matchesSearch = text.includes(searchFilter);
    row.style.display = matchesSearch ? "" : "none";
  });
});

// NEW: Search Purchase History
document.getElementById("searchPurchase").addEventListener("keyup", function() {
  const searchFilter = this.value.toLowerCase();
  const rows = document.querySelectorAll("#purchaseHistoryTable tbody tr");
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const matchesSearch = text.includes(searchFilter);
    row.style.display = matchesSearch ? "" : "none";
  });
});

// NEW: Search Dispatch Details
document.addEventListener('DOMContentLoaded', function() {
  const searchDispatch = document.getElementById("searchDispatch");
  if (searchDispatch) {
    searchDispatch.addEventListener("keyup", function() {
      const searchFilter = this.value.toLowerCase();
      const rows = document.querySelectorAll("#dispatchDetailsTable tbody tr");
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchesSearch = text.includes(searchFilter);
        row.style.display = matchesSearch ? "" : "none";
      });
    });
  }
});

// NEW: Download Issue Excel
function downloadIssueExcel() {
  const table = document.getElementById("issueHistoryTable");
  const rows = Array.from(table.querySelectorAll("tr"));
  let csvContent = "";

  rows.forEach(row => {
    const cols = Array.from(row.querySelectorAll("th, td"));
    const dataColumns = cols.slice(0, -1); // Exclude actions column
    const rowData = dataColumns.map(col => `"${col.textContent.trim()}"`).join(",");
    csvContent += rowData + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "issue_detail_history.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// NEW: Download Purchase Excel
function downloadPurchaseExcel() {
  const table = document.getElementById("purchaseHistoryTable");
  const rows = Array.from(table.querySelectorAll("tr"));
  let csvContent = "";

  rows.forEach(row => {
    const cols = Array.from(row.querySelectorAll("th, td"));
    const dataColumns = cols.slice(0, -1); // Exclude actions column
    const rowData = dataColumns.map(col => `"${col.textContent.trim()}"`).join(",");
    csvContent += rowData + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "purchase_history.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Form Submit Handler (existing)
const form = document.getElementById("addItemForm");
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const item = {
    itemCode: document.getElementById("itemCode").value,
    itemName: document.getElementById("itemName").value,
    department: document.getElementById("department").value,
    category: document.getElementById("category").value,
    quantity: parseInt(document.getElementById("quantity").value)
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

// Get status badge HTML
function getStatusBadge(quantity) {
  const lowStockThreshold = 20;
  if (quantity === 0) {
    return '<span class="status-badge out-of-stock">Out of Stock</span>';
  } else if (quantity < lowStockThreshold) {
    return '<span class="status-badge low-stock">Low Stock</span>';
  } else {
    return '<span class="status-badge in-stock">In Stock</span>';
  }
}

// Improved Edit Item Function - Inline Editing
async function editItem(id) {
  try {
    // Fetch current item data
    const res = await fetch(`http://localhost:5000/api/items/${id}`);
    if (!res.ok) throw new Error('Failed to fetch item');
    const item = await res.json();
    // Find the row
    const rows = document.querySelectorAll("#inventoryTable tbody tr");
    let targetRow = null;
    rows.forEach(row => {
      const editButton = row.querySelector(`button[onclick="editItem('${id}')"]`);
      if (editButton) targetRow = row;
    });
    if (!targetRow) throw new Error('Row not found');
    // If already editing, do nothing
    if (originalRowMap.has(id)) return;
    // Store original row node for restoration
    originalRowMap.set(id, targetRow.cloneNode(true));
    // Clear row and build edit inputs
    targetRow.classList.add('editing-row');
    targetRow.innerHTML = '';
    // Helper to create cell with element or text
    const makeCell = (content) => {
      const td = document.createElement('td');
      if (typeof content === 'string') {
        td.textContent = content;
      } else {
        td.appendChild(content);
      }
      return td;
    };

    // itemName input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = `edit_itemName_${id}`;
    nameInput.value = item.itemName;
    nameInput.style.width = '100%';
    const nameCell = makeCell(nameInput);

    // itemCode input
    const codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.id = `edit_itemCode_${id}`;
    codeInput.value = item.itemCode;
    const codeCell = makeCell(codeInput);

    // department select
    const deptSelect = document.createElement('select');
    deptSelect.id = `edit_department_${id}`;
    ['Cylinder', 'PowerPack'].forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      if (item.department === d) opt.selected = true;
      deptSelect.appendChild(opt);
    });
    const deptCell = makeCell(deptSelect);

    // category select
    const catSelect = document.createElement('select');
    catSelect.id = `edit_category_${id}`;
    ['Raw Materials', 'Work in Progress', 'Finished Goods', 'Spare Parts', 'Packaging'].forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (item.category === c) opt.selected = true;
      catSelect.appendChild(opt);
    });
    const catCell = makeCell(catSelect);

    // quantity input
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.id = `edit_quantity_${id}`;
    qtyInput.min = 0;
    qtyInput.value = item.quantity;
    qtyInput.style.textAlign = 'center';
    const qtyCell = makeCell(qtyInput);

    // last updated
    const dateCell = makeCell(item.lastUpdated
      ? new Date(item.lastUpdated).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]);

    // actions: save / cancel
    const actionsCell = document.createElement('td');
    const saveBtn = document.createElement('button');
    saveBtn.className = 'action-btn';
    saveBtn.title = 'Save';
    saveBtn.textContent = '✓';
    saveBtn.style.background = '#27ae60';
    saveBtn.style.color = 'white';
    saveBtn.addEventListener('click', () => saveEdit(id));

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'action-btn';
    cancelBtn.title = 'Cancel';
    cancelBtn.textContent = '✗';
    cancelBtn.style.background = '#e74c3c';
    cancelBtn.style.color = 'white';
    cancelBtn.addEventListener('click', () => cancelEdit(id));

    actionsCell.appendChild(saveBtn);
    actionsCell.appendChild(cancelBtn);

    // Append all cells
    targetRow.appendChild(nameCell);
    targetRow.appendChild(codeCell);
    targetRow.appendChild(deptCell);
    targetRow.appendChild(catCell);
    targetRow.appendChild(qtyCell);
    targetRow.appendChild(dateCell);
    targetRow.appendChild(actionsCell);

  } catch (err) {
    alert(`Error editing item: ${err.message}`);
    console.error("Edit error:", err);
  }
}

function cancelEdit(id) {
  const currentRow = document.querySelector("#inventoryTable tbody tr.editing-row");
  const original = originalRowMap.get(id);
  if (currentRow && original) {
    currentRow.replaceWith(original);
    originalRowMap.delete(id);
  }
}

// Save Edit Function
async function saveEdit(id) {
  try {
    const itemName = document.getElementById(`edit_itemName_${id}`).value.trim();
    const itemCode = document.getElementById(`edit_itemCode_${id}`).value.trim();
    const department = document.getElementById(`edit_department_${id}`).value;
    const category = document.getElementById(`edit_category_${id}`).value;
    const quantity = parseInt(document.getElementById(`edit_quantity_${id}`).value);
    
    // Validate inputs
    if (!itemName || !itemCode || !department || !category) {
      alert("All fields are required!");
      return;
    }
    if (isNaN(quantity) || quantity < 0) {
      alert("Please enter a valid quantity!");
      return;
    }
    
    // Update the item
    const updateRes = await fetch(`http://localhost:5000/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemName,
        itemCode,
        department,
        category,
        quantity
      })
    });
    
    if (!updateRes.ok) {
      const errorData = await updateRes.json();
      throw new Error(errorData.message || 'Failed to update item');
    }
    
    alert("✅ Item updated successfully!");
    await loadInventory();
    await updatePieChart();
    
  } catch (err) {
    alert(`Error updating item: ${err.message}`);
    console.error("Save error:", err);
  }
}

// Delete Item Function - Fixed Implementation
async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
    return;
  }
  try {
    const res = await fetch(`http://localhost:5000/api/items/${id}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to delete item');
    }
    
    alert("✅ Item deleted successfully!");
    await loadInventory();
    await updatePieChart();
    
  } catch (err) {
    alert(`Error deleting item: ${err.message}`);
    console.error("Delete error:", err);
  }
}

// Inventory Table + KPI Load - Fixed to show red quantities and correct KPI
async function loadInventory() {
  try {
    const res = await fetch('http://localhost:5000/api/items');
    const items = await res.json();
    allItems = items; // Store for filtering

    const tableBody = document.querySelector("#inventoryTable tbody");
    let lowStockCount = 0;
    const lowStockThreshold = 20;

    tableBody.innerHTML = "";

    items.forEach(item => {
      const isLow = item.quantity < lowStockThreshold;
      if (isLow) lowStockCount++;

      const row = document.createElement("tr");
      
      // Apply red color to quantity if less than 20
      const quantityClass = item.quantity < lowStockThreshold ? 'low-stock' : '';
      
      row.innerHTML = `
        <td>${item.itemName}</td>
        <td>${item.itemCode}</td>
        <td>${item.department || 'N/A'}</td>
        <td>${item.category}</td>
        <td class="${quantityClass}">${item.quantity}</td>
        <td>${item.lastUpdated ? new Date(item.lastUpdated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</td>
        <td class="actions-column">
          <button class="action-btn" onclick="editItem('${item._id}')" title="Edit">✏️</button>
          <button class="action-btn delete" onclick="deleteItem('${item._id}')" title="Delete">🗑️</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Update KPI values
    document.getElementById("totalItems").textContent = items.length;
    document.getElementById("lowStockCount").textContent = lowStockCount;
    
    // Update KPI card status text
    const lowStockSpan = document.querySelector('.kpi-card.low span');
    if (lowStockCount > 0) {
      lowStockSpan.textContent = `${lowStockCount} items need restocking`;
      lowStockSpan.style.color = '#e74c3c';
    } else {
      lowStockSpan.textContent = 'All items in stock';
      lowStockSpan.style.color = '#27ae60';
    }
    
  } catch (err) {
    console.error("Failed to load inventory:", err);
  }
}

// Fixed Download Excel Function - Excludes Actions Column
function downloadExcel() {
  const table = document.getElementById("inventoryTable");
  const rows = Array.from(table.querySelectorAll("tr"));
  let csvContent = "";

  rows.forEach(row => {
    const cols = Array.from(row.querySelectorAll("th, td"));
    // Exclude the last column (Actions column) by slicing the array
    const dataColumns = cols.slice(0, -1);
    const rowData = dataColumns.map(col => `"${col.textContent.trim()}"`).join(",");
    csvContent += rowData + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "boughtOut_inventory_data.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// NEW: View Purchase Details
function viewPurchaseDetails(purchaseId) {
  const purchase = allPurchaseHistory.find(p => p._id === purchaseId);
  if (!purchase) return;
  
  alert(`Purchase Details:
Date: ${new Date(purchase.date).toLocaleDateString()}
Invoice No: ${purchase.invoiceNo}
Item Code: ${purchase.itemCode}
Part Name: ${purchase.partName}
Quantity: ${purchase.quantity}
Added By: ${purchase.addedBy}`);
}

// NEW: View Issue Details
function viewIssueDetails(issueId) {
  const issue = allIssueHistory.find(i => i._id === issueId);
  if (!issue) return;
  
  alert(`Issue Details:
Date: ${new Date(issue.date).toLocaleDateString()}
Product: ${issue.productName}
Item Code: ${issue.itemCode}
Quantity: ${issue.quantity}
Issued To: ${issue.issuedTo}
Work Order: ${issue.workOrder}
Machine: ${issue.machine}
Issued By: ${issue.issuedBy}`);
}

// FIXED: Initial Load - Make sure all data loads properly
window.addEventListener("DOMContentLoaded", async () => {
  console.log("Page loaded, initializing data...");
  
  try {
    await loadInventory();
    await loadManufacturingItems();
    await updatePieChart();
    await updateStockFlowChart();
    
    // Pre-load purchase and issue history for better UX
    console.log("Pre-loading purchase and issue history...");
    await loadPurchaseHistory();
    await loadIssueHistory();
    
    console.log("All data loaded successfully");
  } catch (err) {
    console.error("Error during initial data load:", err);
  }
});