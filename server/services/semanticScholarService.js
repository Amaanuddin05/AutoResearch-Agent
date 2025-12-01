import axios from "axios";

const BASE = "https://api.semanticscholar.org/graph/v1/paper";

const FIELDS =
  "title,year,citationCount,influentialCitationCount,fieldsOfStudy,authors,url,venue";

const fetchByArxivId = async (arxiv_id) => {
  if (!arxiv_id) return null;
  const url = `${BASE}/arXiv:${arxiv_id}?fields=${FIELDS}`;
  try {
    const r = await axios.get(url);
    return r.data || null;
  } catch {
    return null;
  }
};

const fetchByDoi = async (doi) => {
  if (!doi) return null;
  const url = `${BASE}/DOI:${doi}?fields=${FIELDS}`;
  try {
    const r = await axios.get(url);
    return r.data || null;
  } catch {
    return null;
  }
};

export const getPaperMetadata = async (paper) => {
  if (!paper) return null;

  if (paper.arxiv_id) {
    const data = await fetchByArxivId(paper.arxiv_id);
    if (data) return data;
  }

  if (paper.doi) {
    const data = await fetchByDoi(paper.doi);
    if (data) return data;
  }

  return null;
};
