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

const UPLOAD_DIR = path.join(__dirname, "uploads");
const SUMMARY_DIR = path.join(__dirname, "summaries");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(SUMMARY_DIR)) fs.mkdirSync(SUMMARY_DIR);

const upload = multer({ dest: UPLOAD_DIR });

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No PDF file uploaded" });

    const filePath = path.resolve(__dirname, req.file.path);
    console.log(`Received file: ${filePath}`);

    const response = await axios.post("http://127.0.0.1:8000/summarize_pdf", {
      path: filePath,
    });

    console.log("Summary generated");
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
    console.log(`📡 Fetching ${max_results} papers from arXiv: ${category}`);

    const url = `http://export.arxiv.org/api/query?search_query=cat:${category}&max_results=${max_results}`;
    const response = await axios.get(url);
    const xmlData = response.data;

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);

    const entries = result.feed.entry || [];
    const papers = (Array.isArray(entries) ? entries : [entries]).map((entry) => ({
      title: entry.title?.trim(),
      authors: Array.isArray(entry.author)
        ? entry.author.map((a) => a.name).join(", ")
        : entry.author?.name || "Unknown",
      summary: entry.summary?.trim(),
      pdf_url: Array.isArray(entry.link)
        ? entry.link.find((l) => l.$.type === "application/pdf")?.$.href || null
        : null,
      published: entry.published || "Unknown",
    }));

    fs.writeFileSync(path.join(__dirname, "fetched_papers.json"), JSON.stringify(papers, null, 2));
    console.log(`Saved ${papers.length} papers`);

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

app.post("/fetch_and_summarize", async (req, res) => {
  const { category = "cs.AI", max_results = 1 } = req.body;

  try {
    console.log(`📡 Fetching from arXiv: ${category}`);

    const url = `http://export.arxiv.org/api/query?search_query=cat:${category}&max_results=${max_results}`;
    const response = await axios.get(url);
    const xml = response.data;

    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    if (!entries.length) return res.json({ message: "No papers found." });

    const firstBlock = entries[0][1];
    const title = (firstBlock.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim();
    const authors = [...firstBlock.matchAll(/<name>(.*?)<\/name>/g)].map((a) => a[1]).join(", ");
    const pdf_url = (firstBlock.match(/<link title="pdf" href="(.*?)"/) || [])[1];
    const published = (firstBlock.match(/<published>(.*?)<\/published>/) || [])[1];

    const paper = { title, authors, pdf_url, published };

    console.log(`📥 Downloading: ${title}`);
    const pdfResponse = await axios.get(pdf_url, { responseType: "arraybuffer" });

    const safeTitle = title.replace(/[^\w\s]/g, "_");
    const pdfPath = path.join(UPLOAD_DIR, `${safeTitle}.pdf`);
    fs.writeFileSync(pdfPath, pdfResponse.data);

    console.log(`⚙️ Summarizing ${title} ...`);
    const summaryResponse = await axios.post("http://127.0.0.1:8000/structured_summary", {
      path: pdfPath,
      metadata: paper,
    });

    const summaryData = summaryResponse.data;

    const summaryFile = path.join(SUMMARY_DIR, `${safeTitle}_summary.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summaryData, null, 2));

    const downloadUrl = `http://localhost:5000/download/${encodeURIComponent(path.basename(summaryFile))}`;

    console.log(`Done: ${title}`);
    res.json({
      message: "Summary generated successfully",
      paper_title: title,
      download_url: downloadUrl,
      summary: summaryData,
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Failed to fetch and summarize paper" });
  }
});

app.get("/download/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(SUMMARY_DIR, fileName);

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });

  res.download(filePath, fileName, (err) => {
    if (err) console.error("Download error:", err.message);
  });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
