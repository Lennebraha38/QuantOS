#ifndef QUANTRO_SYSCALL_H
#define QUANTRO_SYSCALL_H

#include "types.h"
#include "traps.h"

#define SYS_YIELD        1
#define SYS_WRITE        2
#define SYS_READ         3
#define SYS_QPU_RUN      4
#define SYS_ASTRO_SOLVE  5
#define SYS_JARVIS_CMD   6
#define SYS_GET_TICKS    7

void syscall_init(void);
int64_t handle_syscall(trap_frame_t *tf);

#endif /* QUANTRO_SYSCALL_H */
