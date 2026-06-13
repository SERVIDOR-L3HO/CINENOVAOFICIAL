const axios = require('axios');

const HTML_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

async function fetchHtml(url, customHeaders = {}) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: { ...HTML_HEADERS, ...customHeaders },
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return response.data;
}

async function fetchPost(url, data, customHeaders = {}) {
  const response = await axios.post(url, data, {
    timeout: 15000,
    headers: {
      ...HTML_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...customHeaders,
    },
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return response.data;
}

module.exports = { fetchHtml, fetchPost };
