const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const path = require('path');
const movieRoutes = require('./routes/movieRoutes');
const seriesRoutes = require('./routes/seriesRoutes');
const tvRoutes = require('./routes/tvRoutes');

const app = express();

const axios = require('axios');

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Proxy de stream (oculta la fuente real al navegador)
app.get('/api/stream', async (req, res) => {
  try {
    const { get } = req.query;
    if (!get) return res.status(400).send('Parámetro requerido');

    const upstreamUrl = `https://ultragol-api-3-six.vercel.app/ultragol-l3ho?get=${encodeURIComponent(get)}`;

    const upstream = await axios.get(upstreamUrl, {
      timeout: 15000,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://ultragol-api-3-six.vercel.app/',
        'Origin': 'https://ultragol-api-3-six.vercel.app'
      }
    });

    const contentType = upstream.headers['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }

    upstream.data.pipe(res);

    upstream.data.on('error', (err) => {
      console.error('Stream error:', err.message);
      if (!res.headersSent) res.status(500).send('Error en el stream');
    });
  } catch (err) {
    console.error('Error in /api/stream:', err.message);
    if (!res.headersSent) res.status(500).send('Error de conexión con la fuente');
  }
});

// Proxy anti-anuncios para embeds de Castellano
app.get('/api/proxy/embed', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL requerida');

    const decodedUrl = decodeURIComponent(url);
    const parsedUrl = new URL(decodedUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

    const upstream = await axios.get(decodedUrl, {
      timeout: 20000,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': baseUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      }
    });

    let html = upstream.data;

    // --- Eliminar scripts de redes publicitarias ---
    const adDomains = [
      'googlesyndication', 'doubleclick', 'exoclick', 'trafficjunky',
      'adnxs', 'adskeeper', 'popads', 'popcash', 'propellerads',
      'hilltopads', 'adcash', 'revcontent', 'taboola', 'outbrain',
      'juicyads', 'zedo', 'undertone', 'clicktripz', 'adsterra',
      'mgid', 'bidvertiser', 'yllix', 'adspyglass', 'ero-advertising',
      'coinzilla', 'a-ads', 'ads.js', 'adserver', 'ad-network',
      'sapphirebet', 'betsson', 'betway', 'apuesta', 'casino'
    ];
    adDomains.forEach(domain => {
      html = html.replace(new RegExp(`<script[^>]*src=["'][^"']*${domain}[^"']*["'][^>]*>(?:.*?</script>)?`, 'gis'), '<!-- ad removed -->');
    });

    // Eliminar scripts inline sospechosos (popunders, redirects)
    html = html.replace(/<script[^>]*>([\s\S]*?)(window\.open|pop(?:under|up)|\.redirect|location\.href\s*=(?!.*player))([\s\S]*?)<\/script>/gi, '<!-- ad script removed -->');

    // Reescribir URLs relativas a absolutas para que los recursos carguen correctamente
    html = html.replace(/(src|href|action)=["'](?!https?:\/\/|\/\/|data:|javascript:|blob:|#)([^"']+)["']/gi,
      (match, attr, path) => {
        const abs = path.startsWith('/') ? baseUrl + path : baseUrl + '/' + path;
        return `${attr}="${abs}"`;
      }
    );
    // Corregir URLs protocol-relative (//)
    html = html.replace(/(src|href)=["']\/\/([^"']+)["']/gi,
      (match, attr, rest) => `${attr}="${parsedUrl.protocol}//${rest}"`);

    // --- Inyectar bloqueador de anuncios ---
    const adBlockCode = `
<style>
  /* === CINENOVA Ad Blocker === */
  [class*="ad-"],[class*="-ad "],[id*="ad-"],[id*="-ad"],
  [class*="advert"],[id*="advert"],
  .preroll,.midroll,.postroll,.vast-container,
  .ima-ad-container,.video-ads,.ad-overlay,.overlay-ad,
  [id*="VAST"],[class*="VAST"],
  iframe[src*="googlesyndication"],iframe[src*="doubleclick"],
  iframe[src*="exoclick"],iframe[src*="trafficjunky"],
  iframe[src*="adnxs"],iframe[src*="popads"],
  iframe[src*="sapphirebet"],iframe[src*="casino"],
  .advertisement,.banner-ad,.sponsor-banner,
  div[id*="banner"],div[class*="banner-container"],
  .popup-overlay,.modal-ad,[class*="popup-ad"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
  }
  video { display: block !important; opacity: 1 !important; }
</style>
<script>
(function(){
  // Bloquear ventanas emergentes
  var _open = window.open;
  window.open = function(){ return { focus: function(){}, blur: function(){} }; };

  // Bloquear clicks que abren nuevas pestañas (anuncios)
  document.addEventListener('click', function(e){
    var link = e.target.closest('a[target]');
    if(link && link.href && !link.href.startsWith(location.origin) &&
       !e.target.closest('video, .jw-video, .plyr, button, .skip')){
      e.preventDefault(); e.stopImmediatePropagation();
    }
  }, true);

  // Saltar anuncios automáticamente
  function skipAds(){
    var skips = document.querySelectorAll('[class*="skip"],[id*="skip"],.ima-skip-button,.ytp-ad-skip-button');
    skips.forEach(function(el){ try{ el.click(); }catch(e){} });

    // Eliminar overlays de anuncios que no son el video
    var adEls = document.querySelectorAll(
      '.preroll,.midroll,.ad-overlay,.overlay-ad,.ima-ad-container,.video-ads,[class*="ad-container"],[id*="ad-container"]'
    );
    adEls.forEach(function(el){
      if(!el.querySelector('video')) { el.style.display='none'; el.style.pointerEvents='none'; }
    });

    // Remover iframes de publicidad
    document.querySelectorAll('iframe').forEach(function(f){
      var src = f.src || f.getAttribute('src') || '';
      var adKeywords = ['googlesyndication','doubleclick','exoclick','trafficjunky',
        'popads','adnxs','sapphirebet','casino','apuesta','bet','ad.'];
      if(adKeywords.some(function(k){ return src.includes(k); })){
        f.remove();
      }
    });
  }

  setInterval(skipAds, 400);
  document.addEventListener('DOMContentLoaded', skipAds);
  window.addEventListener('load', skipAds);
})();
</script>`;

    if (html.includes('</head>')) {
      html = html.replace('</head>', adBlockCode + '\n</head>');
    } else if (html.includes('<body')) {
      html = html.replace('<body', adBlockCode + '\n<body');
    } else {
      html = adBlockCode + html;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.removeHeader('X-Frame-Options');
    res.send(html);
  } catch (err) {
    console.error('Proxy embed error:', err.message);
    res.status(500).send(`<html><body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><p>⚠️ No se pudo cargar el servidor. Intenta con otro.</p></body></html>`);
  }
});

// Proxy para el reproductor SuperVideo
app.get('/api/player', async (req, res) => {
  try {
    const { video_id, tmdb, season, s, episode, e } = req.query;
    const is_tmdb = tmdb || 0;
    const ses = season || s || 0;
    const epi = episode || e || 0;
    
    const requestUrl = `https://getsuperembed.link/?video_id=${video_id}&tmdb=${is_tmdb}&season=${ses}&episode=${epi}&player_font=Poppins&player_bg_color=000000&player_font_color=ffffff&player_primary_color=34cfeb&player_secondary_color=6900e0&player_loader=1&preferred_server=0&player_sources_toggle_type=2`;
    
    const response = await axios.get(requestUrl, { timeout: 10000 });
    const playerUrl = response.data;
    
    if (playerUrl && typeof playerUrl === 'string' && playerUrl.startsWith('https://')) {
      res.redirect(playerUrl);
    } else {
      res.status(500).send('El proveedor no devolvió un enlace válido');
    }
  } catch (err) {
    console.error('Error in /api/player:', err.message);
    res.status(500).send('Error de conexión con el proveedor de video');
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/movies', movieRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/tv', tvRoutes);

// Root path handler
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Catch-all for Frontend (Non-API)
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

module.exports = app;