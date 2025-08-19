const express = require('express');
const router = express.Router();
const { ProductionItem, HaltDuration } = require('../models/ProductionItem');

// POST: Save production items
router.post('/', async (req, res) => {
  try {
    const items = req.body;
    console.log('📦 Received production items:', items);
    
    // Validate that items is an array
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Expected an array of production items' });
    }

    const result = await ProductionItem.insertMany(items);
    console.log('✅ Saved production items:', result.length);
    res.status(201).json(result);
  } catch (error) {
    console.error("❌ Error saving production items:", error);
    res.status(500).json({ error: 'Failed to save production items' });
  }
});

// GET: Fetch all production items
router.get('/', async (req, res) => {
  try {
    const items = await ProductionItem.find().sort({ workOrder: 1, component: 1 });
    console.log(`📋 Fetched ${items.length} production items`);
    res.status(200).json(items);
  } catch (error) {
    console.error("❌ Error fetching production items:", error);
    res.status(500).json({ error: 'Failed to fetch production items' });
  }
});

// PATCH: Update process status - FIXED VERSION
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    console.log(`🔄 Updating item ${id}:`, update);

    const item = await ProductionItem.findById(id);
    if (!item) {
      console.log(`❌ Item not found: ${id}`);
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update the current process index
    if (typeof update.currentProcessIndex === 'number') {
      item.currentProcessIndex = update.currentProcessIndex;
    }

    // Update the specific process in the processPath array
    if (item.processPath && item.processPath[item.currentProcessIndex]) {
      const currentProcess = item.processPath[item.currentProcessIndex];
      
      // Update individual fields
      if (update.status) currentProcess.status = update.status;
      if (update.startTime) currentProcess.startTime = update.startTime;
      if (update.pauseTime) currentProcess.pauseTime = update.pauseTime;
      if (update.inProcessDuration) currentProcess.inProcessDuration = update.inProcessDuration;
      if (update.pauseToNextDuration) currentProcess.pauseToNextDuration = update.pauseToNextDuration;
    }

    // If processPath array is provided, update the entire processPath
    if (update.processPath && Array.isArray(update.processPath)) {
      item.processPath = update.processPath;
    }

    await item.save();
    console.log(`✅ Updated item ${id} successfully`);
    res.status(200).json(item);
  } catch (error) {
    console.error("❌ Error updating process:", error);
    res.status(500).json({ error: 'Failed to update process' });
  }
});

// NEW: POST route to save halt duration records
router.post('/halt-duration', async (req, res) => {
  try {
    const haltRecord = req.body;
    console.log('📝 Saving halt duration record:', haltRecord);
    
    const result = await HaltDuration.create(haltRecord);
    console.log('✅ Saved halt duration record:', result);
    res.status(201).json(result);
  } catch (error) {
    console.error("❌ Error saving halt duration:", error);
    res.status(500).json({ error: 'Failed to save halt duration record' });
  }
});

// NEW: GET route to fetch all halt duration records
router.get('/halt-duration', async (req, res) => {
  try {
    const haltRecords = await HaltDuration.find().sort({ createdAt: -1 });
    console.log(`📋 Fetched ${haltRecords.length} halt duration records`);
    res.status(200).json(haltRecords);
  } catch (error) {
    console.error("❌ Error fetching halt duration records:", error);
    res.status(500).json({ error: 'Failed to fetch halt duration records' });
  }
});

// DELETE: Remove completed items (optional - for cleanup)
router.delete('/completed', async (req, res) => {
  try {
    const result = await ProductionItem.deleteMany({
      'processPath.status': 'completed',
      currentProcessIndex: { $gte: 0 }
    });
    
    console.log(`🗑️ Deleted ${result.deletedCount} completed items`);
    res.status(200).json({ message: `${result.deletedCount} completed items deleted` });
  } catch (error) {
    console.error("❌ Error deleting completed items:", error);
    res.status(500).json({ error: 'Failed to delete completed items' });
  }
});

module.exports = router;