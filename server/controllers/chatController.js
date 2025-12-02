import fetch from "node-fetch";

export const chat = async (req, res) => {
    try {
        const { message, context } = req.body;

        let context_ids = [];
        if (Array.isArray(context)) {
            context_ids = context.map(c => c.id || c).filter(id => id);
        }

        const payload = {
            message,
            context_ids: context_ids.length > 0 ? context_ids : null
        };

        console.log("Forwarding chat to ML:", payload);

        const response = await fetch("http://localhost:8000/chat_rag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`ML Service Error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error("Chat Controller Error:", error);
        res.status(500).json({ error: "Failed to process chat request" });
    }
};
