import express from "express";
import { fetchPapers, fetchAndSummarize } from "../controllers/fetchController.js";

const router = express.Router();

router.post("/fetch", fetchPapers);
router.post("/fetch_and_summarize", fetchAndSummarize);

export default router;

