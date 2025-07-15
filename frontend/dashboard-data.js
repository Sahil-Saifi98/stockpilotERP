// Manufacturing Module Charts
function renderManufacturingCharts() {
  if (document.getElementById("chartCompleted")) {
    new Chart(document.getElementById("chartCompleted"), {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Completed Orders',
          data: [120, 135, 140, 150, 180, 200],
          backgroundColor: '#2980b9'
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  if (document.getElementById("chartInspectionSummary")) {
  new Chart(document.getElementById("chartInspectionSummary"), {
    type: 'pie',
    data: {
      labels: ['Passed', 'Failed', 'Pending Recheck'],
      datasets: [{
        data: [68, 10, 22],
        backgroundColor: ['#27ae60', '#e74c3c', '#f39c12']
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

if (document.getElementById("chartGantt")) {
  new Chart(document.getElementById("chartGantt"), {
    type: 'bar',
    data: {
      labels: ['Batch A', 'Batch B', 'Batch C', 'Batch D'],
      datasets: [{
        label: 'Start Day',
        data: [1, 2, 4, 6],
        backgroundColor: '#bdc3c7'
      }, {
        label: 'Duration',
        data: [3, 4, 2, 3],
        backgroundColor: '#2980b9'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              if (ctx.dataset.label === 'Start Day') return '';
              return `Days: ${ctx.raw}`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true
        },
        y: {
          stacked: true
        }
      }
    }
  });
}



  if (document.getElementById("chartOngoing")) {
    new Chart(document.getElementById("chartOngoing"), {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [{
          label: 'Ongoing Inspections',
          data: [18, 20, 23, 21, 22, 23],
          borderColor: '#27ae60',
          fill: false,
          tension: 0.3
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  if (document.getElementById("chartMonthlyInspect")) {
    new Chart(document.getElementById("chartMonthlyInspect"), {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed', 'Ongoing'],
        datasets: [{
          data: [85, 7, 22],
          backgroundColor: ['#3498db', '#e74c3c', '#8420c3']
        }]
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  if (document.getElementById("chartMonthlyOrders")) {
    new Chart(document.getElementById("chartMonthlyOrders"), {
      type: 'bar',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Orders',
          data: [25, 30, 28, 25],
          backgroundColor: '#f39c12'
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
}

// Inventory Module Charts
function renderInventoryCharts() {
  if (document.getElementById("chartStock")) {
    new Chart(document.getElementById("chartStock"), {
      type: 'bar',
      data: {
        labels: ['Raw Materials', 'WIP', 'Finished Goods'],
        datasets: [{
          label: 'Stock Items',
          data: [1000, 450, 530],
          backgroundColor: ['#3498db', '#f1c40f', '#2ecc71']
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  if (document.getElementById("chartLowStock")) {
    new Chart(document.getElementById("chartLowStock"), {
      type: 'pie',
      data: {
        labels: ['Raw Materials', 'Spare Parts', 'Packaging'],
        datasets: [{
          data: [12, 9, 6],
          backgroundColor: ['#e74c3c', '#9b59b6', '#1abc9c']
        }]
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  if (document.getElementById("chartInbound")) {
    new Chart(document.getElementById("chartInbound"), {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Inbound Shipments',
          data: [25, 28, 30, 29],
          borderColor: '#27ae60',
          tension: 0.4,
          fill: false
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  if (document.getElementById("chartOutbound")) {
    new Chart(document.getElementById("chartOutbound"), {
      type: 'bar',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
          label: 'Outbound Transfers',
          data: [22, 24, 26, 25],
          backgroundColor: '#e67e22'
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}
