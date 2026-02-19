// assets/js/ai-news.js

// ---------- CONFIG ----------
// EXPORT the functions needed by /news page
export async function fetchAllArticles() {
  const cacheKey = "ai-news:articles";
  const cached = getCache(cacheKey);
  if (cached) return cached;

  let articles = [];
  for (const feed of AI_NEWS_FEEDS) {
    try {
      const data = await fetchRSS(feed);
      if (data.items) {
        articles.push(
          ...data.items.map((item) => ({
            title: item.title,
            link: item.link,
            description: item.description || "",
            pubDate: item.pubDate
          }))
        );
      }
    } catch (e) {
      console.error("RSS error:", e);
    }
  }

  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  setCache(cacheKey, articles);
  return articles;
}

const OPENAI_API = "https://api.openai.com/v1/responses";
const OPENAI_KEY = "YOUR_KEY_HERE"; // optional but recommended

export async function summarize(text) {
  try {
    const res = await fetch(OPENAI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-instruct",
        input: `Summarize this in 2–3 sentences:\n\n${text}`
      })
    });

    const data = await res.json();
    return data.output_text || fallbackSummarize(text);

  } catch (err) {
    console.error("Primary summarizer failed:", err);
    return fallbackSummarize(text);
  }
}

function fallbackSummarize(text) {
  if (!text) return "Summary unavailable.";

  const sentences = text
    .replace(/<[^>]+>/g, "")
    .split(/[.!?]/)
    .map(s => s.trim())
    .filter(Boolean);

  return sentences.slice(0, 2).join(". ") + ".";
}


// RSS feeds
const AI_NEWS_FEEDS = [
  "https://blog.google/technology/ai/rss/",
  "https://openai.com/blog/rss/",
  "https://huggingface.co/blog/feed.xml",
  "https://databricks.com/feed",
  "https://techcrunch.com/tag/artificial-intelligence/feed/",
  "https://learn.microsoft.com/en-us/fabric/rss.xml"
];

// Hugging Face summarizer
const HF_SUMMARY_API =
  "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
const HF_TOKEN = ""; // optional

// Embedding model (for ranking & clustering – optional, can be added later)
const HF_EMBEDDING_API =
  "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2";

// Cache TTL (ms)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// ---------- UTILITIES ----------

function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch {
    // ignore
  }
}

// ---------- RSS + SUMMARISATION ----------

async function fetchRSS(url) {
  const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
    url
  )}`;
  const res = await fetch(api);
  return res.json();
}

// ---------- HOMEPAGE: TOP 3 NEWS ----------

export async function renderTopNews(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    "<p style='color:#ccc'>Loading latest AI & Data Engineering news...</p>";

  const articles = await fetchAllArticles();
  const top3 = articles.slice(0, 3);

  container.innerHTML = "";

  for (const article of top3) {
    const summary = await summarize(
      article.description || article.title || ""
    );

    const card = document.createElement("div");
    card.className = "news-card neon-animate";

    card.innerHTML = `
      <h3>${article.title}</h3>
      <p>${summary}</p>
      <a href="${article.link}" target="_blank">Read more →</a>
    `;

    container.appendChild(card);
  }
}

// ---------- WEEKLY INSIGHT (SIMPLE VERSION) ----------

export async function renderWeeklyInsight(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const articles = await fetchAllArticles();
  const top10 = articles.slice(0, 10);

  const combinedText = top10
    .map((a) => `${a.title}. ${a.description}`)
    .join(" ");

  const prompt =
    "Summarise the key themes in this week's AI and data engineering news in 3–4 sentences, and end with one forward-looking insight.";

  const res = await fetch(HF_SUMMARY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(HF_TOKEN && { Authorization: `Bearer ${HF_TOKEN}` })
    },
    body: JSON.stringify({ inputs: `${prompt}\n\n${combinedText}` })
  });

  const data = await res.json();
  const insight = data[0]?.summary_text || "Insight unavailable.";

  container.innerHTML = `
    <h3>Krishna's Weekly Insight</h3>
    <p>${insight}</p>
  `;
}
