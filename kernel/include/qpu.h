/*
 * QuantOS — Cekirdek Kuantum Islem Birimi (QPU) Baslik Dosyasi
 * Quantro AR-GE | Saf Sabit Noktali (Q16.16) 4-Kubit Durum Vektoru ve BB84 QKD
 * Not: AArch64 EL1 cekirdegi -mgeneral-regs-only ile derlendiginden float/double icermez.
 */
#ifndef QUANTOS_QPU_H
#define QUANTOS_QPU_H

#include "types.h"

#define QPU_NUM_QUBITS  4
#define QPU_NUM_STATES  (1 << QPU_NUM_QUBITS) /* 16 baz durum: |0000> .. |1111> */
#define Q16_ONE         65536                 /* 1.0 = 2^16 */
#define Q16_INV_SQRT2   46341                 /* 1/sqrt(2) ~= 0.7071075 * 65536 */

typedef struct {
    int32_t re; /* Q16.16 gercel kisim */
    int32_t im; /* Q16.16 sanal kisim */
} q16_complex_t;

void     qpu_init(void);
void     qpu_reset(void);

/* Tek kubitli uniter kapilar (q: 0..3) */
void     qpu_h(int q);
void     qpu_x(int q);
void     qpu_y(int q);
void     qpu_z(int q);

/* Iki kubitli dolaniklik kapilari */
void     qpu_cnot(int ctrl, int tgt);
void     qpu_cz(int ctrl, int tgt);

/* Hazir kuantum devreleri */
void     qpu_bell_pair(void);
void     qpu_ghz3(void);

/* Olasilik ve donanim zamanlayici entropili olcum */
uint32_t qpu_prob_pct(int state_idx);
uint32_t qpu_prob_permil(int state_idx);
int      qpu_measure_all(void);
int      qpu_last_measurement(void);
uint32_t qpu_gate_ops(void);

/* BB84 Kuantum Anahtar Dagitimi (QKD) Oz-Testi */
int      qpu_bb84_selftest(int n_photons, int eavesdrop, int *sifted_out, int *qber_pct_out);

/* UART tanilama ciktisi */
void     qpu_print_state(void);

#endif /* QUANTOS_QPU_H */
