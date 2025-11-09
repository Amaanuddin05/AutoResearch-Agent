import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import multer from "multer";
import xml2js from "xml2js";
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
  try {
    const { category = "cs.AI", max_results = 5 } = req.body;

    console.log(`📡 Fetching latest papers from arXiv: ${category} (${max_results} results)`);

    const url = `http://export.arxiv.org/api/query?search_query=cat:${category}&max_results=${max_results}`;
    const response = await axios.get(url);
    const xmlData = response.data;

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);

    const entries = result.feed.entry || [];

    const papers = entries.map((entry) => ({
      title: entry.title.trim(),
      authors: Array.isArray(entry.author)
        ? entry.author.map((a) => a.name).join(", ")
        : entry.author.name,
      summary: entry.summary.trim(),
      link: entry.id,
      pdf_url: Array.isArray(entry.link)
        ? entry.link.find((l) => l.$.type === "application/pdf")?.$.href || null
        : null,
      published: entry.published,
    }));

    const filePath = path.resolve("fetched_papers.json");
    fs.writeFileSync(filePath, JSON.stringify(papers, null, 2));

    console.log(`Saved ${papers.length} papers to ${filePath}`);

    res.json({ count: papers.length, papers });
  } catch (err) {
    console.error("Error fetching papers:", err.message);
    res.status(500).json({ error: "Failed to fetch papers" });
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
