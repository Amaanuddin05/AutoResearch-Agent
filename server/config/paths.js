import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const SUMMARY_DIR = path.join(ROOT_DIR, "summaries");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(UPLOAD_DIR);
ensureDir(SUMMARY_DIR);

export { ROOT_DIR, UPLOAD_DIR, SUMMARY_DIR };

