/*
 * QuantOS — AArch64 Sistem Cagrilari Yurutucusu (Syscall Handler)
 * svc #0 ile cagrildiginda x8 sistem cagri numarasini, x0..x5 argumanlari isler.
 */
#include "syscall.h"
#include "uart.h"
#include "kernel.h"
#include "proc.h"
#include "qpu.h"
#include "astro.h"
#include "jarvis.h"

void syscall_init(void)
{
    uart_puts("[syscall] AArch64 Syscall tablosu ve svc #0 yonlendiricisi devrede.\r\n");
}

int64_t handle_syscall(trap_frame_t *tf)
{
    if (!tf) return -1;

    uint64_t nr = tf->regs[8]; /* x8 = syscall number */
    uint64_t a0 = tf->regs[0];
    uint64_t a1 = tf->regs[1];
    (void)tf->regs[2];

    int64_t ret = 0;

    switch (nr) {
    case SYS_YIELD:
        proc_tick();
        ret = 0;
        break;

    case SYS_WRITE: {
        const char *buf = (const char *)a0;
        size_t len = (size_t)a1;
        if (buf && len > 0) {
            for (size_t i = 0; i < len; i++) {
                uart_putc(buf[i]);
            }
            ret = (int64_t)len;
        } else {
            ret = -1;
        }
        break;
    }

    case SYS_READ: {
        char *buf = (char *)a0;
        size_t max_len = (size_t)a1;
        if (buf && max_len > 0) {
            size_t read_bytes = 0;
            while (read_bytes < max_len && uart_rx_ready()) {
                buf[read_bytes++] = uart_getc();
            }
            ret = (int64_t)read_bytes;
        } else {
            ret = -1;
        }
        break;
    }

    case SYS_QPU_RUN: {
        /* a0: devre tipi (0: Bell, 1: GHZ-3, 2: BB84 test) */
        if (a0 == 0) {
            qpu_bell_pair();
            ret = (int64_t)qpu_measure_all();
        } else if (a0 == 1) {
            qpu_ghz3();
            ret = (int64_t)qpu_measure_all();
        } else {
            int sifted = 0, qber = 0;
            ret = (int64_t)qpu_bb84_selftest(64, 0, &sifted, &qber);
        }
        break;
    }

    case SYS_ASTRO_SOLVE: {
        /* a0: kutle M_sun -> Schwarzschild yaricapi dondur (metre cinsinden) */
        uint64_t m_solar = a0 ? a0 : 10;
        ret = (int64_t)astro_schwarzschild_m(m_solar);
        break;
    }

    case SYS_JARVIS_CMD: {
        const char *cmd = (const char *)a0;
        if (cmd) {
            char reply[128];
            jarvis_execute(cmd, reply, sizeof(reply));
            ret = 0;
        } else {
            ret = -1;
        }
        break;
    }

    case SYS_GET_TICKS:
        ret = (int64_t)timer_ticks();
        break;

    default:
        uart_printf("[syscall] Bilinmeyen sistem cagrisi: %llu\r\n", (unsigned long long)nr);
        ret = -38; /* ENOSYS */
        break;
    }

    tf->regs[0] = (uint64_t)ret; /* return value in x0 */
    return ret;
}
