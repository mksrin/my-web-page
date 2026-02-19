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

export async function summarize(text) {
  const cacheKey = `summary:${text.slice(0, 100)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const res = await fetch(HF_SUMMARY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(HF_TOKEN && { Authorization: `Bearer ${HF_TOKEN}` })
    },
    body: JSON.stringify({ inputs: text })
  });

  const data = await res.json();
  const summary = data[0]?.summary_text || "Summary unavailable.";
  setCache(cacheKey, summary);
  return summary;
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



async function fetchAllArticles() {
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

  // sort by date desc
  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  setCache(cacheKey, articles);
  return articles;
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
