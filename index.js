const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Scraping estático con Axios + Cheerio ---
app.get("/extraer-estatico", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ status: "error", message: "URL no proporcionada" });

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const $ = cheerio.load(response.data);
    const regex = /(https?:\/\/[^\s"'<>]+\.m3u8[^"'<>]*)/g;
    const matches = $.html().match(regex);

    if (matches?.length > 0) {
      return res.json({ status: "success", m3u8: matches[0] });
    }
    return res.status(404).json({ status: "error", message: "No se encontró la URL .m3u8" });
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// --- Scraping dinámico con Playwright para páginas con JS/iframes ---
app.get("/extraer-m3u8", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ status: "error", message: "URL no proporcionada" });

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    const collected = new Set();

    page.on("response", (response) => {
      const u = response.url();
      if (u.includes(".m3u8")) collected.add(u);
    });

    await page.goto(url, { waitUntil: "networkidle" });

    // Intentar detectar iframe embed
    const iframeSrc = await page.evaluate(() => {
      const ifr = document.querySelector("iframe");
      return ifr?.src || null;
    });

    if (iframeSrc) {
      await page.goto(iframeSrc, { waitUntil: "networkidle" });
    }

    // Esperar 10s para capturar URLs m3u8
    await page.waitForTimeout(10000);

    await browser.close();

    if (collected.size > 0) {
      return res.json({ status: "success", m3u8: Array.from(collected) });
    }
    return res.status(404).json({ status: "error", message: "No se encontró la URL .m3u8" });
  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).json({ status: "error", message: err.message });
  }
});

// Ruta raíz
app.get("/", (req, res) => {
  res.send("✅ API funcionando. Usa:\n • /extraer-estatico?url=...\n • /extraer-m3u8?url=...");
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});


