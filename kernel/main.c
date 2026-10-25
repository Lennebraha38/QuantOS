/*
 * QuantOS — Ana Cekirdek (AArch64 Bare-Metal, Limine Boot Protocol rev 2)
 * Quantro AR-GE Kuantum & Astrofizik Isletim Sistemi | Windows 11 DWM + Sesli J.A.R.V.I.S. AI
 */
#include "types.h"
#include "kernel.h"
#include "uart.h"
#include "fb.h"
#include "gui.h"
#include "qpu.h"
#include "astro.h"
#include "jarvis.h"
#include "vfs.h"
#include "fat.h"
#include "net.h"
#include "sound.h"
#include "proc.h"
#include "user.h"
#include "sec.h"
#include "wm.h"
#include "clipboard.h"
#include "notify.h"
#include "mouse.h"
#include "pmm.h"
#include "vmm.h"
#include "heap.h"
#include "traps.h"
#include "syscall.h"
#include "ipc.h"
#include "elfloader.h"
#include "limine.h"

extern uint64_t psci_version(void);
extern void     psci_reset(void);

/* ---- Limine istekleri (base protocol revision 2) ------------------ */

__attribute__((used, section(".limine_requests")))
static volatile LIMINE_BASE_REVISION(2);

__attribute__((used, section(".limine_requests_start")))
static volatile LIMINE_REQUESTS_START_MARKER;

__attribute__((used, section(".limine_requests")))
static volatile struct limine_framebuffer_request framebuffer_request = {
    .id = LIMINE_FRAMEBUFFER_REQUEST,
    .revision = 0
};

__attribute__((used, section(".limine_requests")))
static volatile struct limine_memmap_request memmap_request = {
    .id = LIMINE_MEMMAP_REQUEST,
    .revision = 0
};

__attribute__((used, section(".limine_requests")))
static volatile struct limine_hhdm_request hhdm_request = {
    .id = LIMINE_HHDM_REQUEST,
    .revision = 0
};

__attribute__((used, section(".limine_requests")))
static volatile struct limine_boot_time_request boot_time_request = {
    .id = LIMINE_BOOT_TIME_REQUEST,
    .revision = 0
};

__attribute__((used, section(".limine_requests_end")))
static volatile LIMINE_REQUESTS_END_MARKER;

static volatile uintptr_t hhdm_offset = 0;
static int64_t            boot_unix_time = 0;
static uint64_t           memmap_usable_bytes = 0;
static int                s_has_fb = 0;

static const char *memmap_type_name(uint64_t type)
{
    switch (type) {
    case LIMINE_MEMMAP_USABLE:                 return "usable";
    case LIMINE_MEMMAP_RESERVED:               return "reserved";
    case LIMINE_MEMMAP_ACPI_RECLAIMABLE:       return "acpi_reclaim";
    case LIMINE_MEMMAP_ACPI_NVS:               return "acpi_nvs";
    case LIMINE_MEMMAP_BAD_MEMORY:             return "bad_memory";
    case LIMINE_MEMMAP_BOOTLOADER_RECLAIMABLE: return "reclaimable";
    case LIMINE_MEMMAP_KERNEL_AND_MODULES:     return "kernel_and_modules";
    case LIMINE_MEMMAP_FRAMEBUFFER:            return "framebuffer";
    default:                                   return "unknown";
    }
}

static void shell_mem(void)
{
    if (!memmap_request.response) {
        uart_puts("Bellek haritasi mevcut degil.\r\n");
        return;
    }

    struct limine_memmap_response *resp = memmap_request.response;
    uint64_t total = 0;
    for (uint64_t i = 0; i < resp->entry_count; i++) {
        struct limine_memmap_entry *e = resp->entries[i];
        uint64_t mb = e->length / (1024ULL * 1024ULL);
        uart_printf("[%llu] base=0x%llx len=%llu MiB type=%s\r\n",
                    (unsigned long long)i,
                    (unsigned long long)e->base,
                    (unsigned long long)mb,
                    memmap_type_name(e->type));
        if (e->type == LIMINE_MEMMAP_USABLE)
            total += e->length;
    }
    memmap_usable_bytes = total;
    uart_printf("[mem] Toplam Kullanilabilir RAM: %u MiB\r\n",
                (unsigned)(memmap_usable_bytes / (1024ULL * 1024ULL)));
}

static void shell_pmm(void)
{
    uint64_t total = pmm_get_total_memory();
    uint64_t free  = pmm_get_free_memory();
    uint64_t used  = pmm_get_used_memory();

    uart_puts("\r\n--- QuantOS Fiziksel Sayfa Ayirici (PMM 4KB) ---\r\n");
    uart_printf("  Toplam Yonetilen : %llu MB (%llu sayfa)\r\n",
                (unsigned long long)(total / (1024ULL * 1024ULL)), (unsigned long long)(total / 4096ULL));
    uart_printf("  Kullanilan       : %llu MB (%llu sayfa)\r\n",
                (unsigned long long)(used / (1024ULL * 1024ULL)), (unsigned long long)(used / 4096ULL));
    uart_printf("  Bos Alan         : %llu MB (%llu sayfa)\r\n",
                (unsigned long long)(free / (1024ULL * 1024ULL)), (unsigned long long)(free / 4096ULL));
}

static void shell_heap(void)
{
    size_t used  = heap_get_used();
    size_t total = heap_get_total();
    uart_puts("\r\n--- QuantOS Cekirdek Dinamik Heap (kmalloc/kfree) ---\r\n");
    uart_printf("  Kapasite: %u KB | Kullanilan: %u KB | Bos: %u KB\r\n",
                (unsigned)(total / 1024U), (unsigned)(used / 1024U),
                (unsigned)((total - used) / 1024U));
}

static void shell_sysinfo(void)
{
    uart_puts("\r\n=======================================================\r\n");
    uart_puts(" QUANTOS — QUANTRO AR-GE SISTEM BILGISI (SYSTEMINFO)\r\n");
    uart_puts("=======================================================\r\n");
    uart_puts(" Kurum / Dugum       : Quantro AR-GE (Kayseri) — QUANTOS-NODE01\r\n");
    uart_printf(" Isletim Sistemi     : %s v%s (Windows 11 DWM + J.A.R.V.I.S.)\r\n",
                KERNEL_NAME, KERNEL_VERSION);
    uart_puts(" Cekirdek Mimarisi   : ARM64 Bare-Metal EL1 (Limine UEFI rev 2)\r\n");
    uart_puts(" Bilimsel Motorlar   : 4-Kubit Q16.16 QPU + BB84 QKD + Relativistik AstroLab\r\n");
    uart_puts(" Sesli Yapay Zeka    : J.A.R.V.I.S. ([JARVIS_SPEAK] UART -> Host TTS)\r\n");
    uart_puts(" Guvenlik            : TPM 2.0 (PCR0-7), Secure Boot, VBS & SAM\r\n");
    uart_printf(" Fiziksel Bellek     : %u MiB Kullanilabilir | Heap: %u KB\r\n",
                (unsigned)(memmap_usable_bytes / (1024ULL * 1024ULL)),
                (unsigned)(heap_get_total() / 1024U));
    uart_puts("=======================================================\r\n");
}

static void shell_help(void)
{
    uart_puts(
        "\r\n--- QUANTOS CEKIRDEK & J.A.R.V.I.S. KOMUT KILAVUZU ---\r\n"
        " BILIMSEL & YAPAY ZEKA:\r\n"
        "   jarvis <ifade>          - J.A.R.V.I.S. sesli asistana komut ver\r\n"
        "   qpu [bell|ghz|olc|sifir]- 4-Kubit QPU durum vektorunu goster / calistir\r\n"
        "   bb84 [eve]              - BB84 Kuantum Anahtar Dagitimi oz-testi\r\n"
        "   astro [gunes_kutlesi]   - Kara delik Schwarzschild, Foton Kuresi, ISCO analizi\r\n"
        "   theme <copper|jarvis|win11> - Masaustu temasini canli degistir\r\n\r"
        " WINDOWS 11 SISTEM, VFS, GUVENLIK & AG:\r\n"
        "   sysinfo, ver, mem, pmm, heap, uptime, cls, reboot, halt\r\n"
        "   ls, fatls, cat <ad>, touch <ad>, write <ad> <metin>, rm <ad>, mkdir <ad>\r\n"
        "   ps, start <ad>, kill <pid>, exec <elf>, wm, explorer, settings, calc\r\n"
        "   whoami, users, tpm, secstat, ipconfig, ping <ip>, netstat\r\n\r\n");
}

static void uart_print_banner(void)
{
    uart_puts("\r\n=======================================================\r\n");
    uart_printf(" %s v%s — Quantro AR-GE | Windows 11 + J.A.R.V.I.S.\r\n",
                KERNEL_NAME, KERNEL_VERSION);
    uart_printf(" Mimari: %s | QPU + AstroLab + PMM/VMM/Heap AKTIF\r\n", KERNEL_ARCH);
    uart_puts(" Komut kilavuzu icin 'help' veya 'jarvis merhaba' yazin.\r\n");
    uart_puts("=======================================================\r\n");
    uart_puts("PS C:\\QuantOS> ");
}

static void seed_quantro_vfs_files(void)
{
    vfs_mkdir("C:\\QuantOS");
    vfs_create("bell_4q.qasm");
    vfs_write("bell_4q.qasm", "OPENQASM 2.0;\nqreg q[4];\nh q[0];\ncx q[0],q[1];\n");
    vfs_create("quantro_manifesto.txt");
    vfs_write("quantro_manifesto.txt",
              "Quantro AR-GE — Kuantum Mekanigi, Astrofizik ve J.A.R.V.I.S. Isletim Sistemi.");
}

static void shell_execute(char *line)
{
    while (*line == ' ') line++;
    if (*line == '\0') goto prompt;

    char cmd[32];
    char rest[128];
    char arg1[64];
    char arg2[64];
    cmd[0] = '\0'; rest[0] = '\0'; arg1[0] = '\0'; arg2[0] = '\0';

    int i = 0;
    while (*line && *line != ' ' && i < 31) cmd[i++] = *line++;
    cmd[i] = '\0';

    while (*line == ' ') line++;
    strncpy(rest, line, sizeof(rest) - 1);
    rest[sizeof(rest) - 1] = '\0';

    i = 0;
    while (*line && *line != ' ' && i < 63) arg1[i++] = *line++;
    arg1[i] = '\0';

    while (*line == ' ') line++;
    i = 0;
    while (*line && i < 63) arg2[i++] = *line++;
    arg2[i] = '\0';

    if (strcmp(cmd, "help") == 0 || strcmp(cmd, "?") == 0) {
        shell_help();
    } else if (strcmp(cmd, "jarvis") == 0) {
        char reply[256];
        jarvis_execute(rest[0] ? rest : "durum", reply, sizeof(reply));
        uart_printf("[J.A.R.V.I.S.] %s\r\n", reply);
    } else if (strcmp(cmd, "qpu") == 0) {
        if (strcmp(arg1, "bell") == 0) {
            qpu_bell_pair();
        } else if (strcmp(arg1, "ghz") == 0) {
            qpu_ghz3();
        } else if (strcmp(arg1, "olc") == 0 || strcmp(arg1, "measure") == 0) {
            int m = qpu_measure_all();
            uart_printf("[qpu] Dalga fonksiyonu coktu -> |%d>\r\n", m);
        } else if (strcmp(arg1, "sifir") == 0 || strcmp(arg1, "reset") == 0) {
            qpu_reset();
        } else if (strcmp(arg1, "h") == 0) {
            qpu_h(arg2[0] ? atoi(arg2) : 0);
        } else if (strcmp(arg1, "x") == 0) {
            qpu_x(arg2[0] ? atoi(arg2) : 0);
        }
        qpu_print_state();
        if (s_has_fb) gui_redraw_all();
    } else if (strcmp(cmd, "bb84") == 0) {
        int eve = (strcmp(arg1, "eve") == 0) ? 1 : 0;
        int sifted = 0, qber = 0;
        int ok = qpu_bb84_selftest(64, eve, &sifted, &qber);
        uart_printf("[bb84] 64 foton iletildi (Eve=%s) -> Elenen Anahtar=%d bit, QBER=%d%% [%s]\r\n",
                    eve ? "AKTIF" : "YOK", sifted, qber,
                    (ok == 0) ? "GUVENLI (<11%)" : "DINLEME TESPIT EDILDI!");
    } else if (strcmp(cmd, "astro") == 0) {
        uint64_t m = arg1[0] ? (uint64_t)atoi(arg1) : 10ULL;
        astro_print_report(m);
    } else if (strcmp(cmd, "theme") == 0 || strcmp(cmd, "tema") == 0) {
        if (strcmp(arg1, "jarvis") == 0) gui_set_theme(THEME_JARVIS_HOLO);
        else if (strcmp(arg1, "win11") == 0) gui_set_theme(THEME_WIN11_MICA);
        else gui_set_theme(THEME_INK_COPPER);
        uart_puts("[gui] Tema guncellendi.\r\n");
    } else if (strcmp(cmd, "ver") == 0) {
        uart_printf("%s [Surum %s — Windows 11 24H2 Paritesi, %s]\r\n",
                    KERNEL_NAME, KERNEL_VERSION, KERNEL_ARCH);
    } else if (strcmp(cmd, "sysinfo") == 0 || strcmp(cmd, "systeminfo") == 0) {
        shell_sysinfo();
    } else if (strcmp(cmd, "mem") == 0) {
        shell_mem();
    } else if (strcmp(cmd, "pmm") == 0) {
        shell_pmm();
    } else if (strcmp(cmd, "heap") == 0) {
        shell_heap();
    } else if (strcmp(cmd, "uptime") == 0) {
        uint64_t freq = timer_frequency();
        uint64_t sec  = freq ? (timer_ticks() / freq) : 0;
        uart_printf("Calisma Suresi: %llu sn\r\n", (unsigned long long)sec);
    } else if (strcmp(cmd, "cls") == 0 || strcmp(cmd, "clear") == 0) {
        uart_puts("\033[2J\033[H");
    } else if (strcmp(cmd, "reboot") == 0) {
        if (psci_version() != 0) psci_reset();
    } else if (strcmp(cmd, "halt") == 0) {
        halt_forever();
    } else if (strcmp(cmd, "ls") == 0 || strcmp(cmd, "dir") == 0) {
        if (arg1[0]) vfs_list_dir(arg1);
        else vfs_list();
    } else if (strcmp(cmd, "fatls") == 0) {
        fat_list_root();
    } else if (strcmp(cmd, "cat") == 0 || strcmp(cmd, "type") == 0) {
        const char *d = arg1[0] ? vfs_read(arg1) : 0;
        if (d) uart_printf("%s\r\n", d);
        else uart_puts("Dosya bulunamadi.\r\n");
    } else if (strcmp(cmd, "touch") == 0) {
        if (arg1[0] && vfs_create(arg1) == 0) uart_printf("Olusturuldu: %s\r\n", arg1);
    } else if (strcmp(cmd, "write") == 0) {
        if (arg1[0] && arg2[0]) { vfs_write(arg1, arg2); uart_puts("Yazildi.\r\n"); }
    } else if (strcmp(cmd, "rm") == 0 || strcmp(cmd, "del") == 0) {
        if (arg1[0]) vfs_delete(arg1);
    } else if (strcmp(cmd, "mkdir") == 0) {
        if (arg1[0]) vfs_mkdir(arg1);
    } else if (strcmp(cmd, "ps") == 0 || strcmp(cmd, "tasklist") == 0) {
        proc_list();
    } else if (strcmp(cmd, "start") == 0) {
        if (arg1[0]) proc_spawn(arg1);
        else gui_toggle_start_menu();
    } else if (strcmp(cmd, "kill") == 0 || strcmp(cmd, "taskkill") == 0) {
        if (arg1[0]) proc_kill(atoi(arg1));
    } else if (strcmp(cmd, "exec") == 0) {
        if (arg1[0]) elfloader_exec_file(arg1);
    } else if (strcmp(cmd, "whoami") == 0) {
        user_whoami();
    } else if (strcmp(cmd, "users") == 0) {
        user_list();
    } else if (strcmp(cmd, "tpm") == 0) {
        sec_tpm_info();
    } else if (strcmp(cmd, "secstat") == 0) {
        sec_print_status();
    } else if (strcmp(cmd, "ipconfig") == 0 || strcmp(cmd, "ifconfig") == 0) {
        net_ipconfig();
    } else if (strcmp(cmd, "ping") == 0) {
        net_ping(arg1[0] ? arg1 : "8.8.8.8");
    } else if (strcmp(cmd, "netstat") == 0) {
        net_netstat();
    } else if (strcmp(cmd, "wm") == 0) {
        wm_list();
    } else if (strcmp(cmd, "explorer") == 0) {
        gui_open_app(APP_EXPLORER);
    } else if (strcmp(cmd, "settings") == 0) {
        gui_open_app(APP_SETTINGS);
    } else if (strcmp(cmd, "calc") == 0) {
        gui_open_app(APP_CALC);
    } else if (strcmp(cmd, "clip") == 0) {
        if (arg1[0]) clip_copy(rest);
        else clip_status();
    } else if (strcmp(cmd, "toast") == 0) {
        notify_push("QuantOS", rest[0] ? rest : "Bildirim alindi.");
    } else {
        uart_printf("Bilinmeyen komut: '%s' ('help' veya 'jarvis %s' deneyin).\r\n", cmd, cmd);
    }

prompt:
    uart_puts("PS C:\\QuantOS> ");
}

static char   s_cmd_buf[128];
static size_t s_cmd_len = 0;

static void shell_poll_uart(void)
{
    while (uart_rx_ready()) {
        char c = uart_getc();
        if (c == '\r') c = '\n';
        if (c == '\n') {
            uart_puts("\r\n");
            s_cmd_buf[s_cmd_len] = '\0';
            shell_execute(s_cmd_buf);
            s_cmd_len = 0;
        } else if (c == 127 || c == 8) {
            if (s_cmd_len > 0) {
                s_cmd_len--;
                uart_puts("\b \b");
            }
        } else if (s_cmd_len < sizeof(s_cmd_buf) - 1 && c >= 32 && c < 127) {
            s_cmd_buf[s_cmd_len++] = c;
            uart_putc(c);
        }
    }
}

void halt_forever(void)
{
    for (;;) {
        __asm__ volatile("wfe" ::: "memory");
    }
}

void kernel_panic(const char *message)
{
    uart_printf("\r\n[QUANTOS PANIC] %s\r\n", message);
    gui_panic(message);
    halt_forever();
}

void kernel_main(void)
{
    if (!LIMINE_BASE_REVISION_SUPPORTED)
        halt_forever();

    if (hhdm_request.response)
        hhdm_offset = hhdm_request.response->offset;

    uart_init(hhdm_offset + PL011_PHYS_BASE);
    uart_printf("\r\n[%s] Quantro AR-GE AArch64 Cekirdegi Onyukleniyor (v%s)...\r\n",
                KERNEL_NAME, KERNEL_VERSION);

    if (memmap_request.response) {
        pmm_init(memmap_request.response);
        shell_mem();
    }

    vmm_init(hhdm_offset);
    heap_init(0, 0);
    traps_init();

    if (framebuffer_request.response &&
        framebuffer_request.response->framebuffer_count > 0) {
        struct limine_framebuffer *first_fb = framebuffer_request.response->framebuffers[0];
        fb_init(first_fb);
        s_has_fb = 1;
        uart_printf("[fb] Framebuffer hazir: %ux%u (%u bpp)\r\n",
                    (unsigned)first_fb->width, (unsigned)first_fb->height, (unsigned)first_fb->bpp);
    } else {
        uart_puts("[fb] Grafik Framebuffer yok, UART konsol modunda devam ediliyor.\r\n");
    }

    if (boot_time_request.response)
        boot_unix_time = boot_time_request.response->boot_time;

    timer_init();

    vfs_init();
    seed_quantro_vfs_files();
    fat_init();
    fat_mount();

    user_init();
    sec_init();
    net_init();
    sound_init();
    mouse_init(hhdm_offset);
    elfloader_init();
    proc_init();
    ipc_init();

    /* Quantro Bilimsel Cekirdek Motorlari & J.A.R.V.I.S. */
    qpu_init();
    astro_init();

    clipboard_init();
    notify_init();
    wm_init();
    wm_create_window("J.A.R.V.I.S. Sesli AI");
    wm_create_window("Quantro Q-Lab 4Q");

    if (s_has_fb) {
        gui_init();
        gui_show_visionary_boot();
        gui_redraw_all();
    }

    jarvis_init();
    uart_print_banner();

    uint64_t last_sec = 0;
    for (;;) {
        uint64_t freq  = timer_frequency();
        uint64_t ticks = timer_ticks();
        uint64_t sec   = freq ? (ticks / freq) : 0;

        if (s_has_fb && sec != last_sec) {
            last_sec = sec;
            gui_tick(boot_unix_time, sec);
        }

        mouse_poll();
        proc_tick();
        shell_poll_uart();
    }
}
