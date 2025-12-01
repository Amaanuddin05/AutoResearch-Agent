import axios from "axios";
import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import { ROOT_DIR, UPLOAD_DIR, SUMMARY_DIR } from "../config/paths.js";
import { mapEntryToPaper } from "../models/paperModel.js";
import { getPaperMetadata } from "../services/semanticScholarService.js";

const parser = new xml2js.Parser({ explicitArray: false });

const parseFeedEntries = async (xmlData) => {
  const result = await parser.parseStringPromise(xmlData);
  let entries = result.feed.entry || [];
  if (!Array.isArray(entries)) entries = [entries];
  return entries.filter(Boolean);
};

const validateInputs = (query, category, filter, max_results) => {
  if (query && typeof query !== "string") return false;
  if (category && typeof category !== "string") return false;
  if (!["all", "recent", "popular"].includes(filter)) return false;
  if (isNaN(max_results)) return false;
  return true;
};

const buildTitleQuery = (text) => {
  const words = text.trim().split(/\s+/);
  const q = words.map((w) => `all:${w}`).join("+AND+");
  return q;
};

const buildCategoryQuery = (category, filter) => {
  let base = `search_query=cat:${category}`;
  if (filter === "recent") {
    base += `&sortBy=submittedDate&sortOrder=descending`;
  }
  return base;
};

const normalizePaper = (paper) => {
  return {
    id: paper.id || null,
    arxiv_id: paper.arxiv_id || null,
    doi: paper.doi || null,
    title: paper.title || null,
    summary: paper.summary || null,
    authors: paper.authors || [],
    published: paper.published || null,
    updated: paper.updated || null,
    pdf_url: paper.pdf_url || null,
    link: paper.link || null,
    citationCount: paper.citationCount || 0,
    influentialCitationCount: paper.influentialCitationCount || 0,
    source: "arxiv"
  };
};

export const fetchPapers = async (req, res) => {
  try {
    const { query, category = "cs.AI", filter = "all", max_results = 5 } = req.body;

    if (!validateInputs(query, category, filter, max_results)) {
      return res.status(400).json({ error: "Invalid input parameters" });
    }

    let url;

    if (query && query.trim().length > 0) {
      const q = buildTitleQuery(query);
      url = `http://export.arxiv.org/api/query?search_query=${q}&max_results=${max_results}`;
    } else {
      const q = buildCategoryQuery(category, filter);
      url = `http://export.arxiv.org/api/query?${q}&max_results=${max_results}`;
    }

    const response = await axios.get(url);
    const entries = await parseFeedEntries(response.data);

    let papers = entries.map(mapEntryToPaper);

    if (filter === "popular") {
      const enriched = [];
      for (const p of papers) {
        const meta = await getPaperMetadata(p);
        const merged = {
          ...p,
          citationCount: meta?.citationCount || 0,
          influentialCitationCount: meta?.influentialCitationCount || 0
        };
        enriched.push(merged);
      }
      papers = enriched.sort((a, b) => b.citationCount - a.citationCount);
    }

    papers = papers.map(normalizePaper);

    fs.writeFileSync(
      path.join(ROOT_DIR, "fetched_papers.json"),
      JSON.stringify(papers, null, 2)
    );

    res.json({ count: papers.length, papers });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch papers" });
  }
};

export const fetchAndSummarize = async (req, res) => {
  try {
    const { query, category = "cs.AI", filter = "all", max_results = 1 } = req.body;

    if (!validateInputs(query, category, filter, max_results)) {
      return res.status(400).json({ error: "Invalid input parameters" });
    }

    let url;

    if (query && query.trim().length > 0) {
      const q = buildTitleQuery(query);
      url = `http://export.arxiv.org/api/query?search_query=${q}&max_results=${max_results}`;
    } else {
      const q = buildCategoryQuery(category, filter);
      url = `http://export.arxiv.org/api/query?${q}&max_results=${max_results}`;
    }

    const response = await axios.get(url);
    const entries = await parseFeedEntries(response.data);

    if (!entries.length) return res.json({ message: "No papers found." });

    let paper = mapEntryToPaper(entries[0]);

    if (filter === "popular") {
      const meta = await getPaperMetadata(paper);
      paper = {
        ...paper,
        citationCount: meta?.citationCount || 0,
        influentialCitationCount: meta?.influentialCitationCount || 0
      };
    }

    paper = normalizePaper(paper);

    if (!paper.pdf_url) return res.status(400).json({ error: "Could not find PDF URL" });

    const pdfResponse = await axios.get(paper.pdf_url, { responseType: "arraybuffer" });
    const safeTitle = paper.title.replace(/[^\w\s]/g, "_");
    const pdfPath = path.join(UPLOAD_DIR, `${safeTitle}.pdf`);
    fs.writeFileSync(pdfPath, pdfResponse.data);

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

    res.json({
      message: "Summary generated successfully",
      paper_title: paper.title,
      download_url: downloadUrl,
      summary: summaryData,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch and summarize paper" });
  }
};
