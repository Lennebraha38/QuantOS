# QuantOS — Quantro AR-GE Kuantum & Astrofizik İşletim Sistemi

**QuantOS**, kuantum mekaniği ve astrofiziğin kesişim noktasında araştırmalar yürüten **Quantro AR-GE** için tasarlanmış; **Windows 11 (24H2) masaüstü yeteneklerini**, **J.A.R.V.I.S. sesli yapay zekâ asistanını** ve **AArch64 Bare-Metal (UEFI / Limine) çekirdek mimarisini** tek çatı altında birleştiren hibrit bir işletim sistemidir.

[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-D1925C.svg)](./LICENSE)
[![Mimari: AArch64 + WebOS](https://img.shields.io/badge/Mimari-AArch64%20UEFI%20%2B%20Masa%C3%BCst%C3%BC%20DWM-1A1D23.svg)](./ARCHITECTURE.md)
[![Asistan: J.A.R.V.I.S. Sesli AI](https://img.shields.io/badge/Asistan-J.A.R.V.I.S.%20TR%2FEN%20Sesli-5F8A7A.svg)](./desktop/js/engines/jarvis-brain.js)
[![Bağımlılık: 0](https://img.shields.io/badge/Harici%20Ba%C4%9F%C4%B1ml%C4%B1l%C4%B1k-0-D1925C.svg)](./package.json)

---

## Öne Çıkan Yetenekler

### 1. Tam Windows 11 Masaüstü Deneyimi (DWM & Kabuk)
- **Önyükleme -> Kilit Ekranı -> Oturum Açma Akışı**: UEFI/Limine önyükleme ekranı, canlı astronomik/kuantum durum özetli Windows 11 Kilit Ekranı ve araştırmacı giriş ekranı.
- **Gelişmiş Pencere Yöneticisi (DWM)**: Sürükle-bırak, 8 yönlü yeniden boyutlandırma, küçültme/büyütme, Z-index odak yönetimi, ekran kenarına sürükleyerek kenetleme, **çift tıklama debounce koruması** (çift tıklamada tek pencere açılışı ve odağa alma) ve **6 düzenlik Windows 11 Snap Layouts** menüsü.
- **Sanal Masaüstleri & Görev Görünümü (Task View)**: Çoklu çalışma alanları (*Komuta*, *Kuantum AR-GE*, *Astrofizik Gözlemevi*) arasında anında geçiş.
- **Ortalanmış Görev Çubuğu & Başlat Menüsü**: Anlık küresel arama (`Ctrl+K`), sabitlenmiş uygulamalar, son AR-GE dosyaları, güç menüsü (Kilitle, Uyku, Yeniden Başlat, Kapat).
- **Hızlı Ayarlar, Bildirim Merkezi, Takvim, Widget'lar ve Pano Geçmişi**: Gerçek ekran parlaklığı/gece ışığı filtresi, ses kontrolü, J.A.R.V.I.S. sürekli dinleme modu, sağ tık bağlam menüsü ve `Ctrl+Shift+V` pano geçmişi.
- **4 Seçilebilir Kurumsal Tema**:
  1. **Quantro Grafit & Bakır** (`ink-copper` — varsayılan zamansız bilimsel estetik, IBM Plex tipografi)
  2. **J.A.R.V.I.S. Taktiksel HUD** (`jarvis-holo` — kehribar-altın ve soğuk plazma enstrüman katmanı)
  3. **Windows 11 Fluent Mica** (`win11-mica` — klasik modern Windows 11 görünümü)
  4. **Quantro Vellum Açık** (`vellum-light` — uzun form makale ve belge okuma/yazma yüzeyi)

### 2. J.A.R.V.I.S. Sesli Yapay Zekâ ve Sistem Komutanı
- **Çift Yönlü Türkçe ve İngilizce Ses Etkileşimi**: Tarayıcı Web Speech API (`SpeechRecognition` + `SpeechSynthesis`), Web Audio API gerçek zamanlı Arc-Reactor frekans görselleştiricisi, **mikrofon ara ses önbelleği** (konuşup durdurulduğunda hiçbir sözcüğü kaybetmeden anında işleme ve sesli yanıtlama) ve yerel işletim sistemi TTS köprüsü (`/api/tts` -> ElevenLabs API, `termux-tts-speak`, `espeak-ng`, QEMU seri hat `scripts/jarvis-voice-bridge.py`).
- **Gelişmiş Sohbet ve Asistan Zekâsı**: Hem bilimsel hem gündelik konularda zengin Türkçe sohbet, espri, hava/saat bilgisi, genel kültür ve sistem tanılama.
- **Doğrudan İşletim Sistemi ve Laboratuvar Kontrolü**:
  - *"Jarvis kuantum laboratuvarını aç"* / *"Jarvis pencereleri yan yana diz"* / *"Jarvis tüm pencereleri küçült"*
  - *"Jarvis Bell durumu oluştur"* -> 2 kübitlik $|\Phi^+\rangle = \frac{|00\rangle + |11\rangle}{\sqrt{2}}$ dolanıklık devresini kurar, 1024 ölçüm alır ve sonucu sesli raporlar.
  - *"Jarvis dinleyicili BB84 protokolünü çalıştır"* -> Eve müdahalesiyle kuantum anahtar dağıtımını simüle eder ve QBER hata oranını analiz eder.
  - *"Jarvis 10 güneş kütleli kara delik hesapla"* -> Schwarzschild yarıçapı ($R_s$), foton küresi, ISCO ve Hawking sıcaklığını gerçek CODATA 2022 sabitleriyle hesaplayıp seslendirir.
  - *"Jarvis z=2 için kozmoloji hesapla"* / *"Jarvis sistem durumunu raporla"* / *"Jarvis bakır temaya geç"*
- **Opsiyonel Harici LLM Bağlantısı**: Yerleşik deterministik bilimsel NLU motoruna ek olarak Ayarlar üzerinden herhangi bir OpenAI-uyumlu uç nokta bağlanabilir.

### 3. Quantro AR-GE Bilimsel Uygulama Paketi (14 Yerleşik Uygulama)
| Uygulama | Kimlik | Açıklama |
|---|---|---|
| **J.A.R.V.I.S. Komuta Merkezi** | `jarvis` | Arc-Reactor ses çekirdeği, canlı transkript, sesli/yazılı komutlar, makrolar ve tanılama |
| **Quantro Q-Lab** | `qlab` | 1–6 kübit karmaşık durum vektörü simülatörü (`H, X, Y, Z, S, T, RX, RY, RZ, CX, CZ, SWAP`), kısmi iz Bloch küresi, 1024-shot histogram, OpenQASM 2.0 |
| **Quantro AstroLab** | `astrolab` | Kerr/Schwarzschild kara delik mercekleme, Velocity-Verlet N-cisim yörünge mekaniği, Simpson integralli $\Lambda$CDM kozmoloji, sesli LIGO kütleçekim dalgası (chirp) |
| **Q-Vault (BB84 & QRNG)** | `qvault` | BB84 kuantum kriptografi (QBER analizi), canlı ANU kuantum vakum rastgelelik motoru ve WebCrypto AES-256-GCM dosya şifreleme |
| **Dosya Gezgini** | `explorer` | Kalıcı sanal dosya sistemi (`C:\QuantOS`, `C:\Users\Quantro\...`), sekme/klasör/arama/kopyala/taşı |
| **QuantShell Terminal** | `terminal` | Çok sekmeli gerçek Linux Bash kabuğu (140+ Bash/Linux komutu, canlı `cd` dizin takibi, sunucu uç noktası `/api/terminal/exec`) + dahili `qsim`, `bb84`, `qrng`, `blackhole`, `cosmo`, `jarvis` bilimsel motorları |
| **QuantCode Studio** | `code` | VFS entegreli çok sekmeli kod düzenleyici, JS çalıştırıcı, QASM aktarıcı ve Markdown önizleme |
| **Görev Yöneticisi** | `taskmgr` | Canlı süreç yönetimi + gerçek zamanlı FPS, Bellek, Host Linux Çekirdek Yükü ve QPU durum vektörü grafikleri |
| **Ayarlar** | `settings` | Sistem, Kişiselleştirme (4 tema + duvar kağıtları), Ses/TTS (ElevenLabs/OS), Ağ/QRNG, Güvenlik, J.A.R.V.I.S. AI ve Hakkında |
| **Quantro Edge Tarayıcı** | `browser` | Gerçek web tarayıcısı: Google Custom Search API, Serper API ve DuckDuckGo motorlu gerçek web araması, SSRF korumalı canlı web proxy'si, Omnibox, Google ana sayfası ve `⚙️ API` ayarları |
| **Bilimsel Hesap Makinesi** | `calculator` | Standart/Bilimsel mod, CODATA 2022 fizik sabitleri ($c, h, \hbar, G, k_B, M_\odot$) ve birim dönüştürücü |
| **Not Defteri & AR-GE Günlüğü** | `notepad` | Çok sekmeli Markdown/metin editörü, Vellum okuma yüzeyi ve VFS kaydı |
| **Spektrum & Çizim Stüdyosu** | `spectrum` | Elementel astronomik tayf çizgileri (`H, He, Na, Ca II, Fe, O III`) + Doppler kırmızıya kayma ($z$) analizörü ve çizim tuvali |
| **Quantro Mağaza** | `store` | Sistem ve AR-GE uygulama kataloğu, Başlat/Görev Çubuğu sabitleme yönetimi |

### 4. Bare-Metal AArch64 Çekirdeği (UEFI + Limine)
`kernel/` dizini altında gerçek donanım ve `qemu-system-aarch64` üzerinde önyüklenen, C17 ve AArch64 Assembly ile yazılmış bağımsız çekirdek yer alır:
- **Bellek ve Süreç**: 4 KB Fiziksel Sayfa Ayırıcı (`pmm.c`), 4-Seviyeli AArch64 Sanal Bellek (`vmm.c`), Coalescing Kernel Heap (`heap.c`), Donanımsal Preemptive Context Switch ve `VBAR_EL1` Exception Vektörleri (`vectors.S`, `context.S`).
- **Depolama, Ağ ve İkili Yükleme**: Sanal Dosya Sistemi (`vfs.c`), On-Disk FAT32 BPB ayrıştırıcısı (`fat.c`), 64-bit ELF yükleyici (`elfloader.c`), Ethernet/ARP/IPv4/ICMP/UDP/TCP yığını (`net/`).
- **Çekirdek İçi QPU, Astro ve J.A.R.V.I.S.**: Q16.16 sabit noktalı 4-kübit durum vektörü yardımcı işlemcisi (`kernel/quantum/qpu.c`), astrofizik motoru (`kernel/astro/astro.c`), çekirdek içi J.A.R.V.I.S. komut yorumlayıcısı (`kernel/jarvis/jarvis.c`) ve Framebuffer masaüstü arayüzü (`kernel/gfx/gui.c`).

---

## Hızlı Başlangıç

### Seçenek A — Tam Etkileşimli Masaüstü ve Sesli J.A.R.V.I.S. (Node.js ≥ 18)
Harici hiçbir paket kurulumuna (`npm install`) gerek yoktur; sıfır bağımlılıkla doğrudan çalışır:

```bash
git clone https://github.com/Lennebraha38/QuantOS.git
cd QuantOS
npm start
# Tarayıcıda açın: http://localhost:3800
```

Veya birleşik başlatıcı ile:
```bash
./start-quantos.sh web
```

### Seçenek B — Bare-Metal AArch64 Çekirdeğini Derleme ve QEMU / Termux:X11'de Çalıştırma
```bash
# Çekirdeği ve UEFI ESP imajını derle
make clean && make && make esp

# QEMU + Host J.A.R.V.I.S. Ses Köprüsü ile çalıştır
make run-jarvis

# Termux:X11 grafik ekranında tam ekran başlat
make run-x11

# VNC sunucusu (localhost:5900) üzerinden başlat
make run-vnc
```

---

## Test ve Doğrulama

```bash
# Tüm JS/MJS sözdizimi, gizli anahtar taraması, HTML referansları ve birim testleri
npm run check

# Yalnızca birim testleri (Kuantum durum vektörü, kısmi iz Bloch küresi, BB84 QBER, Astrofizik ΛCDM/Kerr, VFS, J.A.R.V.I.S. NLU, API)
npm test
```

---

## Bilimsel Dürüstlük İlkesi (Quantro Tasarım Anayasası)
QuantOS içerisinde **sahte telemetri (`Math.sin` ile uydurulan sözde fizik verileri) kesinlikle yer almaz**:
- Kuantum olasılıkları ve Bloch vektörleri tam karmaşık durum vektörü $|\psi\rangle \in \mathbb{C}^{2^n}$ ve indirgenmiş yoğunluk matrisi $\rho_q = \mathrm{Tr}_{\neq q}(|\psi\rangle\langle\psi|)$ üzerinden hesaplanır.
- Astrofizik hesaplamaları **CODATA 2022** ve **IAU / Planck 2018** sabitlerine dayanır.
- Masaüstü astronomi saati gerçek Jülyen Günü (JD), Greenwich/Yerel Yıldız Zamanı (GMST/LMST) ve vis-viva denklemiyle Dünya'nın anlık eliptik yörünge hızını gösterir.
- Kuantum rastgelelik modülü canlı ANU kuantum vakum kaynağını dener; çevrimdışı durumda kriptografik CSPRNG kaynağını açık kaynak etiketiyle (`provenance`) bildirir.

---

## Lisans
MIT © 2026 **Quantro AR-GE** & **Lennebraha38**
