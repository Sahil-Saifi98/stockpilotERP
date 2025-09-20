document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const elements = {
    updateTime: document.getElementById('update-time'),
    trackerForm: document.getElementById('trackerForm'),
    workOrderInput: document.getElementById('workOrder'),
    machineNameInput: document.getElementById('machineName'),
    machineSelect: document.getElementById('machineSelect'),
    componentSelect: document.getElementById('componentSelect'),
    customComponentInput: document.getElementById('customComponentInput'),
    materialSelect: document.getElementById('materialSelect'),
    customMaterialInput: document.getElementById('customMaterialInput'),
    sizeSelect: document.getElementById('sizeSelect'),
    sizeInput: document.getElementById('sizeInput'),
    processCountSelect: document.getElementById('processCountSelect'),
    materialProcessTable: document.getElementById('materialProcessTable').querySelector('tbody'),
    processTableHeader: document.getElementById('processTableHeader'),
    tableContainer: document.getElementById('materialProcessTableContainer'),
    pauseDurationTable: document.getElementById('pauseDurationTable').querySelector('tbody'),
    draftPreviewTable: document.getElementById('draftPreviewTable').querySelector('tbody'),
    draftPreviewContainer: document.getElementById('draftPreviewContainer'),
    processStripsContainer: document.getElementById('processStripsContainer'),
    typeAddBtn: document.getElementById('typeadd')
  };

  // Global State
  const state = {
    machineComponentMap: {},
    processIDs: [],
    processNames: {},
    products: [],
    allMaterials: [],
    pauseRecords: [],
    draftProducts: [],
    currentlyOpenMaterial: null,
    workOrderTables: {},
    processStartTimes: {},
    isCustomComponent: false,
    isCustomMaterial: false
  };

  // Constants
  const STATUS_COLORS = {
    waiting: 'gray',
    'in-progress': '#8734dbff',
    stop: '#f19e0fff',
    error: '#e74c3c',
    completed: '#2ecc71'
  };

  // Utility Functions
  const uid = () => Math.random().toString(36).substr(2, 9);

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Generate process data for custom items
  const getCustomProcessData = (processCount) => {
    const processIDs = [];
    const processNames = {};
    
    for (let i = 1; i <= processCount; i++) {
      const processId = `process${i}`;
      processIDs.push(processId);
      // Process names will be editable in the process table
      processNames[processId] = `Process ${i}`;
    }
    
    return { processIDs, processNames };
  };

  // Clear material fields
  const clearMaterialFields = () => {
    elements.materialSelect.value = '';
    elements.sizeSelect.value = '';
    elements.sizeInput.value = '';
    elements.sizeSelect.innerHTML = '<option value="">Select Size</option>';
    elements.materialSelect.innerHTML = '<option value="">Select Component</option>';
    elements.materialSelect.style.display = 'none';
    elements.sizeSelect.style.display = 'none';
    elements.sizeInput.style.display = 'none';
    elements.processCountSelect.style.display = 'none';
    elements.materialProcessTable.innerHTML = '';
    elements.processTableHeader.innerHTML = '';
    elements.customMaterialInput.value = '';
    elements.customMaterialInput.style.display = 'none';
    state.allMaterials = [];
    state.isCustomMaterial = false;
  };

  // Reset form fields after adding to draft (only reset after department)
  const resetFormAfterDraft = () => {
    // Reset component and everything after it
    elements.componentSelect.value = '';
    elements.customComponentInput.value = '';
    elements.customComponentInput.style.display = 'none';
    state.isCustomComponent = false;
    
    // Clear all material-related fields
    clearMaterialFields();
    
    // Hide process table
    elements.tableContainer.style.display = 'none';
    
    // Keep work order, machine name, and department selected
    // This allows user to quickly add multiple items with same work order and department
  };

  const hideAllWorkOrderTables = () => {
    document.querySelectorAll('.workorder-table-container').forEach(container => {
      container.style.display = 'none';
    });
  };

  // Check if we should show process count selector for custom items
  const checkAndShowProcessCountSelector = () => {
    // Show process count selector when:
    // 1. Component is "other" (custom component) and size is entered, OR
    // 2. Material is "other" (custom material) and size is entered
    const isCustomComponentWithSize = state.isCustomComponent && elements.sizeInput.value.trim();
    const isCustomMaterialWithSize = state.isCustomMaterial && elements.sizeInput.value.trim();
    
    if (isCustomComponentWithSize || isCustomMaterialWithSize) {
      elements.processCountSelect.style.display = 'inline-block';
      
      // Auto-setup process data if not already done
      const processCount = elements.processCountSelect.value || '3';
      if (state.processIDs.length === 0) {
        const customProcessData = getCustomProcessData(parseInt(processCount));
        state.processIDs = customProcessData.processIDs;
        state.processNames = customProcessData.processNames;
        
        // Get current material name
        let materialName = 'Custom Material';
        if (state.isCustomComponent) {
          materialName = elements.customComponentInput.value.trim() || 'Custom Component';
        } else if (state.isCustomMaterial) {
          materialName = elements.customMaterialInput.value.trim() || 'Custom Material';
        }
        
        state.allMaterials = [materialName];
        renderMaterialTable();
        elements.tableContainer.style.display = 'block';
      }
    } else {
      elements.processCountSelect.style.display = 'none';
    }
  };

  // Fetch functions
  const fetchHaltDurationRecords = () => {
    fetch('http://localhost:5000/api/production/halt-duration')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          state.pauseRecords = data;
          updatePauseDurationTable();
          console.log(`📋 Loaded ${data.length} halt duration records from database`);
        }
      })
      .catch(err => {
        console.error("❌ Error fetching halt duration records:", err);
      });
  };

  const fetchProductionItems = () => {
    fetch('http://localhost:5000/api/production')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return;

        state.products = data.map(item => ({
          id: item._id,
          workOrder: item.workOrder,
          machine: item.department,
          machineName: item.machineName,
          component: item.component,
          material: item.material,
          size: item.size,
          processPath: item.processPath.map(p => p.processId),
          processNames: Object.fromEntries(item.processPath.map(p => [p.processId, p.name || p.processId])),
          processIndex: item.currentProcessIndex,
          processId: item.processPath[item.currentProcessIndex]?.processId || item.processPath[0]?.processId,
          status: item.processPath[item.currentProcessIndex]?.status || 'waiting',
          startTime: item.processPath[item.currentProcessIndex]?.startTime || null,
          pauseTime: item.processPath[item.currentProcessIndex]?.pauseTime || null,
          inProcessDuration: item.processPath[item.currentProcessIndex]?.inProcessDuration || null,
          pauseToNextDuration: item.processPath[item.currentProcessIndex]?.pauseToNextDuration || null
        }));

        state.products.forEach(p => {
          if (p.status === 'in-progress' && p.startTime) {
            const key = `${p.id}-${p.processIndex}`;
            state.processStartTimes[key] = new Date(p.startTime);
            console.log(`🔄 Restored active process start time for ${p.workOrder}-${p.material}`);
          }
        });

        const groupedByWorkOrder = {};
        state.products.forEach(p => {
          const key = p.workOrder;
          if (!groupedByWorkOrder[key]) {
            groupedByWorkOrder[key] = {
              workOrder: p.workOrder,
              machineName: p.machineName,
              items: []
            };
          }
          groupedByWorkOrder[key].items.push(p);
        });

        state.workOrderTables = groupedByWorkOrder;

        Object.values(groupedByWorkOrder).forEach(woData => {
          createWorkOrderTableFromData(woData);
        });

      })
      .catch(err => {
        console.error("❌ Error fetching saved production items:", err);
      });
  };

  const createWorkOrderTableFromData = (woData) => {
    const container = document.createElement('div');
    container.className = 'workorder-table-container';
    container.style.display = 'none';

    const title = document.createElement('h3');
    title.textContent = `Work Order: ${woData.workOrder} | Machine Name: ${woData.machineName}`;
    container.appendChild(title);

    const table = document.createElement('table');
    table.id = `table-${woData.workOrder}`;
    table.innerHTML = `
      <thead>
        <tr>
          <th>Work Order</th>
          <th>Machine Name</th>
          <th>Department</th>
          <th>Type</th>
          <th>Component</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    woData.items.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.workOrder}</td>
        <td>${item.machineName}</td>
        <td>${item.machine}</td>
        <td>${item.component}</td>
        <td>${item.material}</td>
        <td>${item.size}</td>
      `;
      tbody.appendChild(row);
    });

    container.appendChild(table);
    
    let tableSection = document.querySelector('.table-section');
    if (!tableSection) {
      tableSection = document.createElement('div');
      tableSection.className = 'table-section';
      document.body.appendChild(tableSection);
    }
    
    tableSection.appendChild(container);
  };

  const updatePauseDurationTable = () => {
    elements.pauseDurationTable.innerHTML = '';
    
    const currentWorkOrder = elements.workOrderInput.value.trim();
    
    const filteredRecords = currentWorkOrder 
      ? state.pauseRecords.filter(record => record.workOrder === currentWorkOrder)
      : [];
    
    if (currentWorkOrder && filteredRecords.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="6" style="text-align: center; color: #666;">
          No halt duration records found for Work Order: ${currentWorkOrder}
        </td>
      `;
      elements.pauseDurationTable.appendChild(row);
      return;
    }
    
    if (!currentWorkOrder) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="6" style="text-align: center; color: #666;">
          Enter a Work Order number to view halt duration records
        </td>
      `;
      elements.pauseDurationTable.appendChild(row);
      return;
    }
    
    filteredRecords.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.workOrder}</td>
        <td>${record.machine}</td>
        <td>${record.type}</td>
        <td>${record.component}</td>
        <td>${record.fromProcess} → ${record.toProcess}</td>
        <td>${formatDuration(record.duration)}</td>
      `;
      elements.pauseDurationTable.appendChild(row);
    });
  };

  const saveHaltDurationRecord = (haltRecord) => {
    fetch('http://localhost:5000/api/production/halt-duration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(haltRecord)
    })
    .then(res => res.json())
    .then(data => {
      console.log('✅ Saved halt duration record:', data);
      state.pauseRecords.push(haltRecord);
      updatePauseDurationTable();
    })
    .catch(err => {
      console.error('❌ Error saving halt duration record:', err);
    });
  };

  const init = () => {
    elements.updateTime.textContent = new Date().toLocaleString();
    elements.workOrderInput.value = '';
    
    elements.tableContainer.style.display = 'none';
    elements.materialSelect.style.display = 'none';
    elements.sizeSelect.style.display = 'none';
    elements.sizeInput.style.display = 'none';
    elements.customComponentInput.style.display = 'none';
    elements.customMaterialInput.style.display = 'none';
    elements.processCountSelect.style.display = 'none';
    
    fetchMachineData();
    fetchProductionItems();
    fetchHaltDurationRecords();
    setupEventListeners();
  };

  const fetchMachineData = () => {
    fetch('http://localhost:5000/api/machines')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          console.error("❌ Expected array from API but got:", data);
          alert("Invalid data received from server. Please check the console.");
          return;
        }

        state.machineComponentMap = {};
        data.forEach(machine => {
          if (!machine?.name || !Array.isArray(machine.components)) return;
          
          state.machineComponentMap[machine.name] = {};
          machine.components.forEach(component => {
            if (!component?.name || !Array.isArray(component.materials)) return;
            state.machineComponentMap[machine.name][component.name] = component.materials;
          });
        });

        populateMachineDropdown(Object.keys(state.machineComponentMap));
      })
      .catch(err => {
        console.error("❌ Failed to fetch machines:", err);
        alert("Error loading machine data from server.");
      });
  };

  const populateMachineDropdown = (machineNames) => {
    elements.machineSelect.innerHTML = '<option value="">Select Department</option>';
    machineNames.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      elements.machineSelect.appendChild(option);
    });
  };

  // Add "Other" option to component dropdown
  const populateComponentDropdown = (selectedMachine) => {
    elements.componentSelect.innerHTML = '<option value="">Select Type</option>';
    
    if (!state.machineComponentMap[selectedMachine]) return;

    Object.keys(state.machineComponentMap[selectedMachine]).forEach(component => {
      const option = document.createElement('option');
      option.value = component;
      option.textContent = component;
      elements.componentSelect.appendChild(option);
    });
    
    // Add "Other" option
    const otherOption = document.createElement('option');
    otherOption.value = 'other';
    otherOption.textContent = 'Other';
    elements.componentSelect.appendChild(otherOption);
    
    elements.componentSelect.style.display = 'inline-block';
  };

  // Add "Other" option to material dropdown
  const populateMaterialDropdown = (selectedMachine, selectedComponent) => {
    const materials = state.machineComponentMap[selectedMachine][selectedComponent];
    
    elements.materialSelect.innerHTML = '<option value="">Select Component</option>';
    materials.forEach(mat => {
      const option = document.createElement('option');
      option.value = mat.name;
      option.textContent = mat.name;
      elements.materialSelect.appendChild(option);
    });
    
    // Add "Other" option
    const otherOption = document.createElement('option');
    otherOption.value = 'other';
    otherOption.textContent = 'Other';
    elements.materialSelect.appendChild(otherOption);
    
    elements.materialSelect.style.display = 'inline-block';
  };

  // Populate size dropdown - for predefined materials
  const populateSizeDropdown = (material) => {
    elements.sizeSelect.innerHTML = '<option value="">Select Size</option>';
    (material.sizes || []).forEach(size => {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = size;
      elements.sizeSelect.appendChild(option);
    });
    
    elements.sizeSelect.style.display = 'inline-block';
    elements.sizeInput.style.display = 'none';
  };

  // Show size input field for custom materials
  const showSizeInput = () => {
    elements.sizeSelect.style.display = 'none';
    elements.sizeInput.style.display = 'inline-block';
  };

  const updateProcessData = (material) => {
    state.processIDs.length = 0;
    Object.keys(state.processNames).forEach(k => delete state.processNames[k]);
    
    (material.processes || []).forEach((p, idx) => {
      const id = `process${idx + 1}`;
      state.processIDs.push(id);
      state.processNames[id] = p;
    });
  };

  // Render functions
  const renderMaterialTable = () => {
    elements.materialProcessTable.innerHTML = '';
    elements.processTableHeader.innerHTML = '';

    const headerRow1 = document.createElement('tr');
    headerRow1.innerHTML = `<th>Material</th><th colspan="${state.processIDs.length}">Assign to Processes</th>`;
    const headerRow2 = document.createElement('tr');
    
    // Create editable process name headers
    const processHeaders = state.processIDs.map(pid => {
      const processName = state.processNames[pid] || pid;
      return `<th><input type="text" value="${processName}" onchange="updateProcessName('${pid}', this.value)" style="border:none; background:transparent; text-align:center" /></th>`;
    }).join('');
    
    headerRow2.innerHTML = `<th></th>${processHeaders}`;

    elements.processTableHeader.appendChild(headerRow1);
    elements.processTableHeader.appendChild(headerRow2);

    state.allMaterials.forEach(material => {
      const row = document.createElement('tr');
      const checkboxes = state.processIDs.map(pid =>
        `<td><input type="checkbox" data-material="${material}" value="${pid}"></td>`
      ).join('');
      row.innerHTML = `<td>${material}</td>${checkboxes}`;
      elements.materialProcessTable.appendChild(row);
    });
  };

  // Global function to update process names
  window.updateProcessName = (processId, newName) => {
    state.processNames[processId] = newName.trim() || processId;
  };

  const renderDraftPreview = () => {
    elements.draftPreviewTable.innerHTML = '';

    state.draftProducts.forEach((item, index) => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${item.component}</td>
        <td>${item.material}</td>
        <td>${item.size}</td>
        <td><button data-index="${index}" class="remove-draft-btn">Remove</button></td>
      `;
      elements.draftPreviewTable.appendChild(row);
    });

    elements.draftPreviewContainer.style.display = state.draftProducts.length ? 'block' : 'none';
  };

  const renderProcessStrips = () => {
    elements.processStripsContainer.innerHTML = '';
    const currentWorkOrder = elements.workOrderInput.value.trim();

    const activeProducts = state.products.filter(p => 
      p.status !== 'completed' && (!currentWorkOrder || p.workOrder === currentWorkOrder));

    if (activeProducts.length === 0) {
      elements.processStripsContainer.innerHTML = '<p>No active production items</p>';
      return;
    }

    const grouped = {};
    activeProducts.forEach(p => {
      const key = `${p.workOrder}-${p.material}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });

    Object.entries(grouped).forEach(([key, group]) => {
      const { workOrder, component, material } = group[0];
      const processes = group[0].processPath;

      const strip = document.createElement('div');
      strip.className = 'material-strip';

      const header = createStripHeader(workOrder, component, material, processes, group);
      const cardStack = createCardStack(processes, group);

      strip.appendChild(header);
      strip.appendChild(cardStack);
      elements.processStripsContainer.appendChild(strip);
    });

    updatePauseDurationTable();
    restoreExpandedStrip();
  };

  const createStripHeader = (workOrder, component, material, processes, group) => {
    const header = document.createElement('div');
    header.className = 'strip-header';
    
    const statusDots = processes.map(pid => {
      const isCompleted = group.some(g => {
        const indexInPath = g.processPath.indexOf(pid);
        return g.status === 'completed' || g.processIndex > indexInPath;
      });
      
      const isCurrent = group.some(g => g.processId === pid && g.status === 'in-progress');
      const isStopped = group.some(g => g.processId === pid && g.status === 'stop');
      
      const color = isCompleted ? STATUS_COLORS['completed'] :
                   isCurrent ? STATUS_COLORS['in-progress'] :
                   isStopped ? STATUS_COLORS['stop'] :
                   STATUS_COLORS['waiting'];
      
      const processName = group[0].processNames?.[pid] || pid;
      
      return `
        <div class="dot-wrapper">
          <span class="dot" style="background-color: ${color};" title="${processName}"></span>
          <div class="dot-label">${processName}</div>
        </div>
      `;
    }).join('');

    header.innerHTML = `
      <span class="material-title">(W/O: ${workOrder}) | ${component} | ${material}</span>
      <div class="status-dots">${statusDots}</div>
      <button class="toggle-btn">▼</button>
    `;

    const toggleBtn = header.querySelector('.toggle-btn');
    
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const strip = header.closest('.material-strip');
      const cardStack = strip.querySelector('.card-stack');
      
      if (!cardStack) {
        console.error('Card stack not found in strip');
        return;
      }
      
      const computedStyle = window.getComputedStyle(cardStack);
      const isCurrentlyHidden = computedStyle.display === 'none';
      
      if (isCurrentlyHidden) {
        cardStack.style.setProperty('display', 'flex', 'important');
        toggleBtn.textContent = '▲';
        state.currentlyOpenMaterial = `${workOrder}-${material}`;
      } else {
        cardStack.style.setProperty('display', 'none', 'important');
        toggleBtn.textContent = '▼';
        state.currentlyOpenMaterial = null;
      }
    });

    return header;
  };

  const createCardStack = (processes, group) => {
    const cardStack = document.createElement('div');
    cardStack.className = 'card-stack';
    cardStack.style.setProperty('display', 'none', 'important');

    processes.forEach(pid => {
      const processName = group[0].processNames?.[pid] || pid;
      const itemsAtThisProcess = group.filter(g => g.processId === pid);

      const card = document.createElement('div');
      card.className = 'process-card';

      if (itemsAtThisProcess.length === 0) {
        card.innerHTML = `
          <h3><span class="process-name">${processName}</span></h3>
          <p>Total: <span class="total">0</span></p>
          <div class="material-tags">
            <div class="material-tag" style="background-color:${STATUS_COLORS['waiting']}">
              <small>No items at this process</small>
            </div>
          </div>
        `;
      } else {
        const materialTags = itemsAtThisProcess.map(p => {
          let durationDisplay = '';
          
          if (p.status === 'stop' && p.inProcessDuration) {
            durationDisplay = `<small>Time: ${formatDuration(p.inProcessDuration)}</small><br>`;
          }

          return `
            <div class="material-tag" style="background-color:${STATUS_COLORS[p.status]}">
              <strong>WO: ${p.workOrder}</strong><br>
              <small>${p.machine} | ${p.material}</small><br>
              <span>Status: <b>${p.status}</b></span><br>
              ${durationDisplay}
              <div class="btn-group">
                <button class="toggle-btn" data-id="${p.id}">${p.status === 'stop' ? '▹' : '▶'}</button>
                <button class="next-btn" data-id="${p.id}">⭢</button>
              </div>
            </div>
          `;
        }).join('');

        card.innerHTML = `
          <h3><span class="process-name">${processName}</span></h3>
          <p>Total: <span class="total">${itemsAtThisProcess.length}</span></p>
          <div class="material-tags">${materialTags}</div>
        `;
      }

      cardStack.appendChild(card);
    });

    return cardStack;
  };

  const restoreExpandedStrip = () => {
    if (!state.currentlyOpenMaterial) return;
    
    const [workOrder, material] = state.currentlyOpenMaterial.split('-');
    
    const allStrips = document.querySelectorAll('.material-strip');
    allStrips.forEach(strip => {
      const titleEl = strip.querySelector('.material-title');
      
      if (titleEl?.textContent.includes(material) && titleEl?.textContent.includes(workOrder)) {
        const cardStack = strip.querySelector('.card-stack');
        const toggleBtn = strip.querySelector('.toggle-btn');
        
        if (cardStack) {
          cardStack.style.setProperty('display', 'flex', 'important');
        }
        if (toggleBtn) {
          toggleBtn.textContent = '▲';
        }
      }
    });
  };

  const createOrUpdateWorkOrderTable = (workOrder, typedMachineName) => {
    hideAllWorkOrderTables();
    
    let workOrderTable = document.querySelector(`#table-${workOrder}`);
    
    if (!workOrderTable) {
      const container = document.createElement('div');
      container.className = 'workorder-table-container';

      const title = document.createElement('h3');
      title.textContent = `Work Order: ${workOrder} | Machine Name: ${typedMachineName}`;
      container.appendChild(title);

      const table = document.createElement('table');
      table.id = `table-${workOrder}`;
      table.innerHTML = `
        <thead>
          <tr>
            <th>Work Order</th>
            <th>Machine Name</th>
            <th>Department</th>
            <th>Type</th>
            <th>Component</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      container.appendChild(table);
      
      let tableSection = document.querySelector('.table-section');
      if (!tableSection) {
        tableSection = document.createElement('div');
        tableSection.className = 'table-section';
        document.body.appendChild(tableSection);
      }
      
      tableSection.appendChild(container);
      workOrderTable = table;
    }
    
    workOrderTable.closest('.workorder-table-container').style.display = 'block';
    return workOrderTable;
  };

  // Event Handlers
  const handleWorkOrderInput = () => {
    const workOrder = elements.workOrderInput.value.trim();
    hideAllWorkOrderTables();

    if (!workOrder) return;

    const workOrderTable = document.querySelector(`#table-${workOrder}`);
    if (workOrderTable) {
      workOrderTable.closest('.workorder-table-container').style.display = 'block';
    } else if (state.workOrderTables[workOrder]) {
      createWorkOrderTableFromData(state.workOrderTables[workOrder]);
      const newTable = document.querySelector(`#table-${workOrder}`);
      if (newTable) {
        newTable.closest('.workorder-table-container').style.display = 'block';
      }
    }
    renderProcessStrips();
  };

  const handleMachineChange = () => {
    const selectedMachine = elements.machineSelect.value;
    
    elements.componentSelect.innerHTML = '<option value="">Select Type</option>';
    elements.customComponentInput.style.display = 'none';
    state.isCustomComponent = false;
    clearMaterialFields();

    if (!selectedMachine || !state.machineComponentMap[selectedMachine]) return;

    populateComponentDropdown(selectedMachine);
  };

  // Handle component change with "Other" option
  const handleComponentChange = () => {
    const selectedMachine = elements.machineSelect.value;
    const selectedComponent = elements.componentSelect.value;

    // Reset all dependent fields
    elements.materialSelect.innerHTML = '<option value="">Select Component</option>';
    elements.materialSelect.style.display = 'none';
    elements.sizeSelect.style.display = 'none';
    elements.sizeInput.style.display = 'none';
    elements.customMaterialInput.style.display = 'none';
    elements.processCountSelect.style.display = 'none';
    state.isCustomMaterial = false;

    if (selectedComponent === 'other') {
      // Show custom component input
      elements.customComponentInput.style.display = 'inline-block';
      elements.customComponentInput.focus();
      state.isCustomComponent = true;
      
      // For custom components, show material dropdown with "Other" option
      elements.materialSelect.innerHTML = '<option value="">Select Component</option><option value="other">Other</option>';
      elements.materialSelect.style.display = 'inline-block';
      return;
    } else {
      // Hide custom component input
      elements.customComponentInput.style.display = 'none';
      state.isCustomComponent = false;
    }

    if (!selectedMachine || !selectedComponent || !state.machineComponentMap[selectedMachine][selectedComponent]) {
      return;
    }

    populateMaterialDropdown(selectedMachine, selectedComponent);
  };

  // Handle material change with custom support
  const handleMaterialChange = () => {
    const selectedMachine = elements.machineSelect.value;
    const selectedComponent = elements.componentSelect.value;
    const selectedMaterialName = elements.materialSelect.value;

    // Reset size fields
    elements.sizeSelect.innerHTML = '<option value="">Select Size</option>';
    elements.sizeSelect.style.display = 'none';
    elements.sizeInput.style.display = 'none';
    elements.processCountSelect.style.display = 'none';

    if (selectedMaterialName === 'other') {
      // Show custom material input
      elements.customMaterialInput.style.display = 'inline-block';
      elements.customMaterialInput.focus();
      state.isCustomMaterial = true;
      
      // For custom materials, show size input field
      showSizeInput();
      return;
    } else {
      // Hide custom material input
      elements.customMaterialInput.style.display = 'none';
      state.isCustomMaterial = false;
    }

    if (!selectedMachine || !selectedComponent || !selectedMaterialName) return;

    // Handle regular material selection
    if (state.isCustomComponent) {
      // For custom components with regular materials, show size input
      showSizeInput();
      return;
    }

    const materialList = state.machineComponentMap[selectedMachine][selectedComponent];
    const material = materialList.find(m => m.name === selectedMaterialName);

    if (!material) return;

    populateSizeDropdown(material);
    updateProcessData(material);
    
    state.allMaterials = [material.name];
    renderMaterialTable();
    elements.tableContainer.style.display = 'block';
  };

  // Handle size changes - trigger process count selector for custom items
  const handleSizeChange = () => {
    // For custom items, check if we should show process count selector
    if (state.isCustomComponent || state.isCustomMaterial) {
      checkAndShowProcessCountSelector();
    }
  };

  // Handle process count change
  const handleProcessCountChange = () => {
    const processCount = parseInt(elements.processCountSelect.value);
    if (!processCount) return;
    
    // Update process data
    const customProcessData = getCustomProcessData(processCount);
    state.processIDs = customProcessData.processIDs;
    state.processNames = customProcessData.processNames;
    
    // Get current material name
    let materialName = 'Custom Material';
    if (state.isCustomComponent) {
      materialName = elements.customComponentInput.value.trim() || 'Custom Component';
    } else if (state.isCustomMaterial) {
      materialName = elements.customMaterialInput.value.trim() || 'Custom Material';
    }
    
    state.allMaterials = [materialName];
    renderMaterialTable();
    elements.tableContainer.style.display = 'block';
  };

  // Handle custom material input changes
  const handleCustomMaterialInput = () => {
    if (state.isCustomMaterial) {
      const customMaterialName = elements.customMaterialInput.value.trim();
      if (customMaterialName && state.processIDs.length > 0) {
        state.allMaterials = [customMaterialName];
        renderMaterialTable();
      }
    }
  };

  // Handle custom component input changes
  const handleCustomComponentInput = () => {
    if (state.isCustomComponent) {
      const customComponentName = elements.customComponentInput.value.trim();
      if (customComponentName && state.processIDs.length > 0) {
        state.allMaterials = [customComponentName];
        renderMaterialTable();
      }
    }
  };

  // Handle draft add
  const handleDraftAdd = (e) => {
    e.preventDefault();

    const workOrder = elements.workOrderInput.value.trim();
    const machineName = elements.machineNameInput.value.trim();
    const machine = elements.machineSelect.value;
    
    // Handle component - custom or selected
    let component = elements.componentSelect.value;
    if (component === 'other') {
      component = elements.customComponentInput.value.trim();
      if (!component) {
        return alert("Please enter a custom component name.");
      }
    }
    
    // Handle material - custom or selected
    let material = elements.materialSelect.value;
    if (material === 'other') {
      material = elements.customMaterialInput.value.trim();
      if (!material) {
        return alert("Please enter a custom material name.");
      }
    }
    
    // Handle size - input field for custom, dropdown for predefined
    let size = '';
    if (state.isCustomComponent || state.isCustomMaterial) {
      size = elements.sizeInput.value.trim();
    } else {
      size = elements.sizeSelect.value;
    }

    // Get selected processes
    const processPath = Array.from(
      document.querySelectorAll(`input[data-material="${state.allMaterials[0]}"]:checked`)
    ).map(cb => cb.value);

    if (!workOrder || !machineName || !machine || !component || !material || !size || processPath.length === 0) {
      return alert("Please fill all fields and assign processes before adding.");
    }

    // Store process names with the draft item
    const processNamesForDraft = {};
    processPath.forEach(pid => {
      processNamesForDraft[pid] = state.processNames[pid] || pid;
    });

    state.draftProducts.push({ 
      workOrder, 
      machineName, 
      machine, 
      component, 
      material, 
      size, 
      processPath,
      processNames: processNamesForDraft
    });
    
    renderDraftPreview();
    
    // Reset form after adding to draft (keep work order, machine name, and department)
    resetFormAfterDraft();
  };

  // Handle form submit
  const handleFormSubmit = (e) => {
    e.preventDefault();

    const typedMachineName = elements.machineNameInput.value.trim();
    const workOrder = elements.workOrderInput.value.trim();
    const machine = elements.machineSelect.value;
    
    // Handle component - custom or selected
    let component = elements.componentSelect.value;
    if (component === 'other') {
      component = elements.customComponentInput.value.trim();
    }
    
    // Handle material - custom or selected
    let material = elements.materialSelect.value;
    if (material === 'other') {
      material = elements.customMaterialInput.value.trim();
    }
    
    // Handle size - input field for custom, dropdown for predefined
    let size = '';
    if (state.isCustomComponent || state.isCustomMaterial) {
      size = elements.sizeInput.value.trim();
      if (!size) {
        return alert("Please enter a size.");
      }
    } else {
      size = elements.sizeSelect.value;
    }
    
    const materialList = [...state.allMaterials];

    const productionItemsToSend = [];

    // Add draft products (if any)
    state.draftProducts.forEach(draft => {
      const processData = draft.processPath.map((pid, index) => ({
        processId: pid,
        name: draft.processNames[pid] || pid,
        status: index === 0 ? 'waiting' : 'waiting'
      }));

      productionItemsToSend.push({
        workOrder: draft.workOrder,
        machineName: draft.machineName,
        department: draft.machine,
        component: draft.component,
        material: draft.material,
        size: draft.size,
        processPath: processData,
        currentProcessIndex: 0
      });
    });

    // Add regular form items (if any)
    if (workOrder && machine && material && size && materialList.length > 0) {
      materialList.forEach(materialName => {
        const checkedProcesses = Array.from(
          document.querySelectorAll(`input[data-material="${materialName}"]:checked`)
        ).map(cb => cb.value);

        if (checkedProcesses.length > 0) {
          const processNamesForProduct = {};
          checkedProcesses.forEach(pid => {
            processNamesForProduct[pid] = state.processNames[pid] || pid;
          });

          const processData = checkedProcesses.map((pid, index) => ({
            processId: pid,
            name: processNamesForProduct[pid],
            status: index === 0 ? 'waiting' : 'waiting'
          }));

          productionItemsToSend.push({
            workOrder,
            machineName: typedMachineName,
            department: machine,
            component,
            material: materialName,
            size,
            processPath: processData,
            currentProcessIndex: 0
          });
        }
      });
    }

    if (productionItemsToSend.length === 0) {
      alert('Please add items to draft or fill the form before submitting.');
      return;
    }

    console.log("📦 Sending to backend:", productionItemsToSend);

    // Save to backend
    fetch('http://localhost:5000/api/production', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productionItemsToSend)
    })
    .then(res => res.json())
    .then(data => {
      console.log('✅ Saved production items:', data);
      alert('Production data saved successfully!');
      
      // Create work order table immediately
      if (productionItemsToSend.length > 0) {
        const firstItem = productionItemsToSend[0];
        const workOrderTable = createOrUpdateWorkOrderTable(firstItem.workOrder, firstItem.machineName);
        
        // Add all items to the table
        productionItemsToSend.forEach(item => {
          const newRow = document.createElement('tr');
          newRow.innerHTML = `
            <td>${item.workOrder}</td>
            <td>${item.machineName}</td>
            <td>${item.department}</td>
            <td>${item.component}</td>
            <td>${item.material}</td>
            <td>${item.size}</td>
          `;
          workOrderTable.querySelector('tbody').appendChild(newRow);
        });
      }
      
      // Refresh data from backend
      fetchProductionItems();
    })
    .catch(err => {
      console.error('❌ Error saving production data:', err);
      alert('Failed to save production data');
    });

    // Reset form and UI completely
    elements.trackerForm.reset();
    state.allMaterials = [];
    state.draftProducts = [];
    state.isCustomComponent = false;
    state.isCustomMaterial = false;
    elements.materialProcessTable.innerHTML = '';
    elements.tableContainer.style.display = 'none';
    elements.materialSelect.style.display = 'none';
    elements.sizeSelect.style.display = 'none';
    elements.sizeInput.style.display = 'none';
    elements.customComponentInput.style.display = 'none';
    elements.customMaterialInput.style.display = 'none';
    elements.processCountSelect.style.display = 'none';

    renderDraftPreview();
    updateStepStatus();
    document.getElementById('step-submit')?.classList.add('active');
  };

  const handleProcessStripClick = (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    
    const item = state.products.find(p => p.id === id);
    if (!item) return;

    const wasExpanded = state.currentlyOpenMaterial;
    const key = `${item.id}-${item.processIndex}`;

    if (e.target.classList.contains('toggle-btn')) {
      if (item.status === 'waiting') {
        item.status = 'in-progress';
        item.startTime = new Date();
        state.processStartTimes[key] = item.startTime;
        
      } else if (item.status === 'in-progress') {
        item.status = 'stop';
        item.pauseTime = new Date();
        
        if (state.processStartTimes[key]) {
          item.inProcessDuration = item.pauseTime - state.processStartTimes[key];
        }
        
        delete state.processStartTimes[key];
      }
    }

    if (e.target.classList.contains('next-btn')) {
      if (item.status === 'stop') {
        if (item.pauseTime) {
          const now = new Date();
          const haltDuration = now - item.pauseTime;
          const fromProcess = item.processNames?.[item.processPath[item.processIndex]] || item.processPath[item.processIndex];
          const toProcess = item.processIndex < item.processPath.length - 1
            ? item.processNames?.[item.processPath[item.processIndex + 1]] || item.processPath[item.processIndex + 1]
            : 'Completed';

          const haltRecord = {
            workOrder: item.workOrder,
            machine: item.machine,
            type: item.component,
            component: item.material,
            fromProcess,
            toProcess,
            duration: haltDuration
          };

          saveHaltDurationRecord(haltRecord);
        }

        if (item.processIndex < item.processPath.length - 1) {
          item.processIndex++;
          item.processId = item.processPath[item.processIndex];
          item.status = 'waiting';
          item.startTime = null;
          item.pauseTime = null;
          item.inProcessDuration = null;
        } else {
          item.status = 'completed';
          item.pauseTime = null;
        }
      }
    }

    // Save status update to backend
    fetch(`http://localhost:5000/api/production/${item.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentProcessIndex: item.processIndex,
        status: item.status,
        startTime: item.startTime,
        pauseTime: item.pauseTime,
        inProcessDuration: item.inProcessDuration,
        pauseToNextDuration: item.pauseToNextDuration,
        processPath: item.processPath.map((pid, idx) => ({
          processId: pid,
          name: item.processNames?.[pid] || pid,
          status: idx === item.processIndex ? item.status : (idx < item.processIndex ? 'completed' : 'waiting')
        }))
      })
    })
    .then(res => res.json())
    .then(data => {
      console.log(`✅ Updated item [${item.id}]`, data);
      state.currentlyOpenMaterial = wasExpanded;
      renderProcessStrips();
    })
    .catch(err => {
      console.error('❌ Error updating item:', err);
      state.currentlyOpenMaterial = wasExpanded;
      renderProcessStrips();
    });
  };

  const handleDraftPreviewClick = (e) => {
    if (e.target.classList.contains('remove-draft-btn')) {
      const index = e.target.dataset.index;
      state.draftProducts.splice(index, 1);
      renderDraftPreview();
    }
  };

  // Setup Event Listeners
  const setupEventListeners = () => {
    elements.workOrderInput.addEventListener('input', handleWorkOrderInput);
    elements.machineSelect.addEventListener('change', handleMachineChange);
    elements.componentSelect.addEventListener('change', handleComponentChange);
    elements.materialSelect.addEventListener('change', handleMaterialChange);
    elements.sizeSelect.addEventListener('change', handleSizeChange);
    elements.sizeInput.addEventListener('input', handleSizeChange);
    elements.processCountSelect.addEventListener('change', handleProcessCountChange);
    elements.customMaterialInput.addEventListener('input', handleCustomMaterialInput);
    elements.customComponentInput.addEventListener('input', handleCustomComponentInput);
    elements.typeAddBtn.addEventListener('click', handleDraftAdd);
    elements.trackerForm.addEventListener('submit', handleFormSubmit);
    elements.processStripsContainer.addEventListener('click', handleProcessStripClick);
    elements.draftPreviewTable.addEventListener('click', handleDraftPreviewClick);
  };

  const updateStepStatus = () => {
    console.log('Step status updated');
  };

  // Initialize the application
  init();
});