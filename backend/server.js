// ✅ backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/inventorydb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ API Routes
app.use("/api/items", require("./routes/itemRoutes"));                    // Bought-out inventory items
app.use("/api/machines", require("./routes/machineRoutes"));              // Machines + Materials
app.use("/api/production", require("./routes/productionRoutes"));         // Production routes
app.use("/api/purchases", require("./routes/purchaseRoutes"));            // Purchase management
app.use("/api/manufacturing-items", require("./routes/manufacturingItemRoutes")); // Manufacturing inventory
app.use("/api/issue-to-wip", require("./routes/issueRoutes"));            // Issue to WIP management

// ✅ Serve frontend (if needed in production/local testing)
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Inventory Management System API is running',
    timestamp: new Date().toISOString()
  });
});

// ✅ 404 handler for API routes
app.use(/^\/api\/.*$/, (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.path 
  });
});


// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   POST /api/items - Bought-out inventory items`);
  console.log(`   POST /api/purchases - Purchase management`);
  console.log(`   GET  /api/manufacturing-items - Manufacturing inventory`);
});