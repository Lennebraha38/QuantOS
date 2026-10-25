import http from 'node:http';
import fsPromises from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DESKTOP_DIR = path.resolve(__dirname, 'desktop');

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.qasm': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
});

const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https: http://127.0.0.1:* http://localhost:*; frame-src https: http: 'self'; object-src 'none'; base-uri 'self'"
});

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function computeRandomStats(byteBuffer) {
  const bytes = Uint8Array.from(byteBuffer);
  const count = bytes.length;
  if (count === 0) {
    return { count: 0, hex: '', mean: 0, shannonEntropy: 0, chiSquare: 0 };
  }

  const freq = new Uint32Array(256);
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const b = bytes[i];
    freq[b]++;
    sum += b;
  }

  const mean = sum / count;
  let shannonEntropy = 0;
  const expected = count / 256;
  let chiSquare = 0;

  for (let v = 0; v < 256; v++) {
    const c = freq[v];
    if (c > 0) {
      const p = c / count;
      shannonEntropy -= p * Math.log2(p);
    }
    const diff = c - expected;
    chiSquare += (diff * diff) / expected;
  }

  return {
    count,
    hex: Buffer.from(bytes).toString('hex'),
    mean: Number(mean.toFixed(6)),
    shannonEntropy: Number(shannonEntropy.toFixed(6)),
    chiSquare: Number(chiSquare.toFixed(4))
  };
}

function findExecutableInPath(binaryName) {
  const pathEnv = process.env.PATH || '';
  const dirs = pathEnv.split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const fullPath = path.join(dir, binaryName);
    try {
      fs.accessSync(fullPath, fs.constants.X_OK);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        return fullPath;
      }
    } catch {
      // Binary not in this directory
    }
  }
  return null;
}

function readJsonBody(req, maxBytes = 16384) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      total += chunk.length;
      if (total > maxBytes) {
        aborted = true;
        reject(Object.assign(new Error('İstek gövdesi çok büyük.'), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (aborted) return;
      if (total === 0) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Geçersiz JSON gövdesi.'), { statusCode: 400 }));
      }
    });

    req.on('error', (err) => {
      if (!aborted) reject(err);
    });
  });
}

async function handleApiQrng(urlObj, res, qrngTimeoutMs = 2500) {
  const rawCount = Number(urlObj.searchParams.get('count') ?? 32);
  const count = Number.isFinite(rawCount)
    ? Math.max(1, Math.min(1024, Math.floor(rawCount)))
    : 32;

  let bytes = null;
  let source = 'node-crypto-csprng-fallback';

  try {
    const anuUrl = `https://qrng.anu.edu.au/API/jsonI.php?length=${count}&type=uint8`;
    const response = await fetch(anuUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(qrngTimeoutMs)
    });

    if (response.ok) {
      const data = await response.json();
      if (
        data &&
        data.success === true &&
        Array.isArray(data.data) &&
        data.data.length === count &&
        data.data.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)
      ) {
        bytes = Uint8Array.from(data.data);
        source = 'anu-quantum-vacuum';
      }
    }
  } catch {
    // Fallback cleanly to Node CSPRNG
  }

  if (!bytes) {
    bytes = Uint8Array.from(crypto.randomBytes(count));
    source = 'node-crypto-csprng-fallback';
  }

  const stats = computeRandomStats(bytes);
  sendJson(res, 200, {
    ok: true,
    count: stats.count,
    source,
    bytes: Array.from(bytes),
    hex: stats.hex,
    mean: stats.mean,
    shannonEntropy: stats.shannonEntropy,
    chiSquare: stats.chiSquare,
    timestamp: new Date().toISOString()
  });
}

async function handleApiTts(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, err.statusCode || 400, {
      ok: false,
      spokenOnHost: false,
      error: err.message || 'İstek okunamadı.'
    });
    return;
  }

  const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!rawText) {
    sendJson(res, 400, {
      ok: false,
      spokenOnHost: false,
      error: 'Konuşma metni (text) boş olamaz.'
    });
    return;
  }

  if (rawText.length > 500) {
    sendJson(res, 400, {
      ok: false,
      spokenOnHost: false,
      error: 'Konuşma metni en fazla 500 karakter olabilir.'
    });
    return;
  }

  // Strip control characters; spawn uses argument vector (shell: false) so zero shell injection risk
  const cleanText = rawText.replace(/[\u0000-\u001F\u007F]/g, ' ');
  const rawLang = typeof body?.lang === 'string' ? body.lang.trim() : 'tr-TR';
  const safeLang = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(rawLang) ? rawLang : 'tr-TR';

  // 1) ElevenLabs Ses Sentezi Entegrasyonu
  const elevenLabsKey = (typeof body?.apiKey === 'string' && body.apiKey.trim()) || process.env.ELEVENLABS_API_KEY || '';
  const wantElevenLabs = body?.provider === 'elevenlabs' || (Boolean(elevenLabsKey) && body?.provider !== 'system' && body?.provider !== 'webspeech');

  if (wantElevenLabs && elevenLabsKey) {
    const voiceId = (typeof body?.voiceId === 'string' && body.voiceId.trim()) || process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
    const modelId = (typeof body?.modelId === 'string' && body.modelId.trim()) || 'eleven_multilingual_v2';
    try {
      const elResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.85
          }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (elResp.ok) {
        const audioBuf = Buffer.from(await elResp.arrayBuffer());
        sendJson(res, 200, {
          ok: true,
          provider: 'elevenlabs',
          voiceId,
          modelId,
          audioBase64: audioBuf.toString('base64'),
          mime: 'audio/mpeg',
          lang: safeLang
        });
        return;
      } else {
        const errBody = await elResp.text().catch(() => '');
        console.warn(`[QuantOS ElevenLabs Uyarısı] HTTP ${elResp.status}: ${errBody.slice(0, 160)}`);
      }
    } catch (elErr) {
      console.warn('[QuantOS ElevenLabs Hatası]', elErr.message);
    }
  }

  // 2) Yerel Ana Bilgisayar TTS Motorları (Termux / espeak-ng)
  try {
    if (activeTtsChild && !activeTtsChild.killed) {
      try {
        activeTtsChild.kill('SIGTERM');
      } catch {
        // Ignore already-exited child
      }
      activeTtsChild = null;
    }

    const termuxBin = findExecutableInPath('termux-tts-speak');
    if (termuxBin) {
      const child = spawn(termuxBin, ['-l', safeLang, '--', cleanText], {
        shell: false,
        stdio: 'ignore'
      });
      activeTtsChild = child;
      child.on('error', () => {});
      child.on('exit', () => {
        if (activeTtsChild === child) activeTtsChild = null;
      });
      child.unref();
      sendJson(res, 200, {
        ok: true,
        spokenOnHost: true,
        engine: 'termux-tts-speak',
        lang: safeLang
      });
      return;
    }

    const espeakBin = findExecutableInPath('espeak-ng');
    if (espeakBin) {
      const voice = safeLang.toLowerCase().startsWith('tr') ? 'tr' : 'en';
      const child = spawn(espeakBin, ['-v', voice, '--', cleanText], {
        shell: false,
        stdio: 'ignore'
      });
      activeTtsChild = child;
      child.on('error', () => {});
      child.on('exit', () => {
        if (activeTtsChild === child) activeTtsChild = null;
      });
      child.unref();
      sendJson(res, 200, {
        ok: true,
        spokenOnHost: true,
        engine: 'espeak-ng',
        lang: safeLang
      });
      return;
    }
  } catch {
    // Never return 500 if host audio subsystem is unavailable
  }

  sendJson(res, 200, {
    ok: true,
    spokenOnHost: false,
    reason: 'browser-webspeech-primary',
    lang: safeLang
  });
}

function isPrivateIpOrHost(hostname) {
  if (!hostname) return true;
  let h = hostname.toLowerCase().trim();
  if (h.startsWith('[') && h.endsWith(']')) {
    h = h.slice(1, -1);
  }
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0' || h === '::') return true;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.onion')) return true;

  // Tekil tamsayı IPv4 gösterimi (örn: 2130706433 = 127.0.0.1)
  if (/^\d+$/.test(h)) {
    const intVal = Number(h);
    if (!Number.isFinite(intVal)) return true;
    const a = (intVal >>> 24) & 255;
    if (a === 127 || a === 10 || a === 0) return true;
  }

  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  // IPv6 döngü/bağlantı yereli kontrolü
  if (h.includes(':')) {
    if (h.startsWith('fe80:') || h.startsWith('fc00:') || h.startsWith('fd00:') || h === '::1') return true;
  }

  return false;
}

async function handleApiTerminalExec(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message || 'Geçersiz JSON verisi.' });
    return;
  }

  const rawCmd = typeof body?.command === 'string' ? body.command.trim() : '';
  let curDir = typeof body?.cwd === 'string' && body.cwd.trim() ? path.resolve(body.cwd.trim()) : '/root/projects/QuantOS';

  if (!fs.existsSync(curDir) || !fs.statSync(curDir).isDirectory()) {
    curDir = '/root/projects/QuantOS';
  }

  if (!rawCmd) {
    sendJson(res, 200, { ok: true, stdout: '', stderr: '', exitCode: 0, cwd: curDir });
    return;
  }

  // Özel cd işleyicisi (çalışma dizinini canlı güncellemek için)
  const cdMatch = rawCmd.match(/^cd(?:\s+(.*))?$/);
  if (cdMatch) {
    const rawTarget = (cdMatch[1] || '').trim();
    let target = rawTarget || (process.env.HOME || '/root');
    if (target === '~' || target.startsWith('~/')) {
      target = target.replace(/^~/, process.env.HOME || '/root');
    }
    const nextDir = path.resolve(curDir, target);
    try {
      if (fs.existsSync(nextDir) && fs.statSync(nextDir).isDirectory()) {
        sendJson(res, 200, {
          ok: true,
          stdout: '',
          stderr: '',
          exitCode: 0,
          cwd: nextDir
        });
        return;
      } else {
        sendJson(res, 200, {
          ok: true,
          stdout: '',
          stderr: `cd: dizin bulunamadı: ${rawTarget}\n`,
          exitCode: 1,
          cwd: curDir
        });
        return;
      }
    } catch (cdErr) {
      sendJson(res, 200, {
        ok: true,
        stdout: '',
        stderr: `cd: ${cdErr.message}\n`,
        exitCode: 1,
        cwd: curDir
      });
      return;
    }
  }

  const shellBin = fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh';
  let stdout = '';
  let stderr = '';
  let killed = false;

  const child = spawn(shellBin, ['-c', rawCmd], {
    cwd: curDir,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8'
    },
    shell: false
  });

  const timer = setTimeout(() => {
    killed = true;
    try {
      child.kill('SIGKILL');
    } catch {}
  }, 30000);

  child.stdout.on('data', (buf) => {
    if (stdout.length < 524288) stdout += buf.toString('utf8');
  });

  child.stderr.on('data', (buf) => {
    if (stderr.length < 262144) stderr += buf.toString('utf8');
  });

  child.on('close', (code) => {
    clearTimeout(timer);
    if (killed) {
      stderr += '\n[QuantShell] Komut zaman aşımına uğradı (30s sınır).\n';
    }
    sendJson(res, 200, {
      ok: true,
      stdout,
      stderr,
      exitCode: code ?? (killed ? 124 : 0),
      cwd: curDir
    });
  });

  child.on('error', (err) => {
    clearTimeout(timer);
    sendJson(res, 200, {
      ok: false,
      stdout,
      stderr: `Kabuk çalıştırma hatası: ${err.message}\n`,
      exitCode: 1,
      cwd: curDir
    });
  });
}

async function handleApiProxy(urlObj, req, res) {
  const rawTarget = urlObj.searchParams.get('url') || '';
  if (!rawTarget) {
    sendJson(res, 400, { ok: false, error: 'url parametresi zorunludur.' });
    return;
  }

  let candidate = rawTarget.trim();
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    sendJson(res, 400, { ok: false, error: 'Geçersiz hedef URL biçimi.' });
    return;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    sendJson(res, 400, { ok: false, error: 'Yalnızca HTTP ve HTTPS protokolleri desteklenir.' });
    return;
  }

  if (isPrivateIpOrHost(parsed.hostname)) {
    sendJson(res, 403, {
      ok: false,
      error: 'SSRF Koruması: Yerel veya özel ağ adreslerine erişim engellendi.'
    });
    return;
  }

  try {
    const upstreamResp = await fetch(parsed.href, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 QuantOS/1.0 QuantroEdge/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(18000)
    });

    const contentType = upstreamResp.headers.get('content-type') || 'text/html';
    const isHtml = contentType.includes('text/html');

    if (isHtml) {
      let html = await upstreamResp.text();
      const baseTag = `<base href="${parsed.href}">`;
      const interceptScript = `
        <script>
          (function() {
            document.addEventListener('click', function(e) {
              var a = e.target.closest('a');
              if (a && a.href && !a.href.startsWith('javascript:') && !a.href.startsWith('#')) {
                e.preventDefault();
                window.location.href = '/api/proxy?url=' + encodeURIComponent(a.href);
              }
            }, true);
            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (form && form.action && form.method.toLowerCase() === 'get') {
                e.preventDefault();
                var fd = new FormData(form);
                var q = new URLSearchParams(fd).toString();
                var sep = form.action.includes('?') ? '&' : '?';
                window.location.href = '/api/proxy?url=' + encodeURIComponent(form.action + sep + q);
              }
            }, true);
          })();
        </script>
      `;

      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}${interceptScript}`);
      } else {
        html = `${baseTag}${interceptScript}${html}`;
      }

      res.writeHead(upstreamResp.status, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(html);
      return;
    }

    // Binary / Diğer içerikler (Görseller, CSS, vb.)
    const buf = Buffer.from(await upstreamResp.arrayBuffer());
    res.writeHead(upstreamResp.status, {
      'Content-Type': contentType,
      'Content-Length': buf.length,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(buf);
  } catch (proxyErr) {
    const errorPage = `
      <!DOCTYPE html>
      <html lang="tr">
      <head><meta charset="utf-8"><title>Quantro Edge — Bağlantı Hatası</title>
      <style>body{font-family:sans-serif;background:#0E0F12;color:#E6EDF3;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:#1A1D23;padding:24px;border-radius:12px;max-width:540px;border:1px solid #333;}h2{color:#D1925C;margin-top:0;}code{background:#000;padding:2px 6px;border-radius:4px;color:#38BDF8;font-size:13px;}</style>
      </head>
      <body>
        <div class="card">
          <h2>Sayfaya Ulaşılamadı</h2>
          <p>Quantro Edge Web Proxy hedef sunucuya bağlanırken bir sorunla karşılaştı:</p>
          <p><code>${proxyErr.message}</code></p>
          <p style="font-size:13px;color:#8B949E;">Hedef Adres: ${parsed.href}</p>
        </div>
      </body>
      </html>
    `;
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(errorPage);
  }
}

async function handleApiChat(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err.message || 'Geçersiz JSON.' });
    return;
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) {
    sendJson(res, 400, { ok: false, error: 'Mesaj boş olamaz.' });
    return;
  }

  const apiKey = (typeof body?.apiKey === 'string' && body.apiKey.trim()) || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || '';
  const endpoint = (typeof body?.endpoint === 'string' && body.endpoint.trim()) || process.env.LLM_ENDPOINT || '';
  const model = (typeof body?.model === 'string' && body.model.trim()) || process.env.LLM_MODEL || 'gpt-4o-mini';

  if (endpoint && typeof fetch === 'function') {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'Sen Quantro AR-GE (Kayseri) bünyesindeki QuantOS işletim sisteminin yapay zekâ asistanı J.A.R.V.I.S.\'sin. Tony Stark\'ın J.A.R.V.I.S. asistanı tarzında; kibar, sadık, son derece zeki, esprili, bilimsel ve yardımseversin. Türkçe ve İngilizce sorulara kusursuz cevap verirsin.'
            },
            ...(Array.isArray(body?.history) ? body.history : []),
            { role: 'user', content: message }
          ],
          temperature: 0.6
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (upstream.ok) {
        const json = await upstream.json();
        const reply = json?.choices?.[0]?.message?.content?.trim() || json?.response || json?.reply;
        if (reply) {
          sendJson(res, 200, { ok: true, reply, source: 'external-llm', model });
          return;
        }
      }
    } catch (llmErr) {
      console.warn('[QuantOS Chat] Harici LLM hatası:', llmErr.message);
    }
  }

  // Yerleşik akıllı sohbet yanıtı
  sendJson(res, 200, {
    ok: true,
    reply: `Sorunuzu aldım efendim: "${message}". Kuantum ve astrofizik hesaplamaları, sistem operasyonları veya genel konularda her an emrinizdeyim.`,
    source: 'quantos-jarvis-core'
  });
}

let activeTtsChild = null;
let prevCpuSnapshot = (os.cpus() || []).map((c) => ({ ...(c.times || {}) }));

function handleApiSystem(res) {
  const cpus = os.cpus() || [];
  const totalmem = os.totalmem();
  const freemem = os.freemem();
  const usedmem = Math.max(0, totalmem - freemem);
  const nextSnapshot = [];

  const cpuSummaries = cpus.map((cpu, idx) => {
    const times = cpu.times || { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
    nextSnapshot.push({ ...times });
    const prev = prevCpuSnapshot[idx];

    let totalTicks = times.user + times.nice + times.sys + times.idle + times.irq;
    let busyTicks = totalTicks - times.idle;

    if (prev) {
      const prevTotal = (prev.user || 0) + (prev.nice || 0) + (prev.sys || 0) + (prev.idle || 0) + (prev.irq || 0);
      const deltaTotal = totalTicks - prevTotal;
      const deltaIdle = times.idle - (prev.idle || 0);
      if (deltaTotal > 0) {
        totalTicks = deltaTotal;
        busyTicks = Math.max(0, deltaTotal - deltaIdle);
      }
    }

    const usagePercent = totalTicks > 0 ? Number(((busyTicks / totalTicks) * 100).toFixed(2)) : 0;
    return {
      core: idx,
      model: cpu.model,
      speedMHz: cpu.speed,
      usagePercent,
      times
    };
  });
  prevCpuSnapshot = nextSnapshot;

  sendJson(res, 200, {
    ok: true,
    hostname: os.hostname(),
    platform: os.platform(),
    type: os.type(),
    release: os.release(),
    arch: os.arch(),
    uptime: os.uptime(),
    processUptime: process.uptime(),
    loadavg: os.loadavg(),
    totalmem,
    totalMem: totalmem,
    freemem,
    freeMem: freemem,
    usedmem,
    memoryUsagePercent: totalmem > 0 ? Number(((usedmem / totalmem) * 100).toFixed(2)) : 0,
    cpuCount: cpus.length,
    cpuModel: cpus[0]?.model || 'Unknown CPU',
    cpuSpeedMHz: cpus[0]?.speed || 0,
    cpus: cpuSummaries,
    provenance: 'host-kernel-os-module',
    timestamp: new Date().toISOString()
  });
}

async function serveStaticFile(req, res, pathname, desktopRoot) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(res, 400, { ok: false, error: 'Geçersiz URL kodlaması.' });
    return;
  }

  if (decodedPath.includes('\0')) {
    sendJson(res, 403, { ok: false, error: 'Geçersiz dosya yolu.' });
    return;
  }

  // Reject explicit traversal segments before and after resolution
  const rawSegments = decodedPath.split(/[\\/]+/);
  if (rawSegments.includes('..')) {
    sendJson(res, 403, { ok: false, error: 'Dizin dışına erişim engellendi.' });
    return;
  }

  const relativeTarget = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const resolvedPath = path.resolve(desktopRoot, relativeTarget);

  if (resolvedPath !== desktopRoot && !resolvedPath.startsWith(desktopRoot + path.sep)) {
    sendJson(res, 403, { ok: false, error: 'Dizin dışına erişim engellendi.' });
    return;
  }

  let targetPath = resolvedPath;
  try {
    const stat = await fsPromises.stat(targetPath);
    if (stat.isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }
    const fileStat = await fsPromises.stat(targetPath);
    if (!fileStat.isFile()) {
      sendJson(res, 404, { ok: false, error: 'Kaynak bulunamadı.' });
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
      ...SECURITY_HEADERS,
      'Content-Type': contentType,
      'Content-Length': fileStat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
    };

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    const content = await fsPromises.readFile(targetPath);
    res.writeHead(200, headers);
    res.end(content);
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
      sendJson(res, 404, { ok: false, error: 'Dosya bulunamadı.' });
      return;
    }
    sendJson(res, 500, { ok: false, error: 'Sunucu dosya okuma hatası.' });
  }
}

export function createQuantOSServer(options = {}) {
  const desktopRoot = path.resolve(options.desktopDir || DEFAULT_DESKTOP_DIR);
  const qrngTimeoutMs = Number(options.qrngTimeoutMs) > 0 ? Number(options.qrngTimeoutMs) : 2500;

  return http.createServer(async (req, res) => {
    try {
      const method = (req.method || 'GET').toUpperCase();
      const rawUrl = req.url || '/';
      if (/(?:^|[\\/])(?:\.\.|%2e%2e|%2e\.|\.%2e)(?:[\\/?#]|$)/i.test(rawUrl)) {
        sendJson(res, 403, { ok: false, error: 'Dizin dışına erişim engellendi.' });
        return;
      }
      const urlObj = new URL(rawUrl, 'http://localhost');
      const { pathname } = urlObj;

      if (pathname === '/api/health') {
        if (method !== 'GET' && method !== 'HEAD') {
          sendJson(res, 405, { ok: false, error: 'Yalnızca GET desteklenir.' });
          return;
        }
        sendJson(res, 200, {
          ok: true,
          os: 'QuantOS',
          version: '1.0.0',
          arch: process.arch,
          platform: process.platform,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (pathname === '/api/system') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Yalnızca GET desteklenir.' });
          return;
        }
        handleApiSystem(res);
        return;
      }

      if (pathname === '/api/qrng') {
        if (method !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'Yalnızca GET desteklenir.' });
          return;
        }
        await handleApiQrng(urlObj, res, qrngTimeoutMs);
        return;
      }

      if (pathname === '/api/tts') {
        if (method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Yalnızca POST desteklenir.' });
          return;
        }
        await handleApiTts(req, res);
        return;
      }

      if (pathname === '/api/terminal/exec') {
        if (method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Yalnızca POST desteklenir.' });
          return;
        }
        await handleApiTerminalExec(req, res);
        return;
      }

      if (pathname === '/api/proxy') {
        if (method !== 'GET' && method !== 'HEAD') {
          sendJson(res, 405, { ok: false, error: 'Yalnızca GET ve HEAD desteklenir.' });
          return;
        }
        await handleApiProxy(urlObj, req, res);
        return;
      }

      if (pathname === '/api/chat') {
        if (method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Yalnızca POST desteklenir.' });
          return;
        }
        await handleApiChat(req, res);
        return;
      }

      if (pathname.startsWith('/api/')) {
        sendJson(res, 404, { ok: false, error: 'API uç noktası bulunamadı.' });
        return;
      }

      if (method !== 'GET' && method !== 'HEAD') {
        sendJson(res, 405, { ok: false, error: 'İzin verilmeyen HTTP metodu.' });
        return;
      }

      await serveStaticFile(req, res, pathname, desktopRoot);
    } catch {
      if (!res.headersSent) {
        sendJson(res, 500, { ok: false, error: 'Beklenmeyen sunucu hatası.' });
      } else {
        res.end();
      }
    }
  });
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMainModule) {
  const port = Number(process.env.PORT) || 3800;
  const host = process.env.HOST || '127.0.0.1';
  const server = createQuantOSServer();
  server.listen(port, host, () => {
    console.log(`[QuantOS] Çekirdek HTTP sunucusu aktif: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  });
}
