/*
 * QuantOS - PL011 UART surucusu (QEMU virt)
 */
#ifndef QUANTOS_UART_H
#define QUANTOS_UART_H

#include "types.h"

void uart_init(uintptr_t base);
void uart_putc(char c);
void uart_puts(const char *s);
void uart_printf(const char *fmt, ...);
int  uart_rx_ready(void);
char uart_getc(void);

#endif /* QUANTOS_UART_H */
