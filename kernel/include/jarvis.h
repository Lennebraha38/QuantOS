/*
 * QuantOS — Cekirdek Ici J.A.R.V.I.S. Sesli ve Bilimsel Yapay Zeka Asistani
 * Quantro AR-GE | PL011 UART -> Host TTS Ses Koprusu ([JARVIS_SPEAK]: protokolu)
 */
#ifndef QUANTOS_JARVIS_H
#define QUANTOS_JARVIS_H

#include "types.h"

void        jarvis_init(void);
void        jarvis_speak(const char *text);
void        jarvis_execute(const char *cmd, char *reply, size_t max_len);
const char *jarvis_last_cmd(void);
const char *jarvis_last_reply(void);
uint32_t    jarvis_query_count(void);

#endif /* QUANTOS_JARVIS_H */
