/*
 * QuantOS — Cekirdek Relativistik Astrofizik Motoru
 * Quantro AR-GE | Saf 64-bit Sabit Noktali Schwarzschild, ISCO ve Yorunge Mekanigi
 */
#include "astro.h"
#include "kernel.h"
#include "uart.h"

/*
 * CODATA 2022 Sabitleri:
 *   G * M_sun = 1.32712440018e20 m^3/s^2 = 132,712,440,018 km^3/s^2
 *   c         = 299,792,458 m/s
 *   Rs(1 M_sun) = 2 * G * M_sun / c^2 = 2953.25008 m (~= 2.95325 km)
 */
#define GM_SUN_KM3_S2       132712440018ULL
#define RS_SUN_CM           295325ULL        /* 2953.25 m = 295,325 cm */

static uint64_t isqrt64(uint64_t n)
{
    if (n < 2ULL) return n;
    uint64_t x = n;
    uint64_t y = (x + 1ULL) >> 1;
    while (y < x) {
        x = y;
        y = (x + n / x) >> 1;
    }
    return x;
}

void astro_init(void)
{
    uint64_t sgr_rs_km100 = astro_schwarzschild_km_x100(4154000ULL);
    uart_printf("[astro] Quantro Relativistik Astrofizik Motoru hazir (Sgr A* Rs=%llu.%02llu km)\r\n",
                (unsigned long long)(sgr_rs_km100 / 100ULL),
                (unsigned long long)(sgr_rs_km100 % 100ULL));
}

uint64_t astro_schwarzschild_m(uint64_t solar_masses)
{
    if (solar_masses == 0) return 0;
    /* solar_masses * 2953.25 m */
    uint64_t whole = solar_masses * 2953ULL;
    uint64_t frac  = (solar_masses * 25ULL + 50ULL) / 100ULL;
    return whole + frac;
}

uint64_t astro_schwarzschild_km_x100(uint64_t solar_masses)
{
    if (solar_masses == 0) return 0;
    /* 1 M_sun => 2.95325 km => *100 = 295.325 */
    uint64_t whole = solar_masses * 295ULL;
    uint64_t frac  = (solar_masses * 325ULL + 500ULL) / 1000ULL;
    return whole + frac;
}

uint64_t astro_photon_sphere_km_x100(uint64_t solar_masses)
{
    uint64_t rs = astro_schwarzschild_km_x100(solar_masses);
    return (rs * 3ULL + 1ULL) / 2ULL; /* 1.5 * Rs */
}

uint64_t astro_isco_km_x100(uint64_t solar_masses)
{
    return astro_schwarzschild_km_x100(solar_masses) * 3ULL; /* 3.0 * Rs */
}

uint64_t astro_orbital_vel_kms(uint64_t solar_masses, uint64_t radius_km)
{
    if (solar_masses == 0 || radius_km == 0) return 0;
    /* Tasmayi onlemek icin once bolme + kalan orani uygula */
    uint64_t q = GM_SUN_KM3_S2 / radius_km;
    uint64_t rem = GM_SUN_KM3_S2 % radius_km;
    uint64_t v2 = solar_masses * q + (solar_masses * rem) / radius_km;
    if (v2 > 299792ULL * 299792ULL)
        return 299792ULL; /* Isik hizi siniri */
    return isqrt64(v2);
}

void astro_format_summary(uint64_t solar_masses, char *buf, size_t max_len)
{
    if (!buf || max_len == 0) return;
    if (solar_masses == 0) solar_masses = 10;

    uint64_t rs   = astro_schwarzschild_km_x100(solar_masses);
    uint64_t rph  = astro_photon_sphere_km_x100(solar_masses);
    uint64_t isco = astro_isco_km_x100(solar_masses);

    ksnprintf(buf, max_len,
              "M=%llu M_gunes | Ufuk Rs=%llu.%02llu km | Foton=%llu.%02llu km | ISCO=%llu.%02llu km",
              (unsigned long long)solar_masses,
              (unsigned long long)(rs / 100ULL),   (unsigned long long)(rs % 100ULL),
              (unsigned long long)(rph / 100ULL),  (unsigned long long)(rph % 100ULL),
              (unsigned long long)(isco / 100ULL), (unsigned long long)(isco % 100ULL));
}

void astro_print_report(uint64_t solar_masses)
{
    if (solar_masses == 0) solar_masses = 10;
    uint64_t rs_m   = astro_schwarzschild_m(solar_masses);
    uint64_t rs     = astro_schwarzschild_km_x100(solar_masses);
    uint64_t rph    = astro_photon_sphere_km_x100(solar_masses);
    uint64_t isco   = astro_isco_km_x100(solar_masses);
    uint64_t r_safe = (isco / 100ULL) > 0 ? (isco / 100ULL) : 1ULL;
    uint64_t v_isco = astro_orbital_vel_kms(solar_masses, r_safe);

    uart_puts("\r\n--- Quantro AstroLab Relativistik Kara Delik Raporu ---\r\n");
    uart_printf("  Kutle (M):                  %llu M_gunes\r\n", (unsigned long long)solar_masses);
    uart_printf("  Schwarzschild Yaricapi Rs:  %llu.%02llu km (%llu m)\r\n",
                (unsigned long long)(rs / 100ULL), (unsigned long long)(rs % 100ULL),
                (unsigned long long)rs_m);
    uart_printf("  Foton Kuresi (1.5 Rs):      %llu.%02llu km\r\n",
                (unsigned long long)(rph / 100ULL), (unsigned long long)(rph % 100ULL));
    uart_printf("  Kararli Son Yorunge (ISCO): %llu.%02llu km\r\n",
                (unsigned long long)(isco / 100ULL), (unsigned long long)(isco % 100ULL));
    uart_printf("  ISCO Yorunge Hizi:          ~%llu km/s\r\n",
                (unsigned long long)v_isco);
    uart_puts("-------------------------------------------------------\r\n");
}
