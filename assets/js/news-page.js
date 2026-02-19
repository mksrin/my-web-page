import { fetchAllArticles, summarize } from "./ai-news.js";

async function renderFullNews() {
  const container = document.getElementById("news-list");
  if (!container) return;

  container.innerHTML =
    "<p style='color:#ccc'>Loading full AI & Data Engineering feed...</p>";

  const articles = await fetchAllArticles();
  if (!articles) {
    container.innerHTML = "<p style='color:#ccc'>Unable to load news.</p>";
    return;
  }

  container.innerHTML = "";

  const topN = articles.slice(0, 20);

  for (const article of topN) {
    const summaryText = await summarize(
      article.description || article.title || ""
    );

    const card = document.createElement("div");
    card.className = "news-card neon-animate";

    card.innerHTML = `
      <h3>${article.title}</h3>
      <p>${summaryText}</p>
      <small>${new Date(article.pubDate).toLocaleDateString()}</small>
    `;

    container.appendChild(card);
  }
}

renderFullNews();

