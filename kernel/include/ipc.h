#ifndef QUANTRO_IPC_H
#define QUANTRO_IPC_H

#include "types.h"

#define IPC_MSG_MAX_LEN 128
#define IPC_QUEUE_SIZE   32

typedef struct {
    uint32_t sender_pid;
    uint32_t target_pid;
    uint32_t msg_type;
    uint32_t len;
    char     data[IPC_MSG_MAX_LEN];
} ipc_message_t;

void ipc_init(void);
int  ipc_send(uint32_t sender, uint32_t target, uint32_t type, const char *data, size_t len);
int  ipc_recv(uint32_t target, ipc_message_t *out_msg);
int  ipc_available(uint32_t target);

#endif /* QUANTRO_IPC_H */
