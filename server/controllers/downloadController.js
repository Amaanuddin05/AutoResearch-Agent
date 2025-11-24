import fs from "fs";
import path from "path";
import { SUMMARY_DIR } from "../config/paths.js";

export const downloadSummary = (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(SUMMARY_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.download(filePath, fileName, (err) => {
    if (err) console.error("Download error:", err.message);
  });
};

