import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { uploadPdf } from "../controllers/uploadController.js";

const router = express.Router();

router.post("/upload", upload.single("pdf"), uploadPdf);

export default router;

