package com.budgetsystem.app;

import android.content.Context;
import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import me.leolin.shortcutbadger.ShortcutBadger;

/**
 * Plugin para gerenciar badges (contador de notificações) no ícone do app Android
 * Usa a biblioteca ShortcutBadger que suporta vários launchers
 */
@CapacitorPlugin(name = "Badge")
public class BadgePlugin extends Plugin {

    /**
     * Define o número mostrado no badge
     * @param call Capacitor call com parametro "count" (int)
     */
    @PluginMethod
    public void setBadge(PluginCall call) {
        Integer count = call.getInt("count");
        
        if (count == null) {
            call.reject("Parâmetro 'count' é obrigatório");
            return;
        }

        Context context = getContext();
        boolean success = ShortcutBadger.applyCount(context, count);

        if (success) {
            call.resolve();
        } else {
            call.reject("Launcher não suporta badges ou falha ao definir badge");
        }
    }

    /**
     * Remove o badge do ícone
     */
    @PluginMethod
    public void clearBadge(PluginCall call) {
        Context context = getContext();
        boolean success = ShortcutBadger.removeCount(context);

        if (success) {
            call.resolve();
        } else {
            call.reject("Falha ao limpar badge");
        }
    }

    /**
     * Verifica se o launcher atual suporta badges
     */
    @PluginMethod
    public void isBadgeSupported(PluginCall call) {
        Context context = getContext();
        boolean supported = ShortcutBadger.isBadgeCounterSupported(context);
        
        call.resolve(new com.getcapacitor.JSObject().put("supported", supported));
    }
}
