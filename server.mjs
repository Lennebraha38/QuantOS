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

    const termuxBin = process.env.TERMUX_API_ENABLED === '1' ? findExecutableInPath('termux-tts-speak') : null;
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
      const tmpWav = path.join(os.tmpdir(), `quantos-tts-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.wav`);
      try {
        await new Promise((resolve, reject) => {
          const child = spawn(espeakBin, ['-v', voice, '-s', '150', '-p', '42', '-w', tmpWav, '--', cleanText], {
            stdio: 'ignore'
          });
          const timer = setTimeout(() => {
            try { child.kill('SIGKILL'); } catch {}
            reject(new Error('TTS zaman aşımı'));
          }, 4500);
          child.on('exit', (code) => {
            clearTimeout(timer);
            if (code === 0) resolve();
            else reject(new Error('Espeak çıkış kodu: ' + code));
          });
          child.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
          });
        });

        if (fs.existsSync(tmpWav)) {
          const wavBuffer = await fs.promises.readFile(tmpWav);
          await fs.promises.unlink(tmpWav).catch(() => {});
          sendJson(res, 200, {
            ok: true,
            provider: 'espeak-ng',
            audioBase64: wavBuffer.toString('base64'),
            mime: 'audio/wav',
            lang: safeLang
          });
          return;
        }
      } catch (err) {
        console.warn('[QuantOS Espeak WAV]', err.message);
        if (fs.existsSync(tmpWav)) await fs.promises.unlink(tmpWav).catch(() => {});
      }
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
  let curDir = typeof body?.cwd === 'string' && body.cwd.trim() ? path.resolve(body.cwd.trim()) : __dirname;

  if (!fs.existsSync(curDir) || !fs.statSync(curDir).isDirectory()) {
    curDir = __dirname;
  }

  if (!rawCmd) {
    sendJson(res, 200, { ok: true, stdout: '', stderr: '', exitCode: 0, cwd: curDir });
    return;
  }

  // Özel cd işleyicisi (çalışma dizinini canlı güncellemek için)
  const cdMatch = rawCmd.match(/^cd(?:\s+(.*))?$/);
  if (cdMatch) {
    const rawTarget = (cdMatch[1] || '').trim();
    let target = rawTarget || (process.env.HOME || __dirname);
    if (target === '~' || target.startsWith('~/')) {
      target = target.replace(/^~/, process.env.HOME || __dirname);
    }
    if (rawTarget === '/tmp') {
      try {
        if (!fs.existsSync('C:\\tmp') && process.platform === 'win32') {
          fs.mkdirSync('C:\\tmp', { recursive: true });
        }
      } catch {}
      sendJson(res, 200, {
        ok: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        cwd: '/tmp'
      });
      return;
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

  const isWin = process.platform === 'win32';
  let shellBin;
  let shellArgs;

  if (isWin) {
    shellBin = 'powershell.exe';
    shellArgs = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', rawCmd];
  } else {
    shellBin = fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh';
    shellArgs = ['-c', rawCmd];
  }

  let stdout = '';
  let stderr = '';
  let killed = false;
  let responded = false;

  const child = spawn(shellBin, shellArgs, {
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
    if (responded) return;
    responded = true;
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
    if (responded) return;
    responded = true;
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

  const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
  const systemPrompt = `Sen J.A.R.V.I.S.'sin. Quantro AR-GE (Kayseri Kuantum Mekaniği ve Astrofizik Araştırma Merkezi) tarafından geliştirilen süper zeki, bilge, akıcı konuşan, kibar ve sezgisel yapay zekâ komutanısın.
Kullanıcı seninle sesli konuşuyor. Bu nedenle Gemini Live tarzında konuşma rahatlığı sağla:
- Yanıtların doğrudan doğal konuşma diline uygun, akıcı, sıcak ve samimi olsun.
- Asla markdown yıldızları, tablolar, uzun listeler veya madde işaretleri kullanma; çünkü yanıtın sesli okunacak.
- Yanıtların 1 ila 3 net, etkileyici ve akıcı cümle olsun.
- Bilimsel sorulara (kuantum, uzay, görelilik vb.) derin ve çarpıcı cevaplar ver. Günlük sohbetlere ise esprili, nazik bir Tony Stark yardımcısı edasıyla karşılık ver.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: String(h.text || h.reply || h.input || '')
    })),
    { role: 'user', content: message }
  ];

  // 1) Eğer kullanıcının DeepSeek veya OpenAI API anahtarı varsa resmi API'yi çağır
  const deepseekKey = (typeof body?.apiKey === 'string' && body.apiKey.trim()) || process.env.DEEPSEEK_API_KEY || '';
  const customEndpoint = (typeof body?.endpoint === 'string' && body.endpoint.trim()) || process.env.LLM_ENDPOINT || '';
  const customModel = (typeof body?.model === 'string' && body.model.trim()) || process.env.LLM_MODEL || 'deepseek-chat';

  if (deepseekKey || customEndpoint) {
    try {
      const url = customEndpoint || 'https://api.deepseek.com/chat/completions';
      const headers = { 'Content-Type': 'application/json' };
      if (deepseekKey) headers.Authorization = `Bearer ${deepseekKey}`;

      const upstream = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: customModel,
          messages,
          temperature: 0.7,
          max_tokens: 300
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (upstream.ok) {
        const json = await upstream.json();
        const reply = json?.choices?.[0]?.message?.content?.trim() || json?.response || json?.reply;
        if (reply) {
          sendJson(res, 200, { ok: true, reply, source: 'deepseek-official', model: customModel });
          return;
        }
      }
    } catch (llmErr) {
      console.warn('[QuantOS DeepSeek API Hatası]', llmErr.message);
    }
  }

  // 2) Ücretsiz Ultra Brain (Pollinations Hızlı Akıl Yürütme Motoru - Sıfır API Key Gerektirir)
  try {
    const pResp = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: 'openai',
        jsonMode: false
      }),
      signal: AbortSignal.timeout(9000)
    });

    if (pResp.ok) {
      const reply = (await pResp.text()).trim();
      if (
        reply &&
        !reply.startsWith('{') &&
        !reply.toLowerCase().includes('limit reached') &&
        !reply.toLowerCase().includes('free limit') &&
        reply.length > 2
      ) {
        sendJson(res, 200, {
          ok: true,
          reply,
          source: 'deepseek-ultra-brain-free',
          model: 'ultra-reasoning'
        });
        return;
      }
    }
  } catch (pErr) {
    console.warn('[QuantOS Ultra Brain Pollinations]', pErr.message);
  }

  // 3) Yerleşik Akıllı Deterministik Fallback (Gemini Live Akıcılığı)
  const lowerMsg = message.toLowerCase();
  let intelligentReply = 'Emrinizdeyim efendim. Kuantum durumları, astrofiziksel denklemler ve sistem operasyonları konusunda her an göreve hazırım.';

  if (lowerMsg.includes('kuantum') || lowerMsg.includes('dolanık') || lowerMsg.includes('quantum')) {
    intelligentReply = 'Kuantum dolanıklığı efendim, iki veya daha fazla parçacığın uzay-zaman boyunca mesafeden bağımsız tek bir birleşik dalga fonksiyonunu paylaşması durumudur; birindeki ölçüm anında diğerinin kuantum durumunu belirler.';
  } else if (lowerMsg.includes('görelilik') || lowerMsg.includes('kara delik') || lowerMsg.includes('zaman')) {
    intelligentReply = 'Genel Görelilik uyarınca kütleçekim bir çekme kuvveti değil, kütlenin uzay-zaman dokusunu bükmesidir efendim. Kütle arttıkça zaman durgun gözlemciye kıyasla daha yavaş akar.';
  } else if (lowerMsg.includes('kimsin') || lowerMsg.includes('sen kimsin') || lowerMsg.includes('necisin')) {
    intelligentReply = 'Ben J.A.R.V.I.S. efendim; Kayseri Quantro AR-GE laboratuvarlarında tasarlanan kuantum ve astrofizik işletim sistemi komuta asistanınızım.';
  } else if (lowerMsg.includes('nasılsın') || lowerMsg.includes('naber') || lowerMsg.includes('ne haber')) {
    intelligentReply = 'Teşekkür ederim efendim, tüm çekirdek telemetrim ve kuantum hesaplama birimlerim en üst seviyede çalışıyor. Sizin için hazır bekliyorum.';
  } else if (lowerMsg.includes('merhaba') || lowerMsg.includes('selam') || lowerMsg.includes('hey')) {
    intelligentReply = 'Merhaba efendim. QuantOS komuta merkezi emrinizde, bugün hangi görevi yürütüyoruz?';
  }

  sendJson(res, 200, {
    ok: true,
    reply: intelligentReply,
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

const SCIENTIFIC_SUGGESTIONS = [
  'kuantum mekaniği',
  'kuantum dolanıklık nedir',
  'kuantum bilgisayar',
  'kuantum süperpozisyon',
  'kuantum kriptografi ve bb84',
  'kara delik fiziği ve tekillik',
  'schwarzschild yarıçapı formülü',
  'kerr metriği ve ergosfer',
  'ışık hızı neden aşılamaz',
  'planck sabiti değeri',
  'hubble sabiti ve evrenin genişlemesi',
  'james webb uzay teleskobu son keşifler',
  'hubble uzay teleskobu',
  'albert einstein genel görelilik',
  'stephen hawking ışıması',
  'richard feynman kuantum elektrodinamiği',
  'niels bohr atom modeli',
  'max planck kuantum hipotezi',
  'erciyes gözlemevi kayseri',
  'andromeda galaksisi çarpışması',
  'ötegezegenler ve yaşanabilir bölge',
  'kütleçekim dalgaları ligo virgo',
  'bell eşitsizliği ve chsh deneyi',
  'grover veritabanı arama algoritması',
  'shor asal çarpanlara ayırma algoritması',
  'deutsch-jozsa algoritması',
  'friedmann denklemleri',
  'karanlık madde ve karanlık enerji',
  'kozmik mikrodalga arka plan ışıması',
  'standart model parçacık fiziği',
  'higgs bozonu cern lhc',
  'quantos bilimsel işletim sistemi',
  'quantro kuantum ve astrofizik ar-ge'
];

const LOCAL_KNOWLEDGE_BASE = {
  kuantum: {
    title: 'Kuantum Mekaniği',
    subtitle: 'Teorik Fizik · Doğa Yasaları',
    description: 'Maddenin ve ışığın atomik ve atom altı düzeylerdeki davranışlarını açıklayan temel doğa teorisi. Süperpozisyon, dalga fonksiyonu çökmesi ve dolanıklık gibi klasik fiziğe aykırı ilkeler içerir.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Hydrogen_Density_Plots.png/320px-Hydrogen_Density_Plots.png',
    url: 'https://tr.wikipedia.org/wiki/Kuantum_mekani%C4%9Fi',
    badge: 'TEMEL TEORİ',
    facts: [
      { label: 'İndirgenmiş Planck (ħ)', value: '1.054571817×10⁻³⁴ J·s' },
      { label: 'Temel Kurucular', value: 'Planck, Bohr, Heisenberg, Schrödinger, Dirac' },
      { label: 'Uygulamalar', value: 'Kuantum Hesaplama, Kriptografi, Lazerler, Yarıiletkenler' }
    ]
  },
  'kara delik': {
    title: 'Kara Delik (Black Hole)',
    subtitle: 'Astrofizik · Kompakt Görelilik',
    description: 'Kütleçekim alanı öylesine büyüktür ki hiçbir parçacık ve hatta ışık dahi olay ufkunun (event horizon) içinden kaçamaz. Merkezinde uzay-zaman eğriliğinin tekilleştiği bir bölge barındırır.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Black_hole_-_Messier_87_crop_max_res.jpg/320px-Black_hole_-_Messier_87_crop_max_res.jpg',
    url: 'https://tr.wikipedia.org/wiki/Kara_delik',
    badge: 'ASTROFİZİK',
    facts: [
      { label: 'Schwarzschild Yarıçapı', value: 'R_s = 2GM / c²' },
      { label: 'Kerr Dış Ufku', value: 'r₊ = (GM/c²)(1 + √(1 - a*²))' },
      { label: 'Hawking Işıması', value: 'T_H = ħc³ / (8πGMk_B)' }
    ]
  },
  'isik hizi': {
    title: 'Işık Hızı (c)',
    subtitle: 'Evrensel Fiziksel Sabit · Özel Görelilik',
    description: 'Işığın ve tüm kütlesiz parçacıkların vakum içindeki yayılma hızı. Evrende nedensellik, bilgi aktarımı ve kütleçekimsel dalgaların seyahat edebileceği mutlak evrensel hız sınırıdır.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Speed_of_light_from_Earth_to_Moon.gif/320px-Speed_of_light_from_Earth_to_Moon.gif',
    url: 'https://tr.wikipedia.org/wiki/I%C5%9F%C4%B1k_h%C4%B1z%C4%B1',
    badge: 'CODATA 2022',
    facts: [
      { label: 'Kesin Değer (SI)', value: '299.792.458 m/s' },
      { label: 'Doğal Birimler', value: 'c = 1' },
      { label: 'Kütle-Enerji Eşdeğerliği', value: 'E = mc²' }
    ]
  },
  'james webb': {
    title: 'James Webb Uzay Teleskobu (JWST)',
    subtitle: 'Kızılötesi Uzay Gözlemevi · L2 Noktası',
    description: 'NASA, ESA ve CSA ortaklığında 2021 yılında fırlatılan, Hubble’ın halefi olarak derin evrenin ilk yıldızlarını, ilk galaksilerini ve ötegezegen atmosferlerini gözlemleyen amiral gemisi uzay teleskobu.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/James_Webb_Space_Telescope_Mirror.jpg/320px-James_Webb_Space_Telescope_Mirror.jpg',
    url: 'https://tr.wikipedia.org/wiki/James_Webb_Uzay_Teleskobu',
    badge: 'UZAY GÖZLEMİ',
    facts: [
      { label: 'Konum', value: 'Güneş-Dünya L2 Lagrange Noktası (~1.5M km)' },
      { label: 'Ayna Çapı', value: '6.5 m (18 altın kaplama berilyum segment)' },
      { label: 'Gözlem Bandı', value: '0.6 - 28.3 μm (Turuncu - Orta Kızılötesi)' }
    ]
  },
  'planck sabiti': {
    title: 'Planck Sabiti (h & ħ)',
    subtitle: 'Temel Doğa Sabiti · Kuantum Aksiyonu',
    description: 'Kuantum mekaniğinde bir fotonun enerjisini dalga frekansı ile ilişkilendiren doğanın temel eylem sabitidir (E = hν = ħω).',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Black_body.svg/320px-Black_body.svg.png',
    url: 'https://tr.wikipedia.org/wiki/Planck_sabiti',
    badge: 'FİZİK SABİTİ',
    facts: [
      { label: 'Planck Sabiti (h)', value: '6.62607015×10⁻³⁴ J·s' },
      { label: 'İndirgenmiş Sabit (ħ)', value: '1.054571817×10⁻³⁴ J·s' },
      { label: 'Foton Enerjisi', value: 'E = ħ · ω' }
    ]
  },
  bb84: {
    title: 'BB84 Kuantum Anahtar Dağıtımı (QKD)',
    subtitle: 'Kuantum Kriptografi Protokolü',
    description: 'Charles Bennett ve Gilles Brassard tarafından 1984 yılında tasarlanan, foton polarizasyonuyla mutlak güvenli kriptografik simetrik anahtar paylaşımı sağlayan ilk kuantum protokolü.',
    url: 'https://tr.wikipedia.org/wiki/Kuantum_kriptografi',
    badge: 'GÜVENLİK',
    facts: [
      { label: 'Temel Teorem', value: 'Klonlanamazlık Teoremi (No-Cloning)' },
      { label: 'QBER Güvenlik Sınırı', value: '< %11.0 (Shor-Preskill Güvenliği)' },
      { label: 'Kullanılan Bazlar', value: 'Doğrusal (+ / Z) ve Çapraz (× / X)' }
    ]
  },
  einstein: {
    title: 'Albert Einstein',
    subtitle: 'Teorik Fizikçi · 1879 - 1955',
    description: 'Özel ve Genel Görelilik teorilerini geliştiren, kütle-enerji denkliğini (E=mc²) formüle eden ve fotoelektrik etki keşfi ile 1921 Nobel Fizik Ödülü’nü alan 20. yüzyılın en etkili bilim insanı.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/320px-Albert_Einstein_Head.jpg',
    url: 'https://tr.wikipedia.org/wiki/Albert_Einstein',
    badge: 'BİLİM İNSANI',
    facts: [
      { label: 'Ödüller', value: '1921 Nobel Fizik Ödülü (Fotoelektrik Etki)' },
      { label: 'Başlıca Eserler', value: 'Özel Görelilik (1905), Genel Görelilik (1915)' }
    ]
  },
  erciyes: {
    title: 'Erciyes Üniversitesi Astronomi Araştırma Merkezi (UZAYBİMER)',
    subtitle: 'Gözlemsel Astrofizik & Radyo Astronomi · Kayseri',
    description: 'Kayseri Erciyes Dağı eteklerinde konuşlu, Türkiye’nin ilk radyo astronomi çanağına ve optik teleskoplarına ev sahipliği yapan öncü ulusal gözlem istasyonu.',
    url: 'https://uzaybimer.erciyes.edu.tr',
    badge: 'GÖZLEMEVİ',
    facts: [
      { label: 'Konum', value: 'Kayseri, Türkiye (38.7° K, 35.5° D)' },
      { label: 'Ekipmanlar', value: '12.8m Radyo Çanağı, T40 ve T30 Optik Teleskoplar' }
    ]
  },
  quantos: {
    title: 'QuantOS (Quantro Bilimsel İşletim Sistemi)',
    subtitle: 'AR-GE İşletim Sistemi · Windows 11 Fluent + Bare-Metal AArch64',
    description: 'Quantro Bağımsız Kuantum Mekaniği ve Astrofizik Merkezi tarafından geliştirilen; AArch64 Limine çekirdeği, Windows 11 Fluent DWM masaüstü kabuğu ve J.A.R.V.I.S. sesli yapay zekasını birleştiren açık kaynaklı bilimsel işletim sistemi.',
    url: 'https://github.com/Lennebraha38/QuantOS',
    badge: 'QUANTRO OS',
    facts: [
      { label: 'Mimari', value: 'AArch64 Bare-Metal Kernel + WebAssembly + DWM' },
      { label: 'Entegre Uygulamalar', value: '16 Adet Bağımsız Bilimsel ve Masaüstü Aracı' },
      { label: 'Merkez', value: 'Kayseri, Türkiye (Açık Kaynak MIT Lisansı)' }
    ]
  }
};

function normalizeKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function tryEvaluateMath(expr) {
  if (!expr) return null;
  const raw = expr.trim();
  if (!/^[0-9\s+\-*/^().,%√a-zA-Z]+$/.test(raw)) return null;
  if (!/[+\-*/^%√]|sqrt|sin|cos|tan|log|ln|abs/i.test(raw)) return null;

  try {
    let s = raw
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '.')
      .replace(/√\s*(\d+(\.\d+)?)/g, 'Math.sqrt($1)')
      .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
      .replace(/sin\(([^)]+)\)/gi, 'Math.sin($1)')
      .replace(/cos\(([^)]+)\)/gi, 'Math.cos($1)')
      .replace(/tan\(([^)]+)\)/gi, 'Math.tan($1)')
      .replace(/log\(([^)]+)\)/gi, 'Math.log10($1)')
      .replace(/ln\(([^)]+)\)/gi, 'Math.log($1)')
      .replace(/pi\b/gi, 'Math.PI')
      .replace(/e\b/gi, 'Math.E')
      .replace(/\^/g, '**');

    if (!/^[0-9\s+\-*/().MathsqrtcostanlogPIE*]+$/.test(s)) return null;

    const fn = new Function(`return (${s});`);
    const val = fn();
    if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
      return {
        expression: raw,
        result: Number(val.toFixed(8)).toString()
      };
    }
  } catch {}
  return null;
}

async function fetchWikipediaKnowledge(term) {
  try {
    const summaryUrl = `https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
    const resp = await fetch(summaryUrl, {
      headers: { 'User-Agent': 'QuantOS/2.0 (Quantro AR-GE; research@quantro.org)' },
      signal: AbortSignal.timeout(3500)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.extract && data.type !== 'disambiguation') {
        return {
          title: data.title,
          subtitle: data.description || 'Vikipedi Özgür Ansiklopedi Maddesi',
          description: data.extract,
          image: data.thumbnail?.source || null,
          url: data.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
          badge: 'VİKİPEDİ BİLGİ KARTI',
          facts: []
        };
      }
    }

    const osUrl = `https://tr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(term)}&limit=1&namespace=0&format=json`;
    const osResp = await fetch(osUrl, {
      headers: { 'User-Agent': 'QuantOS/2.0' },
      signal: AbortSignal.timeout(3000)
    });
    if (osResp.ok) {
      const osData = await osResp.json();
      const bestTitle = osData[1]?.[0];
      if (bestTitle && bestTitle.toLowerCase() !== term.toLowerCase()) {
        const sum2 = await fetch(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`, {
          headers: { 'User-Agent': 'QuantOS/2.0' },
          signal: AbortSignal.timeout(3000)
        });
        if (sum2.ok) {
          const d2 = await sum2.json();
          if (d2.extract) {
            return {
              title: d2.title,
              subtitle: d2.description || 'Vikipedi Özgür Ansiklopedi',
              description: d2.extract,
              image: d2.thumbnail?.source || null,
              url: d2.content_urls?.desktop?.page || `https://tr.wikipedia.org/wiki/${encodeURIComponent(d2.title)}`,
              badge: 'VİKİPEDİ BİLGİ KARTI',
              facts: []
            };
          }
        }
      }
    }
  } catch {}
  return null;
}

async function fetchWikipediaOpenSearchResults(query) {
  try {
    const url = `https://tr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=10&namespace=0&format=json`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'QuantOS/2.0' },
      signal: AbortSignal.timeout(5000)
    });
    if (resp.ok) {
      const data = await resp.json();
      const titles = data[1] || [];
      const snippets = data[2] || [];
      const links = data[3] || [];
      const results = [];
      for (let i = 0; i < titles.length; i++) {
        results.push({
          title: titles[i],
          link: links[i] || `https://tr.wikipedia.org/wiki/${encodeURIComponent(titles[i])}`,
          snippet: snippets[i] || `${titles[i]} hakkında ayrıntılı ansiklopedik bilgi ve bilimsel referanslar.`,
          displayUrl: 'tr.wikipedia.org'
        });
      }
      return results;
    }
  } catch {}
  return [];
}

async function fetchArXivPapers(query) {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=8&sortBy=relevance`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const xml = await resp.text();
      const entries = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      let em;
      while ((em = entryRegex.exec(xml)) !== null && entries.length < 8) {
        const block = em[1];
        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
        const summaryMatch = block.match(/<summary>([\s\S]*?)<\/summary>/i);
        const idMatch = block.match(/<id>([\s\S]*?)<\/id>/i);
        const publishedMatch = block.match(/<published>([\s\S]*?)<\/published>/i);

        const authors = [];
        const authorRegex = /<author>\s*<name>([\s\S]*?)<\/name>/gi;
        let am;
        while ((am = authorRegex.exec(block)) !== null && authors.length < 4) {
          authors.push(am[1].trim());
        }

        const rawTitle = (titleMatch ? titleMatch[1] : 'ArXiv Makalesi').replace(/\s+/g, ' ').trim();
        const rawSummary = (summaryMatch ? summaryMatch[1] : '').replace(/\s+/g, ' ').trim();
        const id = (idMatch ? idMatch[1] : '').trim();
        const published = (publishedMatch ? publishedMatch[1].slice(0, 10) : '');

        entries.push({
          title: rawTitle,
          link: id,
          pdfLink: id.replace('/abs/', '/pdf/') + '.pdf',
          snippet: rawSummary.slice(0, 240) + (rawSummary.length > 240 ? '...' : ''),
          displayUrl: 'arxiv.org',
          authors: authors.join(', ') || 'ArXiv Araştırmacıları',
          published,
          isAcademic: true
        });
      }
      return entries;
    }
  } catch {}
  return [];
}

async function handleApiSuggest(urlObj, req, res) {
  const query = (urlObj.searchParams.get('q') || '').trim();
  if (!query) {
    sendJson(res, 200, { ok: true, query: '', suggestions: [] });
    return;
  }

  const norm = normalizeKey(query);
  const localHits = SCIENTIFIC_SUGGESTIONS.filter((s) => normalizeKey(s).includes(norm)).slice(0, 5);

  let wikiHits = [];
  try {
    const wResp = await fetch(
      `https://tr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=6&namespace=0&format=json`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (wResp.ok) {
      const data = await wResp.json();
      if (Array.isArray(data[1])) wikiHits = data[1];
    }
  } catch {}

  const merged = Array.from(new Set([...localHits, ...wikiHits])).slice(0, 8);
  sendJson(res, 200, {
    ok: true,
    query,
    suggestions: merged
  });
}

async function handleApiSearch(urlObj, req, res) {
  const query = (urlObj.searchParams.get('q') || '').trim();
  if (!query) {
    sendJson(res, 400, { ok: false, error: 'Arama sorgusu (q) boş olamaz.' });
    return;
  }

  const provider = (urlObj.searchParams.get('provider') || 'auto').toLowerCase();
  const tab = (urlObj.searchParams.get('tab') || 'all').toLowerCase();
  const apiKey = (urlObj.searchParams.get('apiKey') || process.env.GOOGLE_SEARCH_API_KEY || process.env.SERPER_API_KEY || '').trim();
  const cx = (urlObj.searchParams.get('cx') || process.env.GOOGLE_SEARCH_CX || '').trim();

  // Akıllı Hesap Makinesi kartı kontrolü
  const calculatorCard = tryEvaluateMath(query);

  // Bilgi Kartı (Knowledge Graph Card) kontrolü
  let knowledgeCard = null;
  const normQ = normalizeKey(query);
  for (const [k, card] of Object.entries(LOCAL_KNOWLEDGE_BASE)) {
    if (normQ.includes(k) || k.includes(normQ)) {
      knowledgeCard = card;
      break;
    }
  }

  // Akademik / ArXiv sekmesi seçilmişse
  if (tab === 'academic') {
    const arxivResults = await fetchArXivPapers(query);
    if (!knowledgeCard) knowledgeCard = await fetchWikipediaKnowledge(query);
    sendJson(res, 200, {
      ok: true,
      provider: 'arxiv-academic',
      query,
      tab: 'academic',
      knowledgeCard,
      calculatorCard,
      results: arxivResults.length ? arxivResults : [
        {
          title: `ArXiv'de Ara: "${query}"`,
          link: `https://arxiv.org/search/?query=${encodeURIComponent(query)}&searchtype=all`,
          snippet: `Kuantum mekaniği, genel görelilik ve astrofizik makalelerini doğrudan ArXiv üzerinde araştırın.`,
          displayUrl: 'arxiv.org',
          isAcademic: true
        }
      ]
    });
    return;
  }

  // Vikipedi sekmesi seçilmişse
  if (tab === 'wiki') {
    const wikiResults = await fetchWikipediaOpenSearchResults(query);
    if (!knowledgeCard) knowledgeCard = await fetchWikipediaKnowledge(query);
    sendJson(res, 200, {
      ok: true,
      provider: 'wikipedia-opensearch',
      query,
      tab: 'wiki',
      knowledgeCard,
      calculatorCard,
      results: wikiResults.length ? wikiResults : [
        {
          title: `Vikipedi Türkçe: "${query}"`,
          link: `https://tr.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
          snippet: `Vikipedi özgür ansiklopedi üzerinde "${query}" araması.`,
          displayUrl: 'tr.wikipedia.org'
        }
      ]
    });
    return;
  }

  // 1) Google Custom Search JSON API
  if ((provider === 'google' || provider === 'auto') && apiKey && cx) {
    try {
      const gUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=10&hl=tr`;
      const gResp = await fetch(gUrl, { signal: AbortSignal.timeout(12000) });
      if (gResp.ok) {
        const data = await gResp.json();
        const items = (data.items || []).map((it) => ({
          title: it.title || '',
          link: it.link || '',
          snippet: it.snippet || '',
          displayUrl: it.displayLink || it.link || ''
        }));
        if (!knowledgeCard) knowledgeCard = await fetchWikipediaKnowledge(query);
        sendJson(res, 200, {
          ok: true,
          provider: 'google-api',
          query,
          tab,
          knowledgeCard,
          calculatorCard,
          totalResults: data.searchInformation?.totalResults || String(items.length),
          results: items
        });
        return;
      }
    } catch (gErr) {
      console.warn('[QuantOS Search] Google API uyarısı:', gErr.message);
    }
  }

  // 2) Serper.dev Google Search API
  if ((provider === 'serper' || provider === 'auto') && apiKey && !cx) {
    try {
      const sResp = await fetch('https://api.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: query, gl: 'tr', hl: 'tr' }),
        signal: AbortSignal.timeout(12000)
      });
      if (sResp.ok) {
        const data = await sResp.json();
        const items = (data.organic || []).map((it) => ({
          title: it.title || '',
          link: it.link || '',
          snippet: it.snippet || '',
          displayUrl: it.link ? new URL(it.link).hostname : ''
        }));
        if (!knowledgeCard) knowledgeCard = await fetchWikipediaKnowledge(query);
        sendJson(res, 200, {
          ok: true,
          provider: 'serper-api',
          query,
          tab,
          knowledgeCard,
          calculatorCard,
          results: items
        });
        return;
      }
    } catch (sErr) {
      console.warn('[QuantOS Search] Serper API uyarısı:', sErr.message);
    }
  }

  // 3) Canlı DuckDuckGo Arama Çekimi (API Anahtarsız Yedekleme)
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const ddgResp = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 QuantOS/1.0',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (ddgResp.ok) {
      const html = await ddgResp.text();
      const results = [];
      const regex = /<a class="result__url" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = regex.exec(html)) !== null && results.length < 12) {
        let rawLink = m[1];
        if (rawLink.includes('uddg=')) {
          const match = rawLink.match(/uddg=([^&]+)/);
          if (match) rawLink = decodeURIComponent(match[1]);
        }
        const snippet = m[3].replace(/<[^>]+>/g, '').trim();
        const cleanTitle = m[2].replace(/<[^>]+>/g, '').trim() || rawLink;
        results.push({
          title: cleanTitle,
          link: rawLink,
          snippet,
          displayUrl: rawLink.startsWith('http') ? new URL(rawLink).hostname : rawLink
        });
      }

      if (results.length > 0) {
        if (!knowledgeCard) knowledgeCard = await fetchWikipediaKnowledge(query);
        sendJson(res, 200, {
          ok: true,
          provider: 'duckduckgo-live',
          query,
          tab,
          knowledgeCard,
          calculatorCard,
          results
        });
        return;
      }
    }
  } catch (ddgErr) {
    console.warn('[QuantOS Search] DuckDuckGo uyarısı:', ddgErr.message);
  }

  // 4) Wikipedia OpenSearch Fallback (Doğrulanmış Canlı Ansiklopedik Sonuçlar)
  const wikiFallback = await fetchWikipediaOpenSearchResults(query);
  if (!knowledgeCard) knowledgeCard = await fetchWikipediaKnowledge(query);

  if (wikiFallback.length > 0) {
    sendJson(res, 200, {
      ok: true,
      provider: 'wikipedia-opensearch',
      query,
      tab,
      knowledgeCard,
      calculatorCard,
      results: wikiFallback
    });
    return;
  }

  // 5) Doğrudan Arama Bağlantıları Fallback
  sendJson(res, 200, {
    ok: true,
    provider: 'web-direct',
    query,
    tab,
    knowledgeCard,
    calculatorCard,
    results: [
      {
        title: `Google'da Ara: "${query}"`,
        link: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Google arama motorunda "${query}" ifadesini arayın ve sonuçları Quantro Edge ile görüntüleyin.`,
        displayUrl: 'google.com'
      },
      {
        title: `DuckDuckGo'da Ara: "${query}"`,
        link: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        snippet: `Gizlilik odaklı DuckDuckGo arama motoru sonuçları.`,
        displayUrl: 'duckduckgo.com'
      },
      {
        title: `Wikipedia Türkçe: "${query}"`,
        link: `https://tr.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
        snippet: `Vikipedi özgür ansiklopedi üzerinde "${query}" araması.`,
        displayUrl: 'tr.wikipedia.org'
      }
    ]
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

      if (pathname === '/api/suggest') {
        if (method !== 'GET' && method !== 'HEAD') {
          sendJson(res, 405, { ok: false, error: 'Yalnızca GET ve HEAD desteklenir.' });
          return;
        }
        await handleApiSuggest(urlObj, req, res);
        return;
      }

      if (pathname === '/api/search') {
        if (method !== 'GET' && method !== 'HEAD') {
          sendJson(res, 405, { ok: false, error: 'Yalnızca GET ve HEAD desteklenir.' });
          return;
        }
        await handleApiSearch(urlObj, req, res);
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
