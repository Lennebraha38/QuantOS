/*
 * QuantOS — Bare-Metal Windows 11 DWM + Quantro AR-GE + J.A.R.V.I.S. GUI Motoru
 * 32-bpp Framebuffer | Grafit & Bakir, J.A.R.V.I.S. Holo ve Windows 11 Mica Temalari
 * Gercek Zamanli QPU Durum Vektoru, Astrofizik Metrikleri ve PMM/Heap Telemetrisi
 */
#include "gui.h"
#include "fb.h"
#include "qpu.h"
#include "astro.h"
#include "jarvis.h"
#include "pmm.h"
#include "heap.h"
#include "proc.h"
#include "vfs.h"
#include "sound.h"
#include "notify.h"
#include "kernel.h"

typedef struct {
    const char *name;
    uint32_t bg_top;
    uint32_t bg_bottom;
    uint32_t surface;
    uint32_t card;
    uint32_t border;
    uint32_t accent;
    uint32_t accent_alt;
    uint32_t text_main;
    uint32_t text_muted;
} gui_palette_t;

static const gui_palette_t s_palettes[3] = {
    /* 0: Quantro AR-GE Kurumsal Grafit & Bakir */
    {
        "Quantro Grafit & Bakir",
        0x0E0F12, 0x151820, 0x1A1D23, 0x22262E, 0x333946,
        0xD1925C, 0x5F8A7A, 0xF4F2EE, 0x9CA3AF
    },
    /* 1: J.A.R.V.I.S. Holografik Mavi */
    {
        "J.A.R.V.I.S. HoloHUD",
        0x050C14, 0x0A1929, 0x0D2136, 0x132F4C, 0x1E4976,
        0x38BDF8, 0x22D3EE, 0xF0F9FF, 0x7DD3FC
    },
    /* 2: Windows 11 Koyu Mica */
    {
        "Windows 11 Koyu Mica",
        0x14171F, 0x1F2430, 0x20232A, 0x2B2F3A, 0x3D4352,
        0x60CDFF, 0x0078D4, 0xFFFFFF, 0xA1A8B8
    }
};

typedef struct {
    int open;
    int minimized;
    int maximized;
    int x, y, w, h;
    const char *title;
} app_win_t;

static uint32_t s_w = 1280;
static uint32_t s_h = 800;
static int      s_theme = THEME_INK_COPPER;
static int64_t  s_boot_time = 0;
static uint64_t s_uptime = 0;

static int s_cursor_x = 640;
static int s_cursor_y = 400;
static int s_prev_btn = 0;

static int s_start_open = 0;
static int s_quick_open = 0;
static int s_notif_open = 0;
static int s_snap_open  = 0;
static int s_active_app = APP_JARVIS;

static uint64_t s_astro_mass = 10ULL; /* Varsayilan: 10 Gunes kutlesi */
static int      s_calc_val   = 42;
static int      s_calc_acc   = 0;
static char     s_calc_op    = 0;
static int      s_calc_fresh = 1;

static app_win_t s_wins[8];

/* Imlec arka plan onbellegi */
static uint32_t s_cursor_bg[18][18];
static int      s_saved_cx = -1;
static int      s_saved_cy = -1;
static int      s_has_bg   = 0;

static const uint8_t s_arrow_mask[16][12] = {
    {1,0,0,0,0,0,0,0,0,0,0,0},
    {1,1,0,0,0,0,0,0,0,0,0,0},
    {1,2,1,0,0,0,0,0,0,0,0,0},
    {1,2,2,1,0,0,0,0,0,0,0,0},
    {1,2,2,2,1,0,0,0,0,0,0,0},
    {1,2,2,2,2,1,0,0,0,0,0,0},
    {1,2,2,2,2,2,1,0,0,0,0,0},
    {1,2,2,2,2,2,2,1,0,0,0,0},
    {1,2,2,2,2,2,2,2,1,0,0,0},
    {1,2,2,2,2,2,2,2,2,1,0,0},
    {1,2,2,2,2,2,1,1,1,1,0,0},
    {1,2,2,1,2,2,1,0,0,0,0,0},
    {1,2,1,0,1,2,2,1,0,0,0,0},
    {1,1,0,0,1,2,2,1,0,0,0,0},
    {1,0,0,0,0,1,2,2,1,0,0,0},
    {0,0,0,0,0,1,1,1,0,0,0,0}
};

static void cursor_restore(void)
{
    if (!s_has_bg || !fb_ready()) return;
    for (int dy = 0; dy < 16; dy++) {
        for (int dx = 0; dx < 12; dx++) {
            int px = s_saved_cx + dx;
            int py = s_saved_cy + dy;
            if (px >= 0 && px < (int)s_w && py >= 0 && py < (int)s_h)
                fb_put_pixel(px, py, s_cursor_bg[dy][dx]);
        }
    }
    s_has_bg = 0;
}

static void cursor_draw(void)
{
    if (!fb_ready()) return;
    const gui_palette_t *p = &s_palettes[s_theme];
    s_saved_cx = s_cursor_x;
    s_saved_cy = s_cursor_y;
    for (int dy = 0; dy < 16; dy++) {
        for (int dx = 0; dx < 12; dx++) {
            int px = s_saved_cx + dx;
            int py = s_saved_cy + dy;
            if (px >= 0 && px < (int)s_w && py >= 0 && py < (int)s_h) {
                s_cursor_bg[dy][dx] = fb_get_pixel(px, py);
                uint8_t m = s_arrow_mask[dy][dx];
                if (m == 1)
                    fb_put_pixel(px, py, p->accent);
                else if (m == 2)
                    fb_put_pixel(px, py, 0xFFFFFF);
            }
        }
    }
    s_has_bg = 1;
}

static uint32_t lerp_rgb(uint32_t c1, uint32_t c2, int num, int den)
{
    if (den <= 0) return c1;
    int r1 = (c1 >> 16) & 0xFF, g1 = (c1 >> 8) & 0xFF, b1 = c1 & 0xFF;
    int r2 = (c2 >> 16) & 0xFF, g2 = (c2 >> 8) & 0xFF, b2 = c2 & 0xFF;
    int r = r1 + ((r2 - r1) * num) / den;
    int g = g1 + ((g2 - g1) * num) / den;
    int b = b1 + ((b2 - b1) * num) / den;
    return ((uint32_t)r << 16) | ((uint32_t)g << 8) | (uint32_t)b;
}

static void draw_quantro_mark(int cx, int cy, int r, uint32_t accent, uint32_t alt)
{
    fb_draw_round_border(cx - r, cy - r, r * 2, r * 2, r, 2, accent);
    int ir = (r * 6) / 10;
    fb_draw_round_border(cx - ir, cy - ir, ir * 2, ir * 2, ir, 2, alt);
    fb_fill_round_rect(cx - 4, cy - 4, 8, 8, 4, accent);
    /* Kuantum yorunge dugumu + Q kuyrugu */
    fb_fill_round_rect(cx + ir - 3, cy + ir - 3, 8, 8, 4, accent);
}

static void draw_win_quad(int cx, int cy, int sz, uint32_t c1, uint32_t c2)
{
    int h = sz / 2 - 1;
    fb_fill_round_rect(cx - sz / 2, cy - sz / 2, h, h, 2, c1);
    fb_fill_round_rect(cx + 1,      cy - sz / 2, h, h, 2, c2);
    fb_fill_round_rect(cx - sz / 2, cy + 1,      h, h, 2, c2);
    fb_fill_round_rect(cx + 1,      cy + 1,      h, h, 2, c1);
}

static void draw_wallpaper_and_hud(void)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    int bands = 40;
    int bh = (int)s_h / bands + 1;
    for (int i = 0; i < bands; i++) {
        uint32_t col = lerp_rgb(p->bg_top, p->bg_bottom, i, bands - 1);
        fb_fill_rect(0, i * bh, (int)s_w, bh + 1, col);
    }

    /* Ince muhendislik izgarasi */
    for (int x = 80; x < (int)s_w; x += 120)
        fb_blend_rect(x, 0, 1, (int)s_h - 52, p->accent, 14);
    for (int y = 80; y < (int)s_h - 52; y += 120)
        fb_blend_rect(0, y, (int)s_w, 1, p->accent, 14);

    /* Sag ust J.A.R.V.I.S. & Quantro Canli Telemetri HUD Karti (Gercek Cekirdek Verileri) */
    int hx = (int)s_w - 316;
    int hy = 18;
    fb_blend_round_rect(hx, hy, 298, 134, 10, p->surface, 215);
    fb_draw_round_border(hx, hy, 298, 134, 10, 1, p->border);
    draw_quantro_mark(hx + 24, hy + 26, 12, p->accent, p->accent_alt);
    fb_draw_text(hx + 44, hy + 14, "QUANTRO AR-GE | J.A.R.V.I.S.", p->accent, 1);
    fb_draw_text(hx + 44, hy + 31, p->name, p->text_muted, 1);

    char line[64];
    uint64_t used_mb = pmm_get_used_memory() / (1024ULL * 1024ULL);
    uint64_t tot_mb  = pmm_get_total_memory() / (1024ULL * 1024ULL);
    ksnprintf(line, sizeof(line), "PMM RAM : %llu / %llu MiB | Gorev: %d",
              (unsigned long long)used_mb, (unsigned long long)tot_mb, proc_count());
    fb_draw_text(hx + 16, hy + 56, line, p->text_main, 1);

    ksnprintf(line, sizeof(line), "QPU Durum: |0000>=%u%% |0011>=%u%% (%u op)",
              qpu_prob_pct(0), qpu_prob_pct(3), qpu_gate_ops());
    fb_draw_text(hx + 16, hy + 76, line, p->text_main, 1);

    uint64_t rs10 = astro_schwarzschild_km_x100(s_astro_mass);
    ksnprintf(line, sizeof(line), "Astro Rs : %llu.%02llu km (%llu M_gunes)",
              (unsigned long long)(rs10 / 100ULL), (unsigned long long)(rs10 % 100ULL),
              (unsigned long long)s_astro_mass);
    fb_draw_text(hx + 16, hy + 96, line, p->accent_alt, 1);

    ksnprintf(line, sizeof(line), "JARVIS   : %u komut islendi [AKTIF]", jarvis_query_count());
    fb_draw_text(hx + 16, hy + 114, line, p->text_muted, 1);

    /* Sol ust masaustu kisayollari */
    const char *desk_labels[4] = { "J.A.R.V.I.S.", "Quantro Q-Lab", "AstroLab", "Dosya Gezgini" };
    for (int i = 0; i < 4; i++) {
        int ix = 22;
        int iy = 22 + i * 78;
        fb_blend_round_rect(ix, iy, 118, 66, 8, p->surface, 150);
        fb_draw_round_border(ix, iy, 118, 66, 8, 1, p->border);
        fb_fill_round_rect(ix + 47, iy + 10, 24, 24, 6, (i == 0) ? p->accent : p->accent_alt);
        fb_draw_text_centered(ix + 59, iy + 42, desk_labels[i], p->text_main, 1);
    }
}

static void draw_button(int x, int y, int w, int h, const char *label, int primary)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    uint32_t bg = primary ? p->accent : p->card;
    uint32_t fg = primary ? 0x0E0F12  : p->text_main;
    fb_fill_round_rect(x, y, w, h, 6, bg);
    if (!primary)
        fb_draw_round_border(x, y, w, h, 6, 1, p->border);
    fb_draw_text_centered(x + w / 2, y + (h - 16) / 2, label, fg, 1);
}

static void draw_jarvis_content(int x, int y, int w, int h)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    (void)h;
    /* Ses Kuresi (Orb) + Baslik */
    draw_quantro_mark(x + 42, y + 38, 22, p->accent, p->accent_alt);
    fb_draw_text(x + 78, y + 18, "J.A.R.V.I.S. Sesli Isletim Sistemi Asistani", p->accent, 1);
    fb_draw_text(x + 78, y + 38, "UART [JARVIS_SPEAK] Ses Koprusu + Cekirdek Komuta Yonetici", p->text_muted, 1);

    /* Son komut ve yanit kutusu */
    fb_fill_round_rect(x + 18, y + 72, w - 36, 96, 8, p->card);
    fb_draw_round_border(x + 18, y + 72, w - 36, 96, 8, 1, p->border);

    char cmd_line[96];
    ksnprintf(cmd_line, sizeof(cmd_line), "Kullanici > %s", jarvis_last_cmd());
    fb_draw_text(x + 30, y + 84, cmd_line, p->accent_alt, 1);

    const char *rep = jarvis_last_reply();
    char r1[72], r2[72];
    size_t rlen = strlen(rep);
    size_t cut = rlen > 66 ? 66 : rlen;
    memcpy(r1, rep, cut);
    r1[cut] = '\0';
    r2[0] = '\0';
    if (rlen > 66) {
        size_t rem = rlen - 66;
        if (rem > 66) rem = 66;
        memcpy(r2, rep + 66, rem);
        r2[rem] = '\0';
    }
    fb_draw_text(x + 30, y + 110, r1, p->text_main, 1);
    if (r2[0])
        fb_draw_text(x + 30, y + 130, r2, p->text_main, 1);

    fb_draw_text(x + 18, y + 182, "Hizli Sesli / Cekirdek Komutlari (Tiklayin):", p->text_muted, 1);
    draw_button(x + 18,  y + 206, 132, 32, "Sistem Raporu", 1);
    draw_button(x + 158, y + 206, 132, 32, "Bell Dolanik", 0);
    draw_button(x + 298, y + 206, 132, 32, "BB84 QKD Test", 0);
    draw_button(x + 438, y + 206, 132, 32, "Sgr A* Analiz", 0);

    draw_button(x + 18,  y + 248, 178, 32, "Tema: Grafit & Bakir", s_theme == THEME_INK_COPPER);
    draw_button(x + 204, y + 248, 178, 32, "Tema: JARVIS Holo",    s_theme == THEME_JARVIS_HOLO);
    draw_button(x + 390, y + 248, 180, 32, "Tema: Win11 Mica",     s_theme == THEME_WIN11_MICA);
}

static void draw_qlab_content(int x, int y, int w, int h)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    (void)h;
    fb_draw_text(x + 18, y + 14, "Quantro Q-Lab — 4-Kubit Q16.16 Durum Vektoru Simulatoru", p->accent, 1);

    char stat[80];
    ksnprintf(stat, sizeof(stat), "Uniter Kapi Sayaci: %u | Son Olcum Cokusu: |%d>",
              qpu_gate_ops(), qpu_last_measurement());
    fb_draw_text(x + 18, y + 34, stat, p->text_muted, 1);

    /* Ilk 8 baz durum olasilik grafigi |0000> .. |0111> */
    fb_fill_round_rect(x + 18, y + 58, w - 36, 168, 8, p->card);
    fb_draw_round_border(x + 18, y + 58, w - 36, 168, 8, 1, p->border);

    for (int i = 0; i < 8; i++) {
        uint32_t pct = qpu_prob_pct(i);
        int bx = x + 34 + i * 66;
        int max_bh = 104;
        int bh = (int)((pct * (uint32_t)max_bh) / 100U);
        fb_fill_round_rect(bx, y + 78 + (max_bh - bh), 42, bh > 2 ? bh : 2, 4,
                           pct > 0 ? p->accent : p->border);

        char lbl[8], plbl[8];
        lbl[0] = (i & 4) ? '1' : '0';
        lbl[1] = (i & 2) ? '1' : '0';
        lbl[2] = (i & 1) ? '1' : '0';
        lbl[3] = '\0';
        ksnprintf(plbl, sizeof(plbl), "%u%%", pct);
        fb_draw_text_centered(bx + 21, y + 62, plbl, p->text_main, 1);
        fb_draw_text_centered(bx + 21, y + 190, lbl, p->text_muted, 1);
    }

    draw_button(x + 18,  y + 240, 74,  32, "H(q0)", 0);
    draw_button(x + 98,  y + 240, 74,  32, "X(q0)", 0);
    draw_button(x + 178, y + 240, 88,  32, "CNOT 0>1", 0);
    draw_button(x + 272, y + 240, 96,  32, "Bell |Phi+>", 1);
    draw_button(x + 374, y + 240, 76,  32, "GHZ-3", 0);
    draw_button(x + 456, y + 240, 64,  32, "Olc", 1);
    draw_button(x + 526, y + 240, 62,  32, "Sifir", 0);
}

static void draw_astro_content(int x, int y, int w, int h)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    (void)h;
    fb_draw_text(x + 18, y + 14, "Quantro AstroLab — Genel Gorelilik & Kara Delik Metrikleri", p->accent, 1);
    fb_draw_text(x + 18, y + 34, "CODATA 2022 Sabitleri (G, c, M_gunes) — Saf 64-bit Kesin Hesap", p->text_muted, 1);

    uint64_t rs   = astro_schwarzschild_km_x100(s_astro_mass);
    uint64_t rph  = astro_photon_sphere_km_x100(s_astro_mass);
    uint64_t isco = astro_isco_km_x100(s_astro_mass);
    uint64_t rk   = (isco / 100ULL) > 0 ? (isco / 100ULL) : 1ULL;
    uint64_t vel  = astro_orbital_vel_kms(s_astro_mass, rk);

    fb_fill_round_rect(x + 18, y + 60, w - 36, 156, 8, p->card);
    fb_draw_round_border(x + 18, y + 60, w - 36, 156, 8, 1, p->border);

    /* Sol gorsel olay ufku halkalari */
    int ocx = x + 100, ocy = y + 138;
    fb_draw_round_border(ocx - 54, ocy - 54, 108, 108, 54, 1, p->accent_alt);
    fb_draw_round_border(ocx - 36, ocy - 36, 72, 72, 36, 2, p->accent);
    fb_fill_round_rect(ocx - 20, ocy - 20, 40, 40, 20, 0x050507);

    char b[80];
    ksnprintf(b, sizeof(b), "Secili Kutle       : %llu Gunes Kutlesi", (unsigned long long)s_astro_mass);
    fb_draw_text(x + 184, y + 76, b, p->text_main, 1);
    ksnprintf(b, sizeof(b), "Olay Ufku (Rs)     : %llu.%02llu km", (unsigned long long)(rs / 100ULL), (unsigned long long)(rs % 100ULL));
    fb_draw_text(x + 184, y + 102, b, p->accent, 1);
    ksnprintf(b, sizeof(b), "Foton Kuresi 1.5Rs : %llu.%02llu km", (unsigned long long)(rph / 100ULL), (unsigned long long)(rph % 100ULL));
    fb_draw_text(x + 184, y + 128, b, p->text_main, 1);
    ksnprintf(b, sizeof(b), "ISCO (3.0 Rs)      : %llu.%02llu km", (unsigned long long)(isco / 100ULL), (unsigned long long)(isco % 100ULL));
    fb_draw_text(x + 184, y + 154, b, p->accent_alt, 1);
    ksnprintf(b, sizeof(b), "ISCO Yorunge Hizi  : ~%llu km/s", (unsigned long long)vel);
    fb_draw_text(x + 184, y + 180, b, p->text_muted, 1);

    draw_button(x + 18,  y + 236, 130, 32, "10 M_gunes",      s_astro_mass == 10ULL);
    draw_button(x + 158, y + 236, 140, 32, "GW150914 (65M)",  s_astro_mass == 65ULL);
    draw_button(x + 308, y + 236, 130, 32, "Cygnus X-1 (21M)",s_astro_mass == 21ULL);
    draw_button(x + 448, y + 236, 140, 32, "Sgr A* (4.15M)",  s_astro_mass == 4154000ULL);
}

static void draw_explorer_content(int x, int y, int w, int h)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    (void)h;
    fb_fill_round_rect(x + 18, y + 14, w - 36, 28, 6, p->card);
    fb_draw_text(x + 28, y + 20, "Konum: C:\\QuantOS\\Arastirma\\   (NTFS/VFS + FAT32 ESP)", p->text_main, 1);

    const char *items[6] = {
        "[KLASOR] C:\\Windows\\System32",
        "[KLASOR] C:\\Users\\Quantro\\Belgeler",
        "[QASM]   bell_entanglement_4q.qasm",
        "[VERI]   sgr_a_star_relativity.csv",
        "[GUVEN]  bb84_qvault_keystore.qenc",
        "[SISTEM] BOOTAA64.EFI (Limine UEFI)"
    };
    for (int i = 0; i < 6; i++) {
        int ry = y + 54 + i * 36;
        fb_fill_round_rect(x + 18, ry, w - 36, 30, 6, (i % 2 == 0) ? p->card : p->surface);
        fb_draw_round_border(x + 18, ry, w - 36, 30, 6, 1, p->border);
        fb_draw_text(x + 30, ry + 7, items[i], (i >= 2 && i <= 4) ? p->accent : p->text_main, 1);
    }
}

static void draw_terminal_content(int x, int y, int w, int h)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    fb_fill_round_rect(x + 14, y + 12, w - 28, h - 26, 8, 0x0A0B0E);
    fb_draw_round_border(x + 14, y + 12, w - 28, h - 26, 8, 1, p->border);

    fb_draw_text(x + 26, y + 24, "QuantOS PowerShell 7.5 [AArch64 EL1 Bare-Metal Cekirdek]", p->accent, 1);
    fb_draw_text(x + 26, y + 46, "PS C:\\QuantOS> jarvis bell", p->text_main, 1);

    char qline[80];
    ksnprintf(qline, sizeof(qline), "[JARVIS]: %s", jarvis_last_reply());
    qline[68] = '\0';
    fb_draw_text(x + 26, y + 68, qline, p->accent_alt, 1);

    fb_draw_text(x + 26, y + 96, "PS C:\\QuantOS> qpu", p->text_main, 1);
    ksnprintf(qline, sizeof(qline), "|0000> = %u%%, |0011> = %u%%, Toplam Kapi = %u",
              qpu_prob_pct(0), qpu_prob_pct(3), qpu_gate_ops());
    fb_draw_text(x + 26, y + 118, qline, p->text_muted, 1);

    fb_draw_text(x + 26, y + 148, "UART seri konsoldan canli komut gonderebilirsiniz:", p->text_muted, 1);
    fb_draw_text(x + 26, y + 170, "  jarvis <istek> | qpu bell | bb84 | astro 65 | sysinfo", p->accent, 1);
    fb_draw_text(x + 26, y + 202, "PS C:\\QuantOS> _", p->text_main, 1);
}

static void draw_settings_content(int x, int y, int w, int h)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    (void)h;
    fb_draw_text(x + 18, y + 14, "Windows 11 & QuantOS Sistem Ayarlari", p->accent, 1);

    fb_fill_round_rect(x + 18, y + 42, w - 36, 128, 8, p->card);
    fb_draw_round_border(x + 18, y + 42, w - 36, 128, 8, 1, p->border);

    char line[80];
    ksnprintf(line, sizeof(line), "Cekirdek Surumu : %s v%s (%s UEFI Limine)",
              KERNEL_NAME, KERNEL_VERSION, KERNEL_ARCH);
    fb_draw_text(x + 30, y + 56, line, p->text_main, 1);

    ksnprintf(line, sizeof(line), "Fiziksel Bellek : %llu MiB Kullanilan / %llu MiB Toplam (4KB PMM)",
              (unsigned long long)(pmm_get_used_memory() / (1024ULL * 1024ULL)),
              (unsigned long long)(pmm_get_total_memory() / (1024ULL * 1024ULL)));
    fb_draw_text(x + 30, y + 80, line, p->text_main, 1);

    ksnprintf(line, sizeof(line), "Cekirdek Heap   : %u KB / %u KB | Guvenlik: TPM 2.0 + VBS Aktif",
              (unsigned)(heap_get_used() / 1024U), (unsigned)(heap_get_total() / 1024U));
    fb_draw_text(x + 30, y + 104, line, p->accent_alt, 1);

    ksnprintf(line, sizeof(line), "Calisma Suresi  : %llu sn | Ses Seviyesi: %%%d",
              (unsigned long long)s_uptime, sound_get_volume());
    fb_draw_text(x + 30, y + 128, line, p->text_muted, 1);

    fb_draw_text(x + 18, y + 188, "Kisisellestirme — Kurumsal Tema Secimi:", p->text_main, 1);
    draw_button(x + 18,  y + 216, 178, 36, "Grafit & Bakir", s_theme == THEME_INK_COPPER);
    draw_button(x + 204, y + 216, 178, 36, "JARVIS Holo",    s_theme == THEME_JARVIS_HOLO);
    draw_button(x + 390, y + 216, 180, 36, "Windows 11 Mica",s_theme == THEME_WIN11_MICA);
}

static void draw_calc_content(int x, int y, int w, int h)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    (void)h;
    fb_fill_round_rect(x + 18, y + 16, w - 36, 48, 8, p->card);
    fb_draw_round_border(x + 18, y + 16, w - 36, 48, 8, 1, p->border);

    char num[32];
    ksnprintf(num, sizeof(num), "%d", s_calc_val);
    fb_draw_text(x + 32, y + 32, num, p->accent, 1);

    const char *btns[4][4] = {
        {"7", "8", "9", "/"},
        {"4", "5", "6", "*"},
        {"1", "2", "3", "-"},
        {"C", "0", "=", "+"}
    };
    int bw = (w - 60) / 4;
    for (int r = 0; r < 4; r++) {
        for (int c = 0; c < 4; c++) {
            draw_button(x + 18 + c * (bw + 8), y + 78 + r * 46, bw, 38,
                        btns[r][c], (c == 3 || (r == 3 && c == 2)));
        }
    }
}

static void draw_window(int app_id)
{
    app_win_t *win = &s_wins[app_id];
    if (!win->open || win->minimized) return;

    const gui_palette_t *p = &s_palettes[s_theme];
    int x = win->maximized ? 8 : win->x;
    int y = win->maximized ? 8 : win->y;
    int w = win->maximized ? ((int)s_w - 16) : win->w;
    int h = win->maximized ? ((int)s_h - 64) : win->h;

    /* Golge + Pencere Govdesi */
    fb_blend_round_rect(x + 6, y + 8, w, h, 10, 0x000000, 110);
    fb_blend_round_rect(x, y, w, h, 10, p->surface, 238);
    fb_draw_round_border(x, y, w, h, 10, 1,
                         (s_active_app == app_id) ? p->accent : p->border);

    /* Baslik Cubugu (Windows 11 DWM + Snap Tetikleyici) */
    fb_fill_round_rect(x + 1, y + 1, w - 2, 36, 9, p->card);
    draw_quantro_mark(x + 20, y + 19, 8, p->accent, p->accent_alt);
    fb_draw_text(x + 36, y + 11, win->title, p->text_main, 1);

    /* Snap, Simge Durumu, Tam Ekran, Kapat dugmeleri */
    fb_fill_round_rect(x + w - 134, y + 7, 28, 22, 4, p->surface);
    fb_draw_text(x + w - 124, y + 10, "S", p->accent_alt, 1);

    fb_fill_round_rect(x + w - 100, y + 7, 28, 22, 4, p->surface);
    fb_draw_text(x + w - 90, y + 10, "_", p->text_main, 1);

    fb_fill_round_rect(x + w - 66, y + 7, 28, 22, 4, p->surface);
    fb_draw_text(x + w - 56, y + 10, "[]", p->text_main, 1);

    fb_fill_round_rect(x + w - 32, y + 7, 26, 22, 4, 0xB91C1C);
    fb_draw_text(x + w - 23, y + 10, "X", 0xFFFFFF, 1);

    int cy = y + 38;
    int ch = h - 38;
    switch (app_id) {
    case APP_JARVIS:   draw_jarvis_content(x, cy, w, ch);   break;
    case APP_QLAB:     draw_qlab_content(x, cy, w, ch);     break;
    case APP_ASTRO:    draw_astro_content(x, cy, w, ch);    break;
    case APP_EXPLORER: draw_explorer_content(x, cy, w, ch); break;
    case APP_TERMINAL: draw_terminal_content(x, cy, w, ch); break;
    case APP_SETTINGS: draw_settings_content(x, cy, w, ch); break;
    case APP_CALC:     draw_calc_content(x, cy, w, ch);     break;
    default: break;
    }

    /* Windows 11 Snap Layouts acilir kutusu */
    if (s_snap_open && s_active_app == app_id) {
        int sx = x + w - 210;
        int sy = y + 38;
        fb_blend_round_rect(sx, sy, 198, 66, 8, p->card, 245);
        fb_draw_round_border(sx, sy, 198, 66, 8, 1, p->accent);
        draw_button(sx + 8,   sy + 16, 56, 34, "Sol", 0);
        draw_button(sx + 70,  sy + 16, 56, 34, "Sag", 0);
        draw_button(sx + 132, sy + 16, 58, 34, "Tam", 1);
    }
}

static void draw_flyouts_and_taskbar(void)
{
    const gui_palette_t *p = &s_palettes[s_theme];
    int tb_y = (int)s_h - 48;

    /* Baslat Menusu (Ortalanmis Windows 11 Flyout) */
    if (s_start_open) {
        int mw = 520, mh = 380;
        int mx = ((int)s_w - mw) / 2;
        int my = tb_y - mh - 10;
        fb_blend_round_rect(mx, my, mw, mh, 12, p->surface, 242);
        fb_draw_round_border(mx, my, mw, mh, 12, 1, p->accent);
        fb_draw_text(mx + 24, my + 20, "QuantOS — Sabitlenen Arastirma & Sistem Uygulamalari", p->accent, 1);

        const char *names[7] = {
            "J.A.R.V.I.S.", "Q-Lab 4Q", "AstroLab",
            "Gezgin", "Terminal", "Ayarlar", "Hesapla"
        };
        for (int i = 0; i < 7; i++) {
            int col = i % 4;
            int row = i / 4;
            int bx = mx + 24 + col * 120;
            int by = my + 58 + row * 92;
            draw_button(bx, by, 108, 72, names[i], (i == 0));
        }

        fb_fill_round_rect(mx + 24, my + mh - 56, mw - 48, 38, 8, p->card);
        fb_draw_text(mx + 38, my + mh - 45, "Oturum: Quantro AR-GE Baskani  |  TPM 2.0 Guvenli", p->text_muted, 1);
    }

    /* Hizli Ayarlar (Quick Settings) */
    if (s_quick_open) {
        int qw = 300, qh = 210;
        int qx = (int)s_w - qw - 14;
        int qy = tb_y - qh - 10;
        fb_blend_round_rect(qx, qy, qw, qh, 12, p->surface, 242);
        fb_draw_round_border(qx, qy, qw, qh, 12, 1, p->border);
        fb_draw_text(qx + 18, qy + 16, "Hizli Ayarlar (Windows 11 + QPU)", p->accent, 1);
        draw_button(qx + 18,  qy + 46, 126, 36, "Ethernet Aktif", 1);
        draw_button(qx + 154, qy + 46, 128, 36, "JARVIS Ses",     1);
        draw_button(qx + 18,  qy + 92, 126, 36, "QPU Hazir",      1);
        draw_button(qx + 154, qy + 92, 128, 36, "Tema Degistir",  0);
        char sline[48];
        ksnprintf(sline, sizeof(sline), "Ses Seviyesi: %%%d  |  Ekran: Parlak", sound_get_volume());
        fb_draw_text(qx + 18, qy + 154, sline, p->text_muted, 1);
    }

    /* Bildirim Merkezi */
    if (s_notif_open) {
        int nw = 320, nh = 240;
        int nx = (int)s_w - nw - 14;
        int ny = tb_y - nh - 10;
        fb_blend_round_rect(nx, ny, nw, nh, 12, p->surface, 242);
        fb_draw_round_border(nx, ny, nw, nh, 12, 1, p->border);
        fb_draw_text(nx + 18, ny + 16, "Bildirim Merkezi & Takvim", p->accent, 1);
        fb_fill_round_rect(nx + 16, ny + 46, nw - 32, 68, 8, p->card);
        fb_draw_text(nx + 26, ny + 56, "[J.A.R.V.I.S.] Cekirdek ses koprusu hazir.", p->text_main, 1);
        fb_draw_text(nx + 26, ny + 78, "Bell |Phi+> oz-testi dogrulandi (%50/%50).", p->text_muted, 1);
        fb_fill_round_rect(nx + 16, ny + 126, nw - 32, 68, 8, p->card);
        fb_draw_text(nx + 26, ny + 136, "[TPM 2.0] PCR0-7 Olcumleri Dogrulandi.", p->accent_alt, 1);
        fb_draw_text(nx + 26, ny + 158, "Kayseri Quantro AR-GE Dugumu Cevrimici.", p->text_muted, 1);
    }

    /* Windows 11 Ortalanmis Gorev Cubugu (Taskbar) */
    fb_blend_rect(0, tb_y, (int)s_w, 48, p->surface, 236);
    fb_fill_rect(0, tb_y, (int)s_w, 1, p->border);

    /* Sol durum rozeti */
    fb_draw_text(16, tb_y + 16, "QUANTRO AR-GE", p->accent, 1);

    /* Ortalanmis 8 gorev dugmesi: Baslat + 7 uygulama */
    int count = 8;
    int slot_w = 56;
    int start_x = ((int)s_w - count * slot_w) / 2;
    const char *short_lbl[8] = { "Win", "AI", "QPU", "AST", "DIR", "PS>", "SET", "CLC" };

    for (int i = 0; i < count; i++) {
        int bx = start_x + i * slot_w + 4;
        int by = tb_y + 6;
        int is_active = (i == 0) ? s_start_open : (s_wins[i].open && s_active_app == i);
        fb_fill_round_rect(bx, by, 48, 36, 8, is_active ? p->card : p->surface);
        fb_draw_round_border(bx, by, 48, 36, 8, 1, is_active ? p->accent : p->border);
        if (i == 0) {
            draw_win_quad(bx + 24, by + 18, 16, p->accent, p->accent_alt);
        } else {
            fb_draw_text_centered(bx + 24, by + 10, short_lbl[i],
                                  (i == 1) ? p->accent : p->text_main, 1);
        }
        if (i > 0 && s_wins[i].open)
            fb_fill_round_rect(bx + 18, by + 32, 12, 3, 1, p->accent);
    }

    /* Sag Sistem Tepsisi (Hizli Ayarlar + Saat) */
    fb_fill_round_rect((int)s_w - 220, tb_y + 7, 96, 34, 6, p->card);
    fb_draw_text_centered((int)s_w - 172, tb_y + 16, "AG | SES", p->text_main, 1);

    uint64_t total_sec = (s_boot_time > 0 ? (uint64_t)s_boot_time : 0ULL) + s_uptime + 3ULL * 3600ULL;
    uint32_t hh = (uint32_t)((total_sec / 3600ULL) % 24ULL);
    uint32_t mm = (uint32_t)((total_sec / 60ULL) % 60ULL);
    uint32_t ss = (uint32_t)(total_sec % 60ULL);
    char clk[24];
    ksnprintf(clk, sizeof(clk), "%02u:%02u:%02u", hh, mm, ss);
    fb_fill_round_rect((int)s_w - 116, tb_y + 7, 102, 34, 6, p->card);
    fb_draw_text_centered((int)s_w - 65, tb_y + 16, clk, p->accent, 1);
}

void gui_init(void)
{
    if (fb_ready()) {
        s_w = fb_width();
        s_h = fb_height();
    }
    s_cursor_x = (int)s_w / 2;
    s_cursor_y = (int)s_h / 2;

    const char *titles[8] = {
        "",
        "J.A.R.V.I.S. Sesli AI & Cekirdek Komuta",
        "Quantro Q-Lab — 4-Kubit Kuantum Simulatoru",
        "Quantro AstroLab — Relativistik Astrofizik",
        "Dosya Gezgini (Windows 11 VFS/FAT32)",
        "QuantOS PowerShell Terminali",
        "Windows 11 & QuantOS Ayarlar",
        "Hesap Makinesi"
    };

    for (int i = 1; i <= 7; i++) {
        s_wins[i].open      = 0;
        s_wins[i].minimized = 0;
        s_wins[i].maximized = 0;
        s_wins[i].x         = 160 + (i - 1) * 28;
        s_wins[i].y         = 56 + (i - 1) * 22;
        s_wins[i].w         = 606;
        s_wins[i].h         = 332;
        s_wins[i].title     = titles[i];
    }
    /* Varsayilan olarak J.A.R.V.I.S. ve Q-Lab pencerelerini yan yana/kademeli ac */
    s_wins[APP_QLAB].open   = 1;
    s_wins[APP_QLAB].x      = 168;
    s_wins[APP_QLAB].y      = 388;
    s_wins[APP_JARVIS].open = 1;
    s_wins[APP_JARVIS].x    = 156;
    s_wins[APP_JARVIS].y    = 36;
    s_active_app            = APP_JARVIS;
}

void gui_show_visionary_boot(void)
{
    if (!fb_ready()) return;
    const gui_palette_t *p = &s_palettes[s_theme];
    fb_fill_rect(0, 0, (int)s_w, (int)s_h, 0x0B0C0F);

    int cx = (int)s_w / 2;
    int cy = (int)s_h / 2 - 28;
    draw_quantro_mark(cx, cy, 42, p->accent, p->accent_alt);
    fb_draw_text_centered(cx, cy + 62, "Q U A N T O S", p->text_main, 2);
    fb_draw_text_centered(cx, cy + 98, "Quantro AR-GE Kuantum & Astrofizik Isletim Sistemi | J.A.R.V.I.S. AI", p->accent, 1);

    /* Hizli onyukleme ilerleme cubugu */
    int bw = 320, bx = cx - bw / 2, by = cy + 132;
    fb_fill_round_rect(bx, by, bw, 6, 3, p->card);
    for (int step = 1; step <= 8; step++) {
        fb_fill_round_rect(bx, by, (bw * step) / 8, 6, 3, p->accent);
        for (volatile int d = 0; d < 350000; d++) { }
    }
}

void gui_redraw_all(void)
{
    if (!fb_ready()) return;
    s_has_bg = 0;

    draw_wallpaper_and_hud();

    /* once arka plandaki acik pencereler, en son odakli pencere */
    for (int i = 1; i <= 7; i++) {
        if (i != s_active_app)
            draw_window(i);
    }
    if (s_active_app >= 1 && s_active_app <= 7)
        draw_window(s_active_app);

    draw_flyouts_and_taskbar();
    cursor_draw();
}

void gui_tick(int64_t boot_time, uint64_t uptime_seconds)
{
    s_boot_time = boot_time;
    s_uptime    = uptime_seconds;
    if (!fb_ready()) return;

    /* Yalnizca saat rozetini tazele (titremesiz) */
    const gui_palette_t *p = &s_palettes[s_theme];
    int tb_y = (int)s_h - 48;
    cursor_restore();
    uint64_t total_sec = (s_boot_time > 0 ? (uint64_t)s_boot_time : 0ULL) + s_uptime + 3ULL * 3600ULL;
    uint32_t hh = (uint32_t)((total_sec / 3600ULL) % 24ULL);
    uint32_t mm = (uint32_t)((total_sec / 60ULL) % 60ULL);
    uint32_t ss = (uint32_t)(total_sec % 60ULL);
    char clk[24];
    ksnprintf(clk, sizeof(clk), "%02u:%02u:%02u", hh, mm, ss);
    fb_fill_round_rect((int)s_w - 116, tb_y + 7, 102, 34, 6, p->card);
    fb_draw_text_centered((int)s_w - 65, tb_y + 16, clk, p->accent, 1);
    cursor_draw();
}

void gui_panic(const char *message)
{
    if (!fb_ready()) return;
    fb_fill_rect(0, 0, (int)s_w, (int)s_h, 0x160B0E);
    fb_draw_text(80, 120, ":(  QuantOS Cekirdek Kritik Durdurma", 0xD1925C, 2);
    fb_draw_text(80, 180, message ? message : "BILINMEYEN_ISTISNA", 0xF4F2EE, 1);
    fb_draw_text(80, 210, "AArch64 VBAR_EL1 istisna kaydi UART seri konsola aktarildi.", 0x9CA3AF, 1);
}

void gui_open_app(int app_id)
{
    if (app_id < 1 || app_id > 7) return;
    s_wins[app_id].open = 1;
    s_wins[app_id].minimized = 0;
    s_active_app = app_id;
    s_start_open = 0;
    gui_redraw_all();
}

void gui_toggle_app(int app_id)
{
    if (app_id < 1 || app_id > 7) return;
    if (!s_wins[app_id].open || s_wins[app_id].minimized) {
        gui_open_app(app_id);
    } else if (s_active_app == app_id) {
        s_wins[app_id].minimized = 1;
        gui_redraw_all();
    } else {
        s_active_app = app_id;
        gui_redraw_all();
    }
}

void gui_close_active_app(void)
{
    if (s_active_app >= 1 && s_active_app <= 7) {
        s_wins[s_active_app].open = 0;
        s_snap_open = 0;
        gui_redraw_all();
    }
}

void gui_toggle_start_menu(void)
{
    s_start_open = !s_start_open;
    s_quick_open = 0;
    s_notif_open = 0;
    gui_redraw_all();
}

void gui_toggle_settings_window(void)
{
    gui_toggle_app(APP_SETTINGS);
}

void gui_toggle_quick_settings(void)
{
    s_quick_open = !s_quick_open;
    s_start_open = 0;
    s_notif_open = 0;
    gui_redraw_all();
}

void gui_toggle_notifications(void)
{
    s_notif_open = !s_notif_open;
    s_start_open = 0;
    s_quick_open = 0;
    gui_redraw_all();
}

void gui_set_theme(int theme_id)
{
    if (theme_id < 0 || theme_id > 2) theme_id = THEME_INK_COPPER;
    s_theme = theme_id;
    gui_redraw_all();
}

int gui_get_theme(void)
{
    return s_theme;
}

static int hit(int mx, int my, int x, int y, int w, int h)
{
    return (mx >= x && mx < x + w && my >= y && my < y + h);
}

static void calc_press(const char *key)
{
    char k = key[0];
    if (k >= '0' && k <= '9') {
        int d = k - '0';
        s_calc_val = s_calc_fresh ? d : (s_calc_val * 10 + d);
        s_calc_fresh = 0;
    } else if (k == 'C') {
        s_calc_val = 0; s_calc_acc = 0; s_calc_op = 0; s_calc_fresh = 1;
    } else if (k == '=') {
        if (s_calc_op == '+') s_calc_val = s_calc_acc + s_calc_val;
        else if (s_calc_op == '-') s_calc_val = s_calc_acc - s_calc_val;
        else if (s_calc_op == '*') s_calc_val = s_calc_acc * s_calc_val;
        else if (s_calc_op == '/' && s_calc_val != 0) s_calc_val = s_calc_acc / s_calc_val;
        s_calc_op = 0;
        s_calc_fresh = 1;
    } else {
        s_calc_acc = s_calc_val;
        s_calc_op = k;
        s_calc_fresh = 1;
    }
}

static void handle_left_click(int mx, int my)
{
    int tb_y = (int)s_h - 48;

    /* 1. Gorev Cubugu tiklamalari */
    if (my >= tb_y) {
        int slot_w = 56;
        int start_x = ((int)s_w - 8 * slot_w) / 2;
        for (int i = 0; i < 8; i++) {
            int bx = start_x + i * slot_w + 4;
            if (hit(mx, my, bx, tb_y + 6, 48, 36)) {
                if (i == 0) gui_toggle_start_menu();
                else gui_toggle_app(i);
                return;
            }
        }
        if (hit(mx, my, (int)s_w - 220, tb_y + 7, 96, 34)) {
            gui_toggle_quick_settings();
            return;
        }
        if (hit(mx, my, (int)s_w - 116, tb_y + 7, 102, 34)) {
            gui_toggle_notifications();
            return;
        }
        return;
    }

    /* 2. Baslat Menusu aciksa */
    if (s_start_open) {
        int mw = 520, mh = 380;
        int sx = ((int)s_w - mw) / 2;
        int sy = tb_y - mh - 10;
        if (hit(mx, my, sx, sy, mw, mh)) {
            for (int i = 0; i < 7; i++) {
                int bx = sx + 24 + (i % 4) * 120;
                int by = sy + 58 + (i / 4) * 92;
                if (hit(mx, my, bx, by, 108, 72)) {
                    gui_open_app(i + 1);
                    return;
                }
            }
            return;
        }
        s_start_open = 0;
        gui_redraw_all();
        return;
    }

    /* 3. Hizli ayarlar tema degistirme */
    if (s_quick_open) {
        int qw = 300, qh = 210;
        int qx = (int)s_w - qw - 14;
        int qy = tb_y - qh - 10;
        if (hit(mx, my, qx + 154, qy + 92, 128, 36)) {
            gui_set_theme((s_theme + 1) % 3);
            return;
        }
        if (!hit(mx, my, qx, qy, qw, qh)) {
            s_quick_open = 0;
            gui_redraw_all();
            return;
        }
    }

    /* 4. Aktif pencere etkilesimleri */
    if (s_active_app >= 1 && s_active_app <= 7 &&
        s_wins[s_active_app].open && !s_wins[s_active_app].minimized) {
        app_win_t *win = &s_wins[s_active_app];
        int x = win->maximized ? 8 : win->x;
        int y = win->maximized ? 8 : win->y;
        int w = win->maximized ? ((int)s_w - 16) : win->w;
        int h = win->maximized ? ((int)s_h - 64) : win->h;

        /* Snap Layout secimi */
        if (s_snap_open) {
            int sx = x + w - 210, sy = y + 38;
            if (hit(mx, my, sx + 8, sy + 16, 56, 34)) {
                win->maximized = 0; win->x = 8; win->y = 8;
                win->w = (int)s_w / 2 - 12; win->h = tb_y - 16;
                s_snap_open = 0; gui_redraw_all(); return;
            }
            if (hit(mx, my, sx + 70, sy + 16, 56, 34)) {
                win->maximized = 0; win->x = (int)s_w / 2 + 4; win->y = 8;
                win->w = (int)s_w / 2 - 12; win->h = tb_y - 16;
                s_snap_open = 0; gui_redraw_all(); return;
            }
            if (hit(mx, my, sx + 132, sy + 16, 58, 34)) {
                win->maximized = 1; s_snap_open = 0; gui_redraw_all(); return;
            }
        }

        if (hit(mx, my, x, y, w, h)) {
            /* Baslik cubugu dugmeleri */
            if (hit(mx, my, x + w - 134, y + 7, 28, 22)) { s_snap_open = !s_snap_open; gui_redraw_all(); return; }
            if (hit(mx, my, x + w - 100, y + 7, 28, 22)) { win->minimized = 1; s_snap_open = 0; gui_redraw_all(); return; }
            if (hit(mx, my, x + w - 66,  y + 7, 28, 22)) { win->maximized = !win->maximized; s_snap_open = 0; gui_redraw_all(); return; }
            if (hit(mx, my, x + w - 32,  y + 7, 26, 22)) { win->open = 0; s_snap_open = 0; gui_redraw_all(); return; }

            int cy = y + 38;
            if (s_active_app == APP_JARVIS) {
                if (hit(mx, my, x + 18,  cy + 206, 132, 32)) { jarvis_execute("durum raporu", 0, 0); return; }
                if (hit(mx, my, x + 158, cy + 206, 132, 32)) { jarvis_execute("bell dolanik", 0, 0); return; }
                if (hit(mx, my, x + 298, cy + 206, 132, 32)) { jarvis_execute("bb84 qkd", 0, 0); return; }
                if (hit(mx, my, x + 438, cy + 206, 132, 32)) { jarvis_execute("sgr a* analiz", 0, 0); return; }
                if (hit(mx, my, x + 18,  cy + 248, 178, 32)) { gui_set_theme(THEME_INK_COPPER); return; }
                if (hit(mx, my, x + 204, cy + 248, 178, 32)) { gui_set_theme(THEME_JARVIS_HOLO); return; }
                if (hit(mx, my, x + 390, cy + 248, 180, 32)) { gui_set_theme(THEME_WIN11_MICA); return; }
            } else if (s_active_app == APP_QLAB) {
                if (hit(mx, my, x + 18,  cy + 240, 74, 32)) { qpu_h(0); gui_redraw_all(); return; }
                if (hit(mx, my, x + 98,  cy + 240, 74, 32)) { qpu_x(0); gui_redraw_all(); return; }
                if (hit(mx, my, x + 178, cy + 240, 88, 32)) { qpu_cnot(0, 1); gui_redraw_all(); return; }
                if (hit(mx, my, x + 272, cy + 240, 96, 32)) { qpu_bell_pair(); gui_redraw_all(); return; }
                if (hit(mx, my, x + 374, cy + 240, 76, 32)) { qpu_ghz3(); gui_redraw_all(); return; }
                if (hit(mx, my, x + 456, cy + 240, 64, 32)) { qpu_measure_all(); gui_redraw_all(); return; }
                if (hit(mx, my, x + 526, cy + 240, 62, 32)) { qpu_reset(); gui_redraw_all(); return; }
            } else if (s_active_app == APP_ASTRO) {
                if (hit(mx, my, x + 18,  cy + 236, 130, 32)) { s_astro_mass = 10ULL; gui_redraw_all(); return; }
                if (hit(mx, my, x + 158, cy + 236, 140, 32)) { s_astro_mass = 65ULL; gui_redraw_all(); return; }
                if (hit(mx, my, x + 308, cy + 236, 130, 32)) { s_astro_mass = 21ULL; gui_redraw_all(); return; }
                if (hit(mx, my, x + 448, cy + 236, 140, 32)) { s_astro_mass = 4154000ULL; gui_redraw_all(); return; }
            } else if (s_active_app == APP_SETTINGS) {
                if (hit(mx, my, x + 18,  cy + 216, 178, 36)) { gui_set_theme(THEME_INK_COPPER); return; }
                if (hit(mx, my, x + 204, cy + 216, 178, 36)) { gui_set_theme(THEME_JARVIS_HOLO); return; }
                if (hit(mx, my, x + 390, cy + 216, 180, 36)) { gui_set_theme(THEME_WIN11_MICA); return; }
            } else if (s_active_app == APP_CALC) {
                const char *btns[4][4] = {
                    {"7", "8", "9", "/"},
                    {"4", "5", "6", "*"},
                    {"1", "2", "3", "-"},
                    {"C", "0", "=", "+"}
                };
                int bw = (w - 60) / 4;
                for (int r = 0; r < 4; r++) {
                    for (int c = 0; c < 4; c++) {
                        if (hit(mx, my, x + 18 + c * (bw + 8), cy + 78 + r * 46, bw, 38)) {
                            calc_press(btns[r][c]);
                            gui_redraw_all();
                            return;
                        }
                    }
                }
            }
            return;
        }
    }

    /* 5. Arka plandaki acik pencereye tiklandiysa odakla */
    for (int i = 7; i >= 1; i--) {
        if (s_wins[i].open && !s_wins[i].minimized &&
            hit(mx, my, s_wins[i].x, s_wins[i].y, s_wins[i].w, s_wins[i].h)) {
            s_active_app = i;
            gui_redraw_all();
            return;
        }
    }

    /* 6. Sol masaustu kisayollari */
    const int desk_apps[4] = { APP_JARVIS, APP_QLAB, APP_ASTRO, APP_EXPLORER };
    for (int i = 0; i < 4; i++) {
        if (hit(mx, my, 22, 22 + i * 78, 118, 66)) {
            gui_open_app(desk_apps[i]);
            return;
        }
    }
}

void gui_move_cursor(int x, int y)
{
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x >= (int)s_w) x = (int)s_w - 1;
    if (y >= (int)s_h) y = (int)s_h - 1;

    cursor_restore();
    s_cursor_x = x;
    s_cursor_y = y;
    cursor_draw();
}

void gui_handle_mouse(int x, int y, int btn)
{
    gui_move_cursor(x, y);
    if (btn == 1 && s_prev_btn == 0)
        handle_left_click(s_cursor_x, s_cursor_y);
    s_prev_btn = btn;
}

int gui_get_cursor_x(void) { return s_cursor_x; }
int gui_get_cursor_y(void) { return s_cursor_y; }
