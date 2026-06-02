package com.moneymanager;

import org.cef.browser.CefBrowser;
import org.cef.browser.CefFrame;
import org.cef.callback.CefContextMenuParams;
import org.cef.callback.CefContextMenuParams.EditStateFlags;
import org.cef.callback.CefMenuModel;
import org.cef.callback.CefMenuModel.MenuId;
import org.cef.handler.CefContextMenuHandlerAdapter;

/** Menu contestuale (tasto destro) personalizzato per l'app.
 *  Sostituisce il menu Chromium di default — inutile in una SPA: Back/Forward
 *  sempre disabilitati, Print stampa l'intera pagina web, View source non serve.
 *
 *  Costruisce un menu contestuale:
 *   - nei campi di testo: comandi di editing (annulla, taglia, copia, incolla…)
 *   - su testo selezionato: copia
 *   - sempre: ricarica, zoom e strumenti sviluppatore. */
public class ContextMenuHandler extends CefContextMenuHandlerAdapter {

    // ── Comandi custom (oltre il range riservato a Chromium) ──
    private static final int CMD_ZOOM_IN    = MenuId.MENU_ID_USER_FIRST + 1;
    private static final int CMD_ZOOM_OUT   = MenuId.MENU_ID_USER_FIRST + 2;
    private static final int CMD_ZOOM_RESET = MenuId.MENU_ID_USER_FIRST + 3;
    private static final int CMD_DEVTOOLS   = MenuId.MENU_ID_USER_FIRST + 4;

    private static final double ZOOM_STEP = 0.5;

    @Override
    public void onBeforeContextMenu(CefBrowser browser, CefFrame frame,
                                    CefContextMenuParams params, CefMenuModel model) {
        model.clear();

        String selection = params.getSelectionText();
        boolean hasSelection = selection != null && !selection.isEmpty();

        if (params.isEditable()) {
            // ── Editing di campi di testo ──
            int flags = params.getEditStateFlags();
            model.addItem(MenuId.MENU_ID_UNDO, "Annulla");
            model.setEnabled(MenuId.MENU_ID_UNDO, (flags & EditStateFlags.CM_EDITFLAG_CAN_UNDO) != 0);
            model.addItem(MenuId.MENU_ID_REDO, "Ripristina");
            model.setEnabled(MenuId.MENU_ID_REDO, (flags & EditStateFlags.CM_EDITFLAG_CAN_REDO) != 0);
            model.addSeparator();
            model.addItem(MenuId.MENU_ID_CUT, "Taglia");
            model.setEnabled(MenuId.MENU_ID_CUT, (flags & EditStateFlags.CM_EDITFLAG_CAN_CUT) != 0);
            model.addItem(MenuId.MENU_ID_COPY, "Copia");
            model.setEnabled(MenuId.MENU_ID_COPY, (flags & EditStateFlags.CM_EDITFLAG_CAN_COPY) != 0);
            model.addItem(MenuId.MENU_ID_PASTE, "Incolla");
            model.setEnabled(MenuId.MENU_ID_PASTE, (flags & EditStateFlags.CM_EDITFLAG_CAN_PASTE) != 0);
            model.addItem(MenuId.MENU_ID_DELETE, "Elimina");
            model.setEnabled(MenuId.MENU_ID_DELETE, (flags & EditStateFlags.CM_EDITFLAG_CAN_DELETE) != 0);
            model.addSeparator();
            model.addItem(MenuId.MENU_ID_SELECT_ALL, "Seleziona tutto");
            model.setEnabled(MenuId.MENU_ID_SELECT_ALL, (flags & EditStateFlags.CM_EDITFLAG_CAN_SELECT_ALL) != 0);
            model.addSeparator();
        } else if (hasSelection) {
            // ── Testo selezionato (tabelle, valori) ──
            model.addItem(MenuId.MENU_ID_COPY, "Copia");
            model.addSeparator();
        }

        // ── Comandi sempre disponibili ──
        model.addItem(MenuId.MENU_ID_RELOAD, "Ricarica");
        model.addSeparator();
        model.addItem(CMD_ZOOM_IN, "Aumenta zoom");
        model.addItem(CMD_ZOOM_OUT, "Riduci zoom");
        model.addItem(CMD_ZOOM_RESET, "Zoom predefinito");
        model.addSeparator();
        model.addItem(CMD_DEVTOOLS, "Strumenti sviluppatore");
    }

    @Override
    public boolean onContextMenuCommand(CefBrowser browser, CefFrame frame,
                                        CefContextMenuParams params, int commandId, int eventFlags) {
        switch (commandId) {
            case CMD_ZOOM_IN    -> browser.setZoomLevel(browser.getZoomLevel() + ZOOM_STEP);
            case CMD_ZOOM_OUT   -> browser.setZoomLevel(browser.getZoomLevel() - ZOOM_STEP);
            case CMD_ZOOM_RESET -> browser.setZoomLevel(0);
            case CMD_DEVTOOLS   -> browser.openDevTools();
            default -> { return false; } // comandi nativi (copia, incolla…): li gestisce Chromium
        }
        return true;
    }
}
