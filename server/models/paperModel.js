const formatAuthors = (author) => {
  if (Array.isArray(author)) {
    return author.map((a) => a.name).join(", ");
  }
  return author?.name || "Unknown";
};

const derivePdfUrl = (entry) => {
  if (Array.isArray(entry.link)) {
    return entry.link.find((link) => link.$.type === "application/pdf")?.$.href || null;
  }
  return entry.link?.$.href || null;
};

const fallbackPdfUrl = (entry) => {
  if (entry.id) {
    const idMatch = entry.id.match(/\/abs\/(.*)$/);
    if (idMatch) {
      return `https://arxiv.org/pdf/${idMatch[1]}.pdf`;
    }
  }
  return null;
};

export const mapEntryToPaper = (entry) => {
  if (!entry) return null;

  const pdfUrl = derivePdfUrl(entry) || fallbackPdfUrl(entry);

  return {
    title: entry.title?.trim() || "Untitled Paper",
    authors: formatAuthors(entry.author),
    summary: entry.summary?.trim(),
    pdf_url: pdfUrl,
    published: entry.published || "Unknown",
  };
};

