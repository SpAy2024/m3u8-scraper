const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/extraer", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ status: "error", message: "URL no proporcionada" });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const htmlText = $.html();

    const regex = /(https?:\/\/[^\s"']+\.m3u8[^"']*)/g;
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

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
