import axios from "axios";
import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import { ROOT_DIR, UPLOAD_DIR, SUMMARY_DIR } from "../config/paths.js";
import { mapEntryToPaper } from "../models/paperModel.js";

const parser = new xml2js.Parser({ explicitArray: false });

const parseFeedEntries = async (xmlData) => {
  const result = await parser.parseStringPromise(xmlData);
  let entries = result.feed.entry || [];
  if (!Array.isArray(entries)) {
    entries = [entries];
  }
  return entries.filter(Boolean);
};

export const fetchPapers = async (req, res) => {
  try {
    const { category = "cs.AI", max_results = 5 } = req.body;
    console.log(`📡 Fetching ${max_results} papers from arXiv: ${category}`);

    const url = `http://export.arxiv.org/api/query?search_query=cat:${category}&max_results=${max_results}`;
    const response = await axios.get(url);

    const entries = await parseFeedEntries(response.data);
    const papers = entries.map(mapEntryToPaper).filter(Boolean);

    fs.writeFileSync(
      path.join(ROOT_DIR, "fetched_papers.json"),
      JSON.stringify(papers, null, 2)
    );
    console.log(`Saved ${papers.length} papers`);

    res.json({ count: papers.length, papers });
  } catch (err) {
    console.error("Error fetching papers:", err.message);
    res.status(500).json({ error: "Failed to fetch papers" });
  }
};

export const fetchAndSummarize = async (req, res) => {
  try {
    const { category = "cs.AI", max_results = 1 } = req.body;
    console.log(`📡 Fetching from arXiv: ${category}`);

    const url = `http://export.arxiv.org/api/query?search_query=cat:${category}&max_results=${max_results}`;
    const response = await axios.get(url);
    const entries = await parseFeedEntries(response.data);

    if (!entries.length) {
      return res.json({ message: "No papers found." });
    }

    const paper = mapEntryToPaper(entries[0]);
    if (!paper?.pdf_url) {
      console.error("❌ Could not extract PDF URL:", entries[0]);
      return res.status(400).json({ error: "Could not find PDF URL for this paper" });
    }

    console.log(`📥 Downloading: ${paper.title}`);
    const pdfResponse = await axios.get(paper.pdf_url, { responseType: "arraybuffer" });
    const safeTitle = paper.title.replace(/[^\w\s]/g, "_");
    const pdfPath = path.join(UPLOAD_DIR, `${safeTitle}.pdf`);
    fs.writeFileSync(pdfPath, pdfResponse.data);

    console.log(`⚙️ Summarizing ${paper.title} ...`);
    const summaryResponse = await axios.post("http://127.0.0.1:8000/structured_summary", {
      path: pdfPath,
      metadata: paper,
    });

    const summaryData = summaryResponse.data;
    const summaryFile = path.join(SUMMARY_DIR, `${safeTitle}_summary.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summaryData, null, 2));

    const downloadUrl = `http://localhost:${process.env.PORT || 5000}/download/${encodeURIComponent(
      path.basename(summaryFile)
    )}`;
    console.log(`✅ Done: ${paper.title}`);

    res.json({
      message: "Summary generated successfully",
      paper_title: paper.title,
      download_url: downloadUrl,
      summary: summaryData,
    });
  } catch (err) {
    console.error("Error in /fetch_and_summarize:", err.message);
    res.status(500).json({ error: "Failed to fetch and summarize paper" });
  }
};

