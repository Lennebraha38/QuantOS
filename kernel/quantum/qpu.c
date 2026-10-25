/*
 * QuantOS — Cekirdek Kuantum Islem Birimi (QPU)
 * Quantro AR-GE | Q16.16 Sabit Noktali 4-Kubit Durum Vektoru + BB84 QKD
 */
#include "qpu.h"
#include "kernel.h"
#include "uart.h"

static q16_complex_t s_psi[QPU_NUM_STATES];
static int           s_last_measured = 0;
static uint32_t      s_gate_ops = 0;
static uint64_t      s_rng_state = 0x9E3779B97F4A7C15ULL;

static inline int32_t q16_mul(int32_t a, int32_t b)
{
    int64_t prod = (int64_t)a * (int64_t)b;
    /* Yuvarlamali aritmetik sag kaydirma */
    if (prod >= 0)
        return (int32_t)((prod + 32768LL) >> 16);
    return (int32_t)(-(((-prod) + 32768LL) >> 16));
}

/* Donanim CNTVCT_EL0 sayacini SplitMix64 ile karistiran entropi kaynagi */
static uint64_t qpu_entropy_u64(void)
{
    uint64_t ticks = timer_ticks();
    s_rng_state ^= ticks + 0x9E3779B97F4A7C15ULL;
    uint64_t z = (s_rng_state += 0x9E3779B97F4A7C15ULL);
    z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
    z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
    return z ^ (z >> 31);
}

void qpu_reset(void)
{
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        s_psi[i].re = 0;
        s_psi[i].im = 0;
    }
    s_psi[0].re = Q16_ONE; /* |0000> = 1.0 + 0.0i */
    s_last_measured = 0;
}

void qpu_init(void)
{
    qpu_reset();
    s_gate_ops = 0;
    /* Onyukleme oz-testi: Bell |Phi+> olustur ve norm dogrula */
    qpu_bell_pair();
    uint32_t p00 = qpu_prob_pct(0);
    uint32_t p11 = qpu_prob_pct(3);
    uart_printf("[qpu] Quantro 4-Kubit Q16.16 QPU hazir (Bell |Phi+> P00=%u%%, P11=%u%%)\r\n",
                p00, p11);
}

void qpu_h(int q)
{
    if (q < 0 || q >= QPU_NUM_QUBITS) return;
    int mask = 1 << q;
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        if ((i & mask) == 0) {
            int j = i | mask;
            q16_complex_t a = s_psi[i];
            q16_complex_t b = s_psi[j];
            s_psi[i].re = q16_mul(a.re + b.re, Q16_INV_SQRT2);
            s_psi[i].im = q16_mul(a.im + b.im, Q16_INV_SQRT2);
            s_psi[j].re = q16_mul(a.re - b.re, Q16_INV_SQRT2);
            s_psi[j].im = q16_mul(a.im - b.im, Q16_INV_SQRT2);
        }
    }
    s_gate_ops++;
}

void qpu_x(int q)
{
    if (q < 0 || q >= QPU_NUM_QUBITS) return;
    int mask = 1 << q;
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        if ((i & mask) == 0) {
            int j = i | mask;
            q16_complex_t tmp = s_psi[i];
            s_psi[i] = s_psi[j];
            s_psi[j] = tmp;
        }
    }
    s_gate_ops++;
}

void qpu_y(int q)
{
    if (q < 0 || q >= QPU_NUM_QUBITS) return;
    int mask = 1 << q;
    /* Y|0> = i|1>, Y|1> = -i|0> => yeni_0 = -i * eski_1, yeni_1 = i * eski_0 */
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        if ((i & mask) == 0) {
            int j = i | mask;
            q16_complex_t a = s_psi[i];
            q16_complex_t b = s_psi[j];
            /* -i * (b.re + i b.im) = b.im - i b.re */
            s_psi[i].re =  b.im;
            s_psi[i].im = -b.re;
            /* +i * (a.re + i a.im) = -a.im + i a.re */
            s_psi[j].re = -a.im;
            s_psi[j].im =  a.re;
        }
    }
    s_gate_ops++;
}

void qpu_z(int q)
{
    if (q < 0 || q >= QPU_NUM_QUBITS) return;
    int mask = 1 << q;
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        if (i & mask) {
            s_psi[i].re = -s_psi[i].re;
            s_psi[i].im = -s_psi[i].im;
        }
    }
    s_gate_ops++;
}

void qpu_cnot(int ctrl, int tgt)
{
    if (ctrl < 0 || ctrl >= QPU_NUM_QUBITS) return;
    if (tgt < 0 || tgt >= QPU_NUM_QUBITS || ctrl == tgt) return;
    int cmask = 1 << ctrl;
    int tmask = 1 << tgt;
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        if ((i & cmask) && ((i & tmask) == 0)) {
            int j = i | tmask;
            q16_complex_t tmp = s_psi[i];
            s_psi[i] = s_psi[j];
            s_psi[j] = tmp;
        }
    }
    s_gate_ops++;
}

void qpu_cz(int ctrl, int tgt)
{
    if (ctrl < 0 || ctrl >= QPU_NUM_QUBITS) return;
    if (tgt < 0 || tgt >= QPU_NUM_QUBITS || ctrl == tgt) return;
    int mask = (1 << ctrl) | (1 << tgt);
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        if ((i & mask) == mask) {
            s_psi[i].re = -s_psi[i].re;
            s_psi[i].im = -s_psi[i].im;
        }
    }
    s_gate_ops++;
}

void qpu_bell_pair(void)
{
    qpu_reset();
    qpu_h(0);
    qpu_cnot(0, 1);
}

void qpu_ghz3(void)
{
    qpu_reset();
    qpu_h(0);
    qpu_cnot(0, 1);
    qpu_cnot(0, 2);
}

static uint64_t state_norm_sq_q32(int idx)
{
    if (idx < 0 || idx >= QPU_NUM_STATES) return 0;
    int64_t r = s_psi[idx].re;
    int64_t im = s_psi[idx].im;
    return (uint64_t)(r * r + im * im); /* 1.0 => 2^32 = 4294967296 */
}

uint32_t qpu_prob_permil(int state_idx)
{
    uint64_t n2 = state_norm_sq_q32(state_idx);
    uint64_t permil = (n2 * 1000ULL + 2147483648ULL) >> 32;
    if (permil > 1000ULL) permil = 1000ULL;
    return (uint32_t)permil;
}

uint32_t qpu_prob_pct(int state_idx)
{
    uint64_t n2 = state_norm_sq_q32(state_idx);
    uint64_t pct = (n2 * 100ULL + 2147483648ULL) >> 32;
    if (pct > 100ULL) pct = 100ULL;
    return (uint32_t)pct;
}

int qpu_measure_all(void)
{
    uint64_t weights[QPU_NUM_STATES];
    uint64_t total = 0;
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        weights[i] = state_norm_sq_q32(i) >> 12; /* Tasmayi onlemek icin Q20 olcegi */
        total += weights[i];
    }

    int chosen = 0;
    if (total > 0) {
        uint64_t pick = qpu_entropy_u64() % total;
        uint64_t acc = 0;
        for (int i = 0; i < QPU_NUM_STATES; i++) {
            acc += weights[i];
            if (pick < acc) {
                chosen = i;
                break;
            }
        }
    }

    /* Dalga fonksiyonu cokusu: |chosen> */
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        s_psi[i].re = (i == chosen) ? Q16_ONE : 0;
        s_psi[i].im = 0;
    }
    s_last_measured = chosen;
    return chosen;
}

int qpu_last_measurement(void)
{
    return s_last_measured;
}

uint32_t qpu_gate_ops(void)
{
    return s_gate_ops;
}

int qpu_bb84_selftest(int n_photons, int eavesdrop, int *sifted_out, int *qber_pct_out)
{
    if (n_photons < 8) n_photons = 8;
    if (n_photons > 256) n_photons = 256;

    /* Mevcut QPU durumunu koru */
    q16_complex_t backup[QPU_NUM_STATES];
    int backup_meas = s_last_measured;
    for (int i = 0; i < QPU_NUM_STATES; i++) backup[i] = s_psi[i];

    int sifted = 0;
    int errors = 0;

    for (int k = 0; k < n_photons; k++) {
        uint64_t r = qpu_entropy_u64();
        int alice_bit   = (int)(r & 1ULL);
        int alice_basis = (int)((r >> 1) & 1ULL); /* 0: Z (+), 1: X (x) */
        int bob_basis   = (int)((r >> 2) & 1ULL);
        int eve_basis   = (int)((r >> 3) & 1ULL);

        /* Alice fotonu hazirlar */
        qpu_reset();
        if (alice_bit) qpu_x(0);
        if (alice_basis) qpu_h(0);

        /* Eve araya girip olcer ve yeniden gonderirse */
        if (eavesdrop) {
            if (eve_basis) qpu_h(0);
            int eve_meas = qpu_measure_all() & 1;
            qpu_reset();
            if (eve_meas) qpu_x(0);
            if (eve_basis) qpu_h(0);
        }

        /* Bob kendi bazinda olcer */
        if (bob_basis) qpu_h(0);
        int bob_bit = qpu_measure_all() & 1;

        if (alice_basis == bob_basis) {
            sifted++;
            if (alice_bit != bob_bit)
                errors++;
        }
    }

    /* Onceki QPU durumunu geri yukle */
    for (int i = 0; i < QPU_NUM_STATES; i++) s_psi[i] = backup[i];
    s_last_measured = backup_meas;

    int qber = (sifted > 0) ? ((errors * 100) / sifted) : 0;
    if (sifted_out) *sifted_out = sifted;
    if (qber_pct_out) *qber_pct_out = qber;
    return (qber <= 11) ? 0 : -1; /* %11 Shor-Preskill guvenlik esigi */
}

void qpu_print_state(void)
{
    uart_puts("\r\n--- Quantro QPU 4-Kubit Durum Vektoru (Q16.16) ---\r\n");
    for (int i = 0; i < QPU_NUM_STATES; i++) {
        uint32_t pm = qpu_prob_permil(i);
        if (pm == 0 && s_psi[i].re == 0 && s_psi[i].im == 0)
            continue;
        char bits[5];
        bits[0] = (i & 8) ? '1' : '0';
        bits[1] = (i & 4) ? '1' : '0';
        bits[2] = (i & 2) ? '1' : '0';
        bits[3] = (i & 1) ? '1' : '0';
        bits[4] = '\0';
        uart_printf("  |%s> (#%2d): Olasilik = %u.%u%%  [re=%d, im=%d]\r\n",
                    bits, i, pm / 10, pm % 10, s_psi[i].re, s_psi[i].im);
    }
    uart_printf("  Toplam Kapi Islemi: %u | Son Olcum: |%d>\r\n",
                s_gate_ops, s_last_measured);
    uart_puts("--------------------------------------------------\r\n");
}
