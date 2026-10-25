/*
 * QuantOS — Surecler Arasi Iletisim ve Mesaj Halka Tamponu (IPC)
 * QPU, Astrofizik ve J.A.R.V.I.S. gorevleri arasinda kilitlenmesiz mesaj iletimi.
 */
#include "ipc.h"
#include "kernel.h"
#include "uart.h"

static ipc_message_t s_ipc_queue[IPC_QUEUE_SIZE];
static uint32_t      s_head = 0;
static uint32_t      s_tail = 0;
static uint32_t      s_count = 0;

void ipc_init(void)
{
    s_head = 0;
    s_tail = 0;
    s_count = 0;
    memset(s_ipc_queue, 0, sizeof(s_ipc_queue));
    uart_puts("[ipc] Mesaj halka tamponu ve surecler arasi kanal hazir.\r\n");
}

int ipc_send(uint32_t sender, uint32_t target, uint32_t type, const char *data, size_t len)
{
    if (s_count >= IPC_QUEUE_SIZE) {
        return -1; /* Tampon dolu */
    }

    ipc_message_t *slot = &s_ipc_queue[s_tail];
    slot->sender_pid = sender;
    slot->target_pid = target;
    slot->msg_type   = type;

    size_t copy_len = len < (IPC_MSG_MAX_LEN - 1) ? len : (IPC_MSG_MAX_LEN - 1);
    if (data && copy_len > 0) {
        memcpy(slot->data, data, copy_len);
    }
    slot->data[copy_len] = '\0';
    slot->len = (uint32_t)copy_len;

    s_tail = (s_tail + 1) % IPC_QUEUE_SIZE;
    s_count++;
    return 0;
}

int ipc_recv(uint32_t target, ipc_message_t *out_msg)
{
    if (!out_msg || s_count == 0) {
        return -1;
    }

    /* Target filtreli veya ilk mesaji al */
    for (uint32_t i = 0; i < s_count; i++) {
        uint32_t idx = (s_head + i) % IPC_QUEUE_SIZE;
        if (target == 0 || s_ipc_queue[idx].target_pid == target) {
            *out_msg = s_ipc_queue[idx];
            /* Mesaji kuyruktan cikar */
            if (idx == s_head) {
                s_head = (s_head + 1) % IPC_QUEUE_SIZE;
                s_count--;
            }
            return 0;
        }
    }

    return -1;
}

int ipc_available(uint32_t target)
{
    if (s_count == 0) return 0;
    if (target == 0) return (int)s_count;

    int matches = 0;
    for (uint32_t i = 0; i < s_count; i++) {
        uint32_t idx = (s_head + i) % IPC_QUEUE_SIZE;
        if (s_ipc_queue[idx].target_pid == target) {
            matches++;
        }
    }
    return matches;
}
