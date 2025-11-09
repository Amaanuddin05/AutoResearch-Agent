import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/fetch", async (req, res) => {
  const { url } = req.body;
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync("paper.pdf", response.data);
    res.json({ message: "PDF downloaded successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch paper" });
  }
});

app.post("/summarize", async (req, res) => {
  const { text } = req.body;
  try {
    const summaryResponse = await axios.post("http://127.0.0.1:8000/summarize", { text });
    res.json(summaryResponse.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to summarize" });
  }
});

app.post("/insight", (req, res) => {
  res.json({ message: "Insight endpoint placeholder" });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
