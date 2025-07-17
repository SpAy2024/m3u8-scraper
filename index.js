const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint correcto: /extraer?url=https://ejemplo.com
app.get("/extraer", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ status: "error", message: "URL no proporcionada" });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        // Algunos sitios bloquean user-agents sospechosos
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36",
      },
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

app.get("/", (req, res) => {
  res.send("API funcionando. Usa /extraer?url=...");
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

