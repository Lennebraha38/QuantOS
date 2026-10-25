/*
 * QuantOS — Cekirdek Relativistik Astrofizik Motoru Baslik Dosyasi
 * Quantro AR-GE | Saf 64-bit Tamsayi / Sabit Nokta CODATA 2022 Hesaplamalari
 */
#ifndef QUANTOS_ASTRO_H
#define QUANTOS_ASTRO_H

#include "types.h"

void     astro_init(void);

/* Schwarzschild Yaricapi Rs = 2GM/c^2 (1 M_gunes = 2953.25 m) */
uint64_t astro_schwarzschild_m(uint64_t solar_masses);
uint64_t astro_schwarzschild_km_x100(uint64_t solar_masses);

/* Foton Kuresi (1.5 Rs) ve Schwarzschild ISCO (3.0 Rs = 6GM/c^2), km * 100 */
uint64_t astro_photon_sphere_km_x100(uint64_t solar_masses);
uint64_t astro_isco_km_x100(uint64_t solar_masses);

/* Dairesel Yörünge Hizi v = sqrt(GM / r) [km/s] */
uint64_t astro_orbital_vel_kms(uint64_t solar_masses, uint64_t radius_km);

/* UART ve metin raporu */
void     astro_format_summary(uint64_t solar_masses, char *buf, size_t max_len);
void     astro_print_report(uint64_t solar_masses);

#endif /* QUANTOS_ASTRO_H */
