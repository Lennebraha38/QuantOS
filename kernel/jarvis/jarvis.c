/*
 * QuantOS — Cekirdek Ici J.A.R.V.I.S. Yapay Zeka Komuta ve Ses Motoru
 * Quantro AR-GE | Turkce + Ingilizce Niyet Ayristirma, QPU/Astrolab Denetimi ve UART TTS
 */
#include "jarvis.h"
#include "qpu.h"
#include "astro.h"
#include "gui.h"
#include "pmm.h"
#include "heap.h"
#include "proc.h"
#include "kernel.h"
#include "uart.h"

static char     s_last_cmd[128]   = "sistem baslatildi";
static char     s_last_reply[256] = "QuantOS cekirdegi cevrime alindi efendim. QPU, AstroLab ve Windows 11 masaustu emrinizde.";
static uint32_t s_queries         = 0;

static char ascii_lower(char c)
{
    if (c >= 'A' && c <= 'Z') return (char)(c + ('a' - 'A'));
    return c;
}

static int str_contains_ci(const char *haystack, const char *needle)
{
    if (!haystack || !needle || !*needle) return 0;
    for (size_t i = 0; haystack[i]; i++) {
        size_t j = 0;
        while (needle[j] && haystack[i + j] &&
               ascii_lower(haystack[i + j]) == ascii_lower(needle[j])) {
            j++;
        }
        if (needle[j] == '\0')
            return 1;
    }
    return 0;
}

static uint64_t extract_first_u64(const char *s, uint64_t fallback)
{
    if (!s) return fallback;
    while (*s) {
        if (*s >= '0' && *s <= '9') {
            uint64_t val = 0;
            while (*s >= '0' && *s <= '9') {
                val = val * 10ULL + (uint64_t)(*s - '0');
                s++;
            }
            return val > 0 ? val : fallback;
        }
        s++;
    }
    return fallback;
}

void jarvis_speak(const char *text)
{
    if (!text || !*text) return;
    /* Host scripts/jarvis-voice-bridge.py tarafindan yakalanip seslendirilen protokol satiri */
    uart_puts("[JARVIS_SPEAK]: ");
    uart_puts(text);
    uart_puts("\r\n");
}

void jarvis_init(void)
{
    s_queries = 0;
    uart_puts("[jarvis] J.A.R.V.I.S. Cekirdek Ses ve Komuta Koprusu hazir ([JARVIS_SPEAK] aktif)\r\n");
    jarvis_speak(s_last_reply);
}

void jarvis_execute(const char *cmd, char *reply, size_t max_len)
{
    char local_buf[256];
    if (!cmd || !*cmd) cmd = "durum";

    strncpy(s_last_cmd, cmd, sizeof(s_last_cmd) - 1);
    s_last_cmd[sizeof(s_last_cmd) - 1] = '\0';
    s_queries++;

    if (str_contains_ci(cmd, "bell") || str_contains_ci(cmd, "dolanik") || str_contains_ci(cmd, "entangle")) {
        qpu_bell_pair();
        uint32_t p00 = qpu_prob_pct(0);
        uint32_t p11 = qpu_prob_pct(3);
        gui_open_app(APP_QLAB);
        ksnprintf(local_buf, sizeof(local_buf),
                  "Bell Phi-arti dolanik durumu hazirlandi efendim. |0000> olasiligi yuzde %u, |0011> olasiligi yuzde %u.",
                  p00, p11);
    } else if (str_contains_ci(cmd, "ghz")) {
        qpu_ghz3();
        gui_open_app(APP_QLAB);
        ksnprintf(local_buf, sizeof(local_buf),
                  "Uc kubitlik GHZ superpozisyonu olusturuldu. |0000> yuzde %u ve |0111> yuzde %u olasilikla hazir.",
                  qpu_prob_pct(0), qpu_prob_pct(7));
    } else if (str_contains_ci(cmd, "olc") || str_contains_ci(cmd, "measure") || str_contains_ci(cmd, "collapse")) {
        int m = qpu_measure_all();
        gui_open_app(APP_QLAB);
        ksnprintf(local_buf, sizeof(local_buf),
                  "Kuantum dalga fonksiyonu donanim zamanlayici entropisiyle olculdu. Coken baz durum: %d.",
                  m);
    } else if (str_contains_ci(cmd, "bb84") || str_contains_ci(cmd, "qkd") || str_contains_ci(cmd, "kripto")) {
        int eve = str_contains_ci(cmd, "eve") || str_contains_ci(cmd, "dinle") || str_contains_ci(cmd, "saldiri");
        int sifted = 0, qber = 0;
        int ok = qpu_bb84_selftest(64, eve, &sifted, &qber);
        ksnprintf(local_buf, sizeof(local_buf),
                  "BB84 kuantum anahtar testi tamamlandi. Elenen anahtar %d bit, QBER hata orani yuzde %d. Kanal %s.",
                  sifted, qber, (ok == 0) ? "guvenli" : "dinleniyor, anahtar iptal edildi");
    } else if (str_contains_ci(cmd, "sgr") || str_contains_ci(cmd, "sagittarius")) {
        uint64_t rs = astro_schwarzschild_km_x100(4154000ULL);
        gui_open_app(APP_ASTRO);
        ksnprintf(local_buf, sizeof(local_buf),
                  "Samanyolu merkezindeki Sagittarius A* kara deligi icin Schwarzschild yaricapi %llu milyon %llu bin kilometre olarak hesaplandi.",
                  (unsigned long long)((rs / 100ULL) / 1000000ULL),
                  (unsigned long long)(((rs / 100ULL) / 1000ULL) % 1000ULL));
    } else if (str_contains_ci(cmd, "kara delik") || str_contains_ci(cmd, "black hole") ||
               str_contains_ci(cmd, "schwarzschild") || str_contains_ci(cmd, "astro")) {
        uint64_t mass = extract_first_u64(cmd, 10ULL);
        uint64_t rs = astro_schwarzschild_km_x100(mass);
        uint64_t isco = astro_isco_km_x100(mass);
        gui_open_app(APP_ASTRO);
        ksnprintf(local_buf, sizeof(local_buf),
                  "%llu Gunes kutleli kara deligin olay ufku %llu.%02llu km, kararli son yorungesi ISCO %llu.%02llu km.",
                  (unsigned long long)mass,
                  (unsigned long long)(rs / 100ULL), (unsigned long long)(rs % 100ULL),
                  (unsigned long long)(isco / 100ULL), (unsigned long long)(isco % 100ULL));
    } else if (str_contains_ci(cmd, "tema") || str_contains_ci(cmd, "theme")) {
        if (str_contains_ci(cmd, "jarvis") || str_contains_ci(cmd, "holo")) {
            gui_set_theme(THEME_JARVIS_HOLO);
            ksnprintf(local_buf, sizeof(local_buf), "Masaustu temasi J.A.R.V.I.S. Holografik Mavi olarak guncellendi efendim.");
        } else if (str_contains_ci(cmd, "win") || str_contains_ci(cmd, "mica")) {
            gui_set_theme(THEME_WIN11_MICA);
            ksnprintf(local_buf, sizeof(local_buf), "Masaustu temasi Windows 11 Koyu Mica olarak guncellendi.");
        } else {
            gui_set_theme(THEME_INK_COPPER);
            ksnprintf(local_buf, sizeof(local_buf), "Quantro AR-GE kurumsal Grafit ve Bakir temasi etkinlestirildi.");
        }
    } else if (str_contains_ci(cmd, "qlab") || str_contains_ci(cmd, "kuantum")) {
        gui_open_app(APP_QLAB);
        ksnprintf(local_buf, sizeof(local_buf), "Quantro Q-Lab 4-kubit simulasyon penceresi acildi efendim.");
    } else if (str_contains_ci(cmd, "ayar") || str_contains_ci(cmd, "setting")) {
        gui_open_app(APP_SETTINGS);
        ksnprintf(local_buf, sizeof(local_buf), "Windows 11 ve QuantOS sistem ayarlari acildi.");
    } else if (str_contains_ci(cmd, "dosya") || str_contains_ci(cmd, "explorer")) {
        gui_open_app(APP_EXPLORER);
        ksnprintf(local_buf, sizeof(local_buf), "Dosya Gezgini penceresi ekrana getirildi.");
    } else if (str_contains_ci(cmd, "terminal") || str_contains_ci(cmd, "powershell")) {
        gui_open_app(APP_TERMINAL);
        ksnprintf(local_buf, sizeof(local_buf), "QuantOS cekirdek terminali hazir.");
    } else if (str_contains_ci(cmd, "hesap") || str_contains_ci(cmd, "calc")) {
        gui_open_app(APP_CALC);
        ksnprintf(local_buf, sizeof(local_buf), "Hesap makinesi acildi efendim.");
    } else if (str_contains_ci(cmd, "durum") || str_contains_ci(cmd, "status") || str_contains_ci(cmd, "rapor")) {
        uint64_t used_mb = pmm_get_used_memory() / (1024ULL * 1024ULL);
        uint64_t tot_mb  = pmm_get_total_memory() / (1024ULL * 1024ULL);
        ksnprintf(local_buf, sizeof(local_buf),
                  "QuantOS AArch64 cekirdegi nominal calisiyor. Fiziksel RAM %llu / %llu MB kullanimda, %d gorev ve QPU hazir.",
                  (unsigned long long)used_mb, (unsigned long long)tot_mb, proc_count());
    } else if (str_contains_ci(cmd, "merhaba") || str_contains_ci(cmd, "selam") ||
               str_contains_ci(cmd, "kimsin") || str_contains_ci(cmd, "hello")) {
        ksnprintf(local_buf, sizeof(local_buf),
                  "Merhaba efendim. Ben J.A.R.V.I.S., Quantro AR-GE Kuantum ve Astrofizik Isletim Sisteminin sesli yapay zeka asistaniyim.");
    } else {
        ksnprintf(local_buf, sizeof(local_buf),
                  "Komut alindi: '%s'. Kuantum devreleri icin 'bell', kriptografi icin 'bb84', astrofizik icin 'kara delik 25' veya 'durum' diyebilirsiniz.",
                  cmd);
    }

    strncpy(s_last_reply, local_buf, sizeof(s_last_reply) - 1);
    s_last_reply[sizeof(s_last_reply) - 1] = '\0';

    if (reply && max_len > 0) {
        strncpy(reply, s_last_reply, max_len - 1);
        reply[max_len - 1] = '\0';
    }

    jarvis_speak(s_last_reply);
    gui_redraw_all();
}

const char *jarvis_last_cmd(void)
{
    return s_last_cmd;
}

const char *jarvis_last_reply(void)
{
    return s_last_reply;
}

uint32_t jarvis_query_count(void)
{
    return s_queries;
}
