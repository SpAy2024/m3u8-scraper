const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint para scraping ESTÁTICO con Axios + Cheerio
app.get("/extraer-estatico", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ status: "error", message: "URL no proporcionada" });

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    const $ = cheerio.load(response.data);
    const htmlText = $.html();

    const regex = /(https?:\/\/[^\s"'<>]+\.m3u8[^"'<>]*)/g;
    const matches = htmlText.match(regex);

    if (matches && matches.length > 0) {
      return res.json({ status: "success", m3u8: matches[0] });
    } else {
      return res.status(404).json({ status: "error", message: "No se encontró la URL .m3u8" });
    }
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// Endpoint para scraping DINÁMICO con Playwright
app.get("/extraer-dinamico", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ status: "error", message: "URL no proporcionada" });

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    let m3u8Urls = [];

    page.on("response", async (response) => {
      const responseUrl = response.url();
      if (responseUrl.includes(".m3u8")) {
        m3u8Urls.push(responseUrl);
      }
    });

    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(7000); // Ajusta si necesitas más espera

    await browser.close();

    if (m3u8Urls.length > 0) {
      return res.json({ status: "success", m3u8: m3u8Urls[0] });
    } else {
      return res.status(404).json({ status: "error", message: "No se encontró la URL .m3u8" });
    }
  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// Ruta raíz
app.get("/", (req, res) => {
  res.send("✅ API funcionando. Usa /extraer-estatico?url=... o /extraer-dinamico?url=...");
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});


