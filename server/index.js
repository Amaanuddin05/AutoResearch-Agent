import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import multer from "multer";
import path from "path"; // ✅ FIX: import path here
import { fileURLToPath } from "url"; // ✅ needed for __dirname in ES modules

// ---------------------------------------------
// 🧩 Setup directory helpers
// ---------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------
// 🧩 Express setup
// ---------------------------------------------
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------------------------------------
// 📂 Multer config
// ---------------------------------------------
const upload = multer({ dest: "uploads/" });

// ---------------------------------------------
// 🧠 Upload + Summarize route
// ---------------------------------------------
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    // ✅ Convert relative upload path to absolute
    const filePath = path.resolve(__dirname, req.file.path);
    console.log(`📂 Received file: ${filePath}`);

    // ✅ Send absolute path to FastAPI
    const response = await axios.post("http://127.0.0.1:8000/summarize_pdf", {
      path: filePath,
    });

    console.log("\n🧠 Summary:\n", response.data.summary);
    res.json(response.data);

    // 🧹 Delete temp file safely
    fs.unlink(filePath, (err) => {
      if (err) console.error("⚠️ Failed to delete temp file:", err);
    });
  } catch (err) {
    console.error("❌ Error in /upload:", err.message);
    res.status(500).json({ error: "Failed to summarize PDF" });
  }
});

// ---------------------------------------------
// 📥 /fetch - download a paper via URL
// ---------------------------------------------
app.post("/fetch", async (req, res) => {
  const { url } = req.body;
  try {
    if (!url) return res.status(400).json({ error: "Missing PDF URL" });

    const response = await axios.get(url, { responseType: "arraybuffer" });
    const fileName = path.resolve(__dirname, "paper.pdf");

    fs.writeFileSync(fileName, response.data);
    console.log(`📥 Downloaded PDF: ${fileName}`);
    res.json({ message: "PDF downloaded successfully", path: fileName });
  } catch (error) {
    console.error("❌ Error fetching paper:", error.message);
    res.status(500).json({ error: "Failed to fetch paper" });
  }
});

// ---------------------------------------------
// 🧠 /summarize - summarize plain text
// ---------------------------------------------
app.post("/summarize", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const response = await axios.post("http://127.0.0.1:8000/summarize", { text });
    res.json(response.data);
  } catch (err) {
    console.error("❌ Error contacting summarizer:", err.message);
    res.status(500).json({ error: "Failed to contact summarizer service" });
  }
});

// ---------------------------------------------
// 🔍 /insight - placeholder for next phase
// ---------------------------------------------
app.post("/insight", (req, res) => {
  res.json({ message: "Insight endpoint placeholder" });
});

// ---------------------------------------------
// 🚀 Start server
// ---------------------------------------------
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
