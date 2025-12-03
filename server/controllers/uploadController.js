import axios from "axios";
import fs from "fs";
import path from "path";

export const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const filePath = path.resolve(req.file.path);
    console.log(`Received file: ${filePath}`);

    const response = await axios.post("http://127.0.0.1:8000/analyze_paper", {
      path: filePath,
      metadata: {
        title: req.file.originalname.replace(".pdf", ""),
        source: "upload"
      }
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
};

