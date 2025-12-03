import express from "express";
import { fetchPapers, fetchAndSummarize, getAnalysisStatus } from "../controllers/fetchController.js";

const router = express.Router();

router.post("/fetch", fetchPapers);
router.post("/fetch_and_summarize", fetchAndSummarize);
router.get("/status/:jobId", getAnalysisStatus);

export default router;
