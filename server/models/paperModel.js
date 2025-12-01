const formatAuthorsArray = (author) => {
  if (Array.isArray(author)) return author.map((a) => a.name || "Unknown");
  return author?.name ? [author.name] : [];
};

const derivePdfUrl = (entry) => {
  if (Array.isArray(entry.link)) {
    const pdfLink = entry.link.find((l) => l.$.type === "application/pdf");
    if (pdfLink) return pdfLink.$.href;
  }
  if (entry.link?.$.type === "application/pdf") return entry.link.$.href;
  return null;
};

const fallbackPdfUrl = (entry) => {
  if (!entry.id) return null;
  const m = entry.id.match(/\/abs\/(.*)$/);
  if (!m) return null;
  return `https://arxiv.org/pdf/${m[1]}.pdf`;
};

const extractArxivId = (entry) => {
  if (!entry.id) return null;
  const m = entry.id.match(/\/abs\/(.*)$/);
  return m ? m[1] : null;
};

const extractDoi = (entry) => {
  if (entry["arxiv:doi"]) return entry["arxiv:doi"];
  if (entry.doi) return entry.doi;
  return null;
};

export const mapEntryToPaper = (entry) => {
  if (!entry) return null;

  const pdfUrl = derivePdfUrl(entry) || fallbackPdfUrl(entry);

  return {
    id: entry.id || null,
    arxiv_id: extractArxivId(entry),
    doi: extractDoi(entry),
    title: entry.title?.trim() || "Untitled Paper",
    summary: entry.summary?.trim() || null,
    authors: formatAuthorsArray(entry.author),
    published: entry.published || null,
    updated: entry.updated || null,
    pdf_url: pdfUrl,
    link: entry.id || null
  };
};
