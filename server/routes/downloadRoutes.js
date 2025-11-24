import express from "express";
import { downloadSummary } from "../controllers/downloadController.js";

const router = express.Router();

router.get("/download/:fileName", downloadSummary);

export default router;

