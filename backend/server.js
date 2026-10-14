/* ─────────────────────────────────────────────
   PlantDoctor · server.js  |  Crop IQ | SIH 2025
   Express + MongoDB Atlas Backend
───────────────────────────────────────────── */

const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const path       = require("path");

const app  = express();
const PORT = 5000;

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ── Serve frontend files from ../frontend folder ──
app.use(express.static(path.join(__dirname, "../frontend")));

/* ══════════════════════════════════════════
   MONGODB ATLAS CONNECTION
══════════════════════════════════════════ */
const MONGO_URL = process.env.MONGO_URL || 
  "mongodb://cropiq:Cropiq2025@ac-u7bbgpi-shard-00-00.o2mbevn.mongodb.net:27017,ac-u7bbgpi-shard-00-01.o2mbevn.mongodb.net:27017,ac-u7bbgpi-shard-00-02.o2mbevn.mongodb.net:27017/plantdoctor?ssl=true&replicaSet=atlas-o5tert-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URL, {
  family: 4,                        // ✅ Force IPv4 — fixes querySrv ECONNREFUSED
  serverSelectionTimeoutMS: 10000,  // 10 sec timeout
  connectTimeoutMS: 10000,
})
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch(err => console.warn("⚠️  MongoDB not connected — history won't persist:", err.message));

/* ══════════════════════════════════════════
   SCHEMA & MODEL
══════════════════════════════════════════ */
const ProductSchema = new mongoose.Schema({
  name:      String,
  type:      String,
  dosage:    String,
  frequency: String
}, { _id: false });

const ScanSchema = new mongoose.Schema({
  cropType:            { type: String, required: true },
  diseaseName:         { type: String, required: true },
  severity:            { type: String, enum: ["High","Medium","Low","None"], default: "Low" },
  confidence:          { type: Number, default: 0 },
  overview:            String,
  symptoms:            [String],
  treatment:           [String],
  prevention:          [String],
  recommendedProducts: [ProductSchema],
  mode:                String,
  createdAt:           { type: Date, default: Date.now }
});

const Scan = mongoose.models.Scan || mongoose.model("Scan", ScanSchema);

/* ══════════════════════════════════════════
   ROUTES
══════════════════════════════════════════ */

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "PlantDoctor backend running 🌱" });
});

// Save a scan
app.post("/api/scans/save", async (req, res) => {
  try {
    const scan = new Scan(req.body);
    await scan.save();
    res.json({ success: true, id: scan._id });
  } catch (err) {
    console.error("Save error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get scan history (latest 50)
app.get("/api/scans/history", async (req, res) => {
  try {
    const scans = await Scan.find().sort({ createdAt: -1 }).limit(50);
    res.json({ scans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a scan
app.delete("/api/scans/:id", async (req, res) => {
  try {
    await Scan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════
   START SERVER  (0.0.0.0 = accessible on WiFi)
══════════════════════════════════════════ */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🌱 PlantDoctor Backend running!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   WiFi:    http://<your-laptop-IP>:${PORT}`);
  console.log(`\n📱 To find your WiFi IP:`);
  console.log(`   Windows  → cmd: ipconfig  (look for IPv4 Address)`);
  console.log(`\n🔗 Open this on your mobile: http://<your-IP>:${PORT}\n`);
});