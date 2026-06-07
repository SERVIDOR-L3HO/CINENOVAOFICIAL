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

// ── Utilidad: convierte URL relativa/protocol-relative en absoluta ──
function toAbsolute(href, parsedBase) {
  if (!href) return null;
  if (/^(https?:)?\/\//i.test(href)) {
    return href.startsWith('//') ? `${parsedBase.protocol}${href}` : href;
  }
  if (/^(data:|javascript:|blob:|about:|#)/i.test(href)) return null;
  return href.startsWith('/')
    ? `${parsedBase.protocol}//${parsedBase.host}${href}`
    : `${parsedBase.protocol}//${parsedBase.host}/${href}`;
}

// ── Código anti-anuncios que se inyecta en CADA página proxiada ──
const AD_BLOCK_CODE = `
<style>
  [class*="ad-"],[class*="-ad"],[id*="ad-"],[id*="-ad"],
  [class*="advert"],[id*="advert"],[class*="sponsor"],
  .preroll,.midroll,.postroll,.vast-container,
  .ima-ad-container,.video-ads,.ad-overlay,.overlay-ad,
  [id*="VAST"],[class*="VAST"],.jw-ads-container,
  .jw-ad,.jw-flag-ads,.jw-ima-container,
  div[class*="Advertisement"],div[class*="advertisement"],
  .advertisement,.banner-ad,.popup-overlay,.modal-ad { 
    display:none!important; visibility:hidden!important;
    pointer-events:none!important; height:0!important;
    width:0!important; opacity:0!important; 
  }
  video,iframe { display:block!important; opacity:1!important; }
</style>
<script>
(function(){
  // 1. Neutralizar google.ima ANTES de que cargue (IMA SDK = sistema de anuncios de supervideo)
  window.google = window.google || {};
  window.google.ima = {
    AdDisplayContainer: function(){ return { initialize:function(){}, destroy:function(){} }; },
    AdsLoader: function(){ return { 
      requestAds:function(){}, 
      addEventListener:function(){},
      getSettings:function(){ return { setAutoPlayAdBreaks:function(){}, setDisableCustomPlaybackForIOS10Plus:function(){} }; },
      destroy:function(){}
    }; },
    AdsRequest: function(){ return {}; },
    AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED:'' } },
    AdErrorEvent: { Type: { AD_ERROR:'' } },
    AdEvent: { Type: { CONTENT_PAUSE_REQUESTED:'',CONTENT_RESUME_REQUESTED:'',ALL_ADS_COMPLETED:'',STARTED:'',COMPLETE:'',SKIPPED:'',CLICK:'' } },
    ViewMode: { NORMAL:'normal', FULLSCREEN:'fullscreen' },
    UiElements: { AD_ATTRIBUTION:'', COUNTDOWN:'' },
    settings: { setLocale:function(){}, setNumRedirects:function(){}, setPlayerVersion:function(){}, setPlayerType:function(){} },
    ImaSdkSettings: function(){ return { setLocale:function(){}, setNumRedirects:function(){}, setPlayerVersion:function(){}, setPlayerType:function(){} }; }
  };

  // 2. Parchear jwplayer para remover advertising antes del setup
  var _jw = window.jwplayer;
  Object.defineProperty(window,'jwplayer',{
    get: function(){
      var inst = typeof _jw==='function' ? _jw.apply(this,arguments) : _jw;
      if(inst && typeof inst.setup === 'function'){
        var origSetup = inst.setup.bind(inst);
        inst.setup = function(cfg){
          if(cfg){ delete cfg.advertising; delete cfg.vast; delete cfg.ad; }
          return origSetup(cfg);
        };
      }
      return inst;
    },
    set: function(v){
      _jw = v;
      if(typeof v==='function'){
        var orig = v;
        window.jwplayer = function(){
          var inst = orig.apply(this,arguments);
          if(inst && typeof inst.setup==='function'){
            var origSetup = inst.setup.bind(inst);
            inst.setup = function(cfg){
              if(cfg){ delete cfg.advertising; delete cfg.vast; delete cfg.ad; }
              return origSetup(cfg);
            };
          }
          return inst;
        };
      }
    },
    configurable:true
  });

  // 3. Bloquear fetch/XHR a servidores de anuncios
  var AD_HOSTS = ['googlesyndication','doubleclick','exoclick','trafficjunky',
    'adnxs','adskeeper','popads','propellerads','hilltopads','adsterra',
    'mgid','bidvertiser','yllix','coinzilla','sapphirebet','imasdk.googleapis',
    'histats.com','sstatic1.histats','cloudflareinsights',
    'disable-devtool','unpkg.com/disable-devtool',
    'cloudnestra.com/asdf','s10.histats'];
  var _fetch = window.fetch;
  window.fetch = function(input){
    var u = (typeof input==='string'?input:(input.url||''));
    if(AD_HOSTS.some(function(h){ return u.includes(h); })){
      return Promise.resolve(new Response('',{status:200}));
    }
    return _fetch.apply(this,arguments);
  };
  var _XHRopen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m,u){
    if(AD_HOSTS.some(function(h){ return String(u).includes(h); })){
      this._blocked=true; return;
    }
    return _XHRopen.apply(this,arguments);
  };
  var _XHRsend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(){
    if(this._blocked) return;
    return _XHRsend.apply(this,arguments);
  };

  // 4. Bloquear window.open y location redirects (popups/popunders)
  window.open = function(){ return {focus:function(){},blur:function(){}}; };
  // Bloquear redirects de top-level desde iframes de ads
  try {
    Object.defineProperty(window, 'location', {
      get: function(){ return window._location || location; },
      set: function(v){
        // Solo permitir si viene de interacción del usuario, no de scripts de ads
        if(document.hasFocus && document.hasFocus()) window._location = v;
      },
      configurable: true
    });
  } catch(e){}

  // 5. Neutralizar DisableDevtool de vsembed
  window.DisableDevtool = function(){};

  // 6. Auto-skip + remover overlays cada 300ms
  function killAds(){
    document.querySelectorAll('[class*="skip"],[id*="skip"],.ima-skip-button,.jw-skip').forEach(function(el){
      try{ el.click(); }catch(e){}
    });
    document.querySelectorAll('.ima-ad-container,.jw-ima-container,.jw-ads-container,.video-ads,.ad-overlay,[class*="preroll"],[id="ad720"],[id="AdWidgetContainer"],[id="onexbet"]').forEach(function(el){
      if(!el.querySelector('video[src]')){ el.style.cssText='display:none!important;height:0!important;pointer-events:none!important'; }
    });
    // Eliminar overlays que bloquean clics (típico de popunders)
    document.querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"]').forEach(function(el){
      if(!el.id && !el.className && el.style.zIndex > 9000){
        el.style.cssText='display:none!important';
      }
    });
  }
  setInterval(killAds, 200);
  document.addEventListener('DOMContentLoaded', killAds);
})();
</script>`;

// Proxy anti-anuncios con proxy recursivo de iframes anidados
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
        'Origin': baseUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      }
    });

    let html = upstream.data;

    // ── 1. Eliminar <script src> de redes publicitarias ──
    const AD_SCRIPT_PATTERNS = [
      'googlesyndication','doubleclick','exoclick','trafficjunky','imasdk.googleapis',
      'adnxs','adskeeper','popads','popcash','propellerads','hilltopads','adcash',
      'revcontent','taboola','outbrain','juicyads','zedo','adsterra','mgid',
      'bidvertiser','yllix','coinzilla','a-ads','ads\\.js','adserver','ad-network',
      'sapphirebet','betsson','betway','clicktripz','ero-advertising',
      // vsembed / cloudnestra specific
      'cloudflareinsights','disable-devtool','histats','cloudnestra\\.com\\/asdf',
      'sbx\\.js','reporting\\.js'
    ];
    AD_SCRIPT_PATTERNS.forEach(p => {
      html = html.replace(
        new RegExp(`<script[^>]+src=["'][^"']*${p}[^"']*["'][^>]*>(?:[\\s\\S]*?</script>)?`, 'gi'),
        '<!-- [cinenova] ad script removed -->'
      );
    });

    // ── 2. Eliminar scripts inline de popunders / redirects / vsembed ads ──
    html = html.replace(
      /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi,
      (match, body) => {
        if (/pop(under|up)|window\.open\s*\(|exoclick|propellerads|adsterra|ero-advertising|sapphirebet|DisableDevtool|Histats|_Hasync|histats/i.test(body)) {
          return '<!-- [cinenova] inline ad removed -->';
        }
        return match;
      }
    );

    // ── 3. Neutralizar advertising en configs de jwplayer inline ──
    html = html.replace(/["']?advertising["']?\s*:\s*\{[^}]*\}/gi, '"advertising":{}');
    html = html.replace(/["']?vast["']?\s*:\s*["'][^"']+["']/gi, '"vast":""');

    // ── 4. Convertir URLs relativas/protocol-relative a absolutas ──
    // src y href normales
    html = html.replace(/((?:src|href|action)=["'])(?!https?:\/\/|\/\/|data:|javascript:|blob:|#|\/api\/proxy)([^"']+)(["'])/gi,
      (match, prefix, path, suffix) => {
        const abs = toAbsolute(path, parsedUrl);
        return abs ? `${prefix}${abs}${suffix}` : match;
      }
    );
    // Protocol-relative (//)
    html = html.replace(/((?:src|href)=["'])\/\/([^"']+)(["'])/gi,
      (m, pre, rest, suf) => `${pre}${parsedUrl.protocol}//${rest}${suf}`
    );

    // ── 5. CLAVE: Reescribir iframes para que pasen por nuestro proxy ──
    html = html.replace(/<iframe([^>]*)(?:\ssrc=["']([^"']+)["'])([^>]*)>/gi,
      (match, before, iframeSrc, after) => {
        if (!iframeSrc) return match;
        if (iframeSrc.includes('/api/proxy/') || /^(data:|about:|javascript:)/i.test(iframeSrc)) return match;
        const absIframeSrc = toAbsolute(iframeSrc, parsedUrl) || iframeSrc;
        const proxied = `/api/proxy/embed?url=${encodeURIComponent(absIframeSrc)}`;
        return `<iframe${before} src="${proxied}"${after}>`;
      }
    );

    // ── 6. Inyectar bloqueador antes de cualquier script de la página ──
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${AD_BLOCK_CODE}`);
    } else if (html.includes('</head>')) {
      html = html.replace('</head>', `${AD_BLOCK_CODE}</head>`);
    } else {
      html = AD_BLOCK_CODE + html;
    }

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(html);
  } catch (err) {
    console.error('Proxy embed error:', err.message);
    res.status(500).send(`<html><body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;"><p>⚠️ No se pudo cargar el servidor.<br><small>${err.message}</small></p></body></html>`);
  }
});

// ── Extractor de embed directo sin anuncios ──
// Soporta: unlimplay.com y verhdlink.cam
app.get('/api/proxy/extract', async (req, res) => {
  try {
    const { url, lang } = req.query;
    if (!url) return res.status(400).json({ error: 'URL requerida' });

    const inputUrl = decodeURIComponent(url);
    const parsedUrl = new URL(inputUrl);
    const host = parsedUrl.hostname;

    // ── verhdlink.cam: parsear data-link del primer servidor activo ──
    if (host.includes('verhdlink.cam')) {
      const audioType = (lang || 'latino').toLowerCase(); // 'latino' | 'castellano'

      const resp = await axios.get(inputUrl, {
        timeout: 15000,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://verhdlink.cam/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      const html = resp.data;

      // Extraer el bloque <ul class="_player-mirrors [tipo] ... active"> 
      // que corresponde al idioma seleccionado
      const ulPattern = new RegExp(
        `<ul[^>]+_player-mirrors[^>]+${audioType}[^>]+active[^>]*>([\\s\\S]*?)<\\/ul>`,
        'i'
      );
      const ulMatch = html.match(ulPattern);

      if (!ulMatch) {
        return res.json({ embedUrl: null, error: `No se encontró la lista de servidores (${audioType})` });
      }

      // Dentro del bloque, tomar el primer data-link disponible
      const linkMatch = ulMatch[1].match(/data-link=["']([^"']+)["']/i);
      if (!linkMatch || !linkMatch[1]) {
        return res.json({ embedUrl: null, error: 'No se encontró data-link en verhdlink' });
      }

      let embedUrl = linkMatch[1];
      // Corregir protocol-relative
      if (embedUrl.startsWith('//')) embedUrl = 'https:' + embedUrl;

      return res.json({ embedUrl, source: 'verhdlink' });
    }

    // ── unlimplay.com: API interna /play.php/embed/?api=1 ──
    if (host.includes('unlimplay.com')) {
      const apiPath = parsedUrl.pathname.replace('/play/embed/', '/play.php/embed/');
      const apiUrl  = `${parsedUrl.origin}${apiPath}?api=1&background=1&t=${Date.now()}`;

      const resp = await axios.get(apiUrl, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': inputUrl,
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
        }
      });

      const data = resp.data;
      if (!data || !data.success || !Array.isArray(data.data)) {
        return res.json({ embedUrl: null, error: 'Respuesta inesperada de unlimplay API' });
      }

      // Para castellano buscar "espanol", para latino buscar "latino"
      const wantLang  = (lang === 'castellano') ? 'espanol' : 'latino';
      const entry =
        data.data.find(d => d.language === wantLang) ||
        data.data.find(d => d.language === 'espanol') ||
        data.data.find(d => d.language === 'latino')  ||
        data.data[0];

      if (!entry || !entry.embed_url) {
        return res.json({ embedUrl: null, error: 'No se encontró embed_url en unlimplay API' });
      }

      return res.json({ embedUrl: entry.embed_url, language: entry.language, source: 'unlimplay' });
    }

    res.json({ embedUrl: null, error: 'Proveedor no soportado' });

  } catch (err) {
    console.error('Extract error:', err.message);
    res.json({ embedUrl: null, error: err.message });
  }
});

// ── Proxy HLS: reescribe m3u8 y sirve segmentos .ts ──
app.get('/api/proxy/hls', async (req, res) => {
  try {
    const { url, ref } = req.query;
    if (!url) return res.status(400).send('URL requerida');

    const decodedUrl = decodeURIComponent(url);
    const referer    = ref ? decodeURIComponent(ref) : 'https://supervideo.tv/';
    const parsedUrl  = new URL(decodedUrl);
    const baseUrl    = `${parsedUrl.protocol}//${parsedUrl.host}`;
    // base de directorios para URLs relativas en el m3u8
    const basePath   = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);

    const isM3u8 = decodedUrl.includes('.m3u8') || decodedUrl.includes('m3u8');

    const upstream = await axios.get(decodedUrl, {
      timeout: 20000,
      responseType: isM3u8 ? 'text' : 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': new URL(referer).origin,
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (isM3u8) {
      // Reescribir URLs dentro del m3u8 para que pasen por nuestro proxy
      let content = upstream.data;
      const encodedRef = encodeURIComponent(referer);

      content = content.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line; // comentarios M3U8, sin cambios

        // Construir URL absoluta del segmento
        let absUrl;
        if (/^https?:\/\//i.test(trimmed)) {
          absUrl = trimmed;
        } else if (trimmed.startsWith('/')) {
          absUrl = `${baseUrl}${trimmed}`;
        } else {
          absUrl = `${basePath}${trimmed}`;
        }

        return `/api/proxy/hls?url=${encodeURIComponent(absUrl)}&ref=${encodedRef}`;
      }).join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(content);
    }

    // Segmento binario (.ts, .aac, etc.) — stream directo
    const ct = upstream.headers['content-type'] || 'video/MP2T';
    res.setHeader('Content-Type', ct);
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }
    upstream.data.pipe(res);
    upstream.data.on('error', () => { if (!res.headersSent) res.status(500).end(); });

  } catch (err) {
    console.error('HLS proxy error:', err.message);
    if (!res.headersSent) res.status(500).send('Error en proxy HLS');
  }
});

// ── Extractor vsembed.ru → m3u8 (para soy-luna) ──────────────────────────────
app.get('/api/proxy/vsembed', async (req, res) => {
  try {
    const { imdb = 'tt5189554', s = '1', e = '1' } = req.query;
    const embedUrl = `https://vsembed.ru/embed/tv/${imdb}/${s}-${e}`;

    const HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://vsembed.ru/',
      'Origin': 'https://vsembed.ru',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
    };

    // ── helpers ──────────────────────────────────────────────────────────────
    const findM3u8 = (text) => {
      // Orden de intentos: 1) jwplayer file: 2) sources array 3) URL directa
      const patterns = [
        /file\s*:\s*["'`](https?:\/\/[^"'`\s]+?\.m3u8[^"'`\s]*)/i,
        /["'`](https?:\/\/[^"'`\s]+?\.m3u8(?:\?[^"'`\s]*)?)/i,
        /hls["\s]*:\s*["'`](https?:\/\/[^"'`\s]+)/i,
        /src\s*:\s*["'`](https?:\/\/[^"'`\s]+?\.m3u8[^"'`\s]*)/i,
      ];
      for (const p of patterns) {
        const m = text.match(p);
        if (m && m[1]) return m[1];
      }
      return null;
    };

    const findIframe = (text) =>
      (text.match(/<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/i) || [])[1] || null;

    // ── PASO 1: página principal de vsembed ──────────────────────────────────
    const r1 = await axios.get(embedUrl, { timeout: 20000, responseType: 'text', headers: HEADERS });
    let html = r1.data;

    let m3u8 = findM3u8(html);
    if (m3u8) return res.json({ ok: true, m3u8, step: 'vsembed-html', embedUrl });

    // ── PASO 2: buscar scripts externos de la página y escanear cada uno ─────
    const scriptSrcs = [];
    const scriptRe = /<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
    let sm;
    while ((sm = scriptRe.exec(html)) !== null) {
      if (/vsembed|player|embed|stream|hls/i.test(sm[1])) scriptSrcs.push(sm[1]);
    }

    for (const src of scriptSrcs.slice(0, 3)) {
      try {
        const rs = await axios.get(src, { timeout: 10000, responseType: 'text', headers: HEADERS });
        m3u8 = findM3u8(rs.data);
        if (m3u8) return res.json({ ok: true, m3u8, step: 'external-script', embedUrl });
      } catch (_) { /* ignorar errores de scripts individuales */ }
    }

    // ── PASO 3: seguir el primer iframe de la página ─────────────────────────
    const iframeSrc = findIframe(html);
    if (iframeSrc) {
      try {
        const r2 = await axios.get(iframeSrc, {
          timeout: 15000, responseType: 'text',
          headers: { ...HEADERS, Referer: embedUrl, Origin: new URL(iframeSrc).origin }
        });
        m3u8 = findM3u8(r2.data);
        if (m3u8) return res.json({ ok: true, m3u8, step: 'iframe', embedUrl, iframeSrc });

        // PASO 3b: scripts del iframe
        const scriptRe2 = /<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
        let sm2;
        while ((sm2 = scriptRe2.exec(r2.data)) !== null) {
          if (/player|stream|hls|embed/i.test(sm2[1])) {
            try {
              const rs2 = await axios.get(sm2[1], {
                timeout: 10000, responseType: 'text',
                headers: { ...HEADERS, Referer: iframeSrc }
              });
              m3u8 = findM3u8(rs2.data);
              if (m3u8) return res.json({ ok: true, m3u8, step: 'iframe-script', embedUrl });
            } catch (_) {}
          }
        }
      } catch (err2) {
        console.warn('vsembed iframe fetch failed:', err2.message);
      }
    }

    // ── PASO 4: no encontró m3u8 — devolver embedUrl para iframe fallback ────
    return res.json({ ok: false, m3u8: null, embedUrl, step: 'no-m3u8-found' });

  } catch (err) {
    console.error('vsembed extract error:', err.message);
    res.status(500).json({ ok: false, m3u8: null, error: err.message });
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