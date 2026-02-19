async function renderFullNews() {
  const container = document.getElementById("news-list");
  if (!container) return;

  container.innerHTML =
    "<p style='color:#ccc'>Loading full AI & Data Engineering feed...</p>";

  const module = await import("./ai-news.js");
  const articles = await module.fetchAllArticles();

  if (!articles) {
    container.innerHTML = "<p style='color:#ccc'>Unable to load news.</p>";
    return;
  }

  container.innerHTML = "";

  const topN = articles.slice(0, 20);

  for (const article of topN) {
    const summary = await module.summarize(
      article.description || article.title || ""
    );

    const card = document.createElement("div");
    card.className = "news-card neon-animate";

    card.innerHTML = `
      <h3>${article.title}</h3>
      <p>${summary}</p>
      <small style="color:#888;">${new Date(
        article.pubDate
      ).toLocaleString()}</small><br/>
      <a href="${article.link}" target="_blank">Read more →</a>
    `;

    container.appendChild(card);
  }
}

renderFullNews();
