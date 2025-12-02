import express from "express";
import cors from "cors";
import uploadRoutes from "./routes/uploadRoutes.js";
import fetchRoutes from "./routes/fetchRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import downloadRoutes from "./routes/downloadRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(uploadRoutes);
app.use(fetchRoutes);
app.use(summaryRoutes);
app.use(downloadRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
