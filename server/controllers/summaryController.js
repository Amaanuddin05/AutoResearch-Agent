import axios from "axios";

export const summarizeText = async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  try {
    const response = await axios.post("http://127.0.0.1:8000/summarize", { text });
    res.json(response.data);
  } catch (err) {
    console.error("Error contacting summarizer:", err.message);
    res.status(500).json({ error: "Failed to contact summarizer service" });
  }
};

