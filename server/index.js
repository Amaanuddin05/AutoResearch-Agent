import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import multer from "multer";
import path from "path"; 
import { fileURLToPath } from "url"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const filePath = path.resolve(__dirname, req.file.path);
    console.log(`📂 Received file: ${filePath}`);

    const response = await axios.post("http://127.0.0.1:8000/summarize_pdf", {
      path: filePath,
    });

    console.log("\nSummary:\n", response.data.summary);
    res.json(response.data);

    fs.unlink(filePath, (err) => {
      if (err) console.error("Failed to delete temp file:", err);
    });
  } catch (err) {
    console.error("Error in /upload:", err.message);
    res.status(500).json({ error: "Failed to summarize PDF" });
  }
});

app.post("/fetch", async (req, res) => {
  const { url } = req.body;
  try {
    if (!url) return res.status(400).json({ error: "Missing PDF URL" });

    const response = await axios.get(url, { responseType: "arraybuffer" });
    const fileName = path.resolve(__dirname, "paper.pdf");

    fs.writeFileSync(fileName, response.data);
    console.log(`Downloaded PDF: ${fileName}`);
    res.json({ message: "PDF downloaded successfully", path: fileName });
  } catch (error) {
    console.error("Error fetching paper:", error.message);
    res.status(500).json({ error: "Failed to fetch paper" });
  }
});

app.post("/summarize", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const response = await axios.post("http://127.0.0.1:8000/summarize", { text });
    res.json(response.data);
  } catch (err) {
    console.error("Error contacting summarizer:", err.message);
    res.status(500).json({ error: "Failed to contact summarizer service" });
  }
});
app.post("/insight", (req, res) => {
  res.json({ message: "Insight endpoint placeholder" });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
