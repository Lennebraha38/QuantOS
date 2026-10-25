/*
 * QuantOS — Windows 11 DWM + Quantro AR-GE + J.A.R.V.I.S. Grafik Motoru
 */
#ifndef QUANTOS_GUI_H
#define QUANTOS_GUI_H

#include "types.h"

enum {
    APP_NONE     = 0,
    APP_JARVIS   = 1,
    APP_QLAB     = 2,
    APP_ASTRO    = 3,
    APP_EXPLORER = 4,
    APP_TERMINAL = 5,
    APP_SETTINGS = 6,
    APP_CALC     = 7
};

enum {
    THEME_INK_COPPER  = 0, /* Quantro AR-GE Varsayilan: Grafit & Bakir (#0E0F12 / #D1925C) */
    THEME_JARVIS_HOLO = 1, /* J.A.R.V.I.S. Holografik Mavi (#07131D / #38BDF8) */
    THEME_WIN11_MICA  = 2  /* Windows 11 Koyu Mica (#1C1F26 / #60CDFF) */
};

void gui_init(void);
void gui_show_visionary_boot(void);
void gui_redraw_all(void);
void gui_tick(int64_t boot_time, uint64_t uptime_seconds);
void gui_panic(const char *message);

/* Pencere, Ucar Menu ve Tema Yonetimi */
void gui_open_app(int app_id);
void gui_toggle_app(int app_id);
void gui_close_active_app(void);
void gui_toggle_start_menu(void);
void gui_toggle_settings_window(void);
void gui_toggle_quick_settings(void);
void gui_toggle_notifications(void);
void gui_set_theme(int theme_id);
int  gui_get_theme(void);

/* Etkilesimli Fare ve Imlec Olaylari */
void gui_handle_mouse(int x, int y, int btn);
void gui_move_cursor(int x, int y);
int  gui_get_cursor_x(void);
int  gui_get_cursor_y(void);

#endif /* QUANTOS_GUI_H */
