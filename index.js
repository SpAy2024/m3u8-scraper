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

    // Escucha las respuestas de red
    page.on("response", (response) => {
      const u = response.url();
      if (u.includes(".m3u8")) collected.add(u);
    });

    // Navega al blog
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000); // da tiempo para que cargue

    // Busca TODOS los iframes en la página
    const iframeSrcs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("iframe")).map((ifr) => ifr.src)
    );

    // Visita cada iframe si existe
    for (const iframeUrl of iframeSrcs) {
      try {
        await page.goto(iframeUrl, { waitUntil: "networkidle" });
        await page.waitForTimeout(5000); // espera en iframe
      } catch (e) {
        console.warn(`No se pudo cargar iframe: ${iframeUrl}`);
      }
    }

    await browser.close();

    if (collected.size > 0) {
      return res.json({ status: "success", m3u8: Array.from(collected) });
    } else {
      return res.status(404).json({ status: "error", message: "No se encontró la URL .m3u8" });
    }
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


