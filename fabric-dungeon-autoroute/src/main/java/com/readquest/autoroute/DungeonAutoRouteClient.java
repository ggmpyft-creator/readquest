package com.readquest.autoroute;

import com.mojang.brigadier.arguments.BoolArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.context.CommandContext;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.text.Text;

import java.io.IOException;
import java.util.List;

public class DungeonAutoRouteClient implements ClientModInitializer {
    private final RouteStore routeStore = new RouteStore();
    private AutoRouteController controller;

    @Override
    public void onInitializeClient() {
        MinecraftClient client = MinecraftClient.getInstance();
        controller = new AutoRouteController(client, routeStore);

        try {
            routeStore.load();
        } catch (IOException exception) {
            sendMessage("[AutoRoute] Failed to load config: " + exception.getMessage());
        }

        ClientTickEvents.END_CLIENT_TICK.register(ignored -> controller.tick());
        HudRenderCallback.EVENT.register(this::renderHud);
        ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> dispatcher.register(
            ClientCommandManager.literal("autoroute")
                .then(ClientCommandManager.literal("list")
                    .executes(context -> {
                        List<String> names = controller.routeNames();
                        reply(context, "Routes: " + String.join(", ", names));
                        return 1;
                    }))
                .then(ClientCommandManager.literal("route")
                    .then(ClientCommandManager.argument("name", StringArgumentType.string())
                        .suggests((context, builder) -> {
                            controller.routeNames().forEach(builder::suggest);
                            return builder.buildFuture();
                        })
                        .executes(context -> selectRoute(context, StringArgumentType.getString(context, "name")))))
                .then(ClientCommandManager.literal("start")
                    .executes(context -> {
                        controller.start();
                        return 1;
                    }))
                .then(ClientCommandManager.literal("stop")
                    .executes(context -> {
                        controller.stop(true);
                        reply(context, "Stopped.");
                        return 1;
                    }))
                .then(ClientCommandManager.literal("reload")
                    .executes(context -> {
                        routeStore.load();
                        controller.stop(true);
                        reply(context, "Reloaded routes from " + routeStore.configPath());
                        return 1;
                    }))
                .then(ClientCommandManager.literal("loop")
                    .then(ClientCommandManager.argument("value", BoolArgumentType.bool())
                        .executes(context -> {
                            boolean value = BoolArgumentType.getBool(context, "value");
                            routeStore.setLoop(value);
                            reply(context, "Loop set to " + value);
                            return 1;
                        })))
                .then(ClientCommandManager.literal("status")
                    .executes(context -> {
                        reply(context, controller.getStatusLine());
                        return 1;
                    }))
        ));
    }

    private int selectRoute(CommandContext<FabricClientCommandSource> context, String routeName) {
        try {
            controller.selectRoute(routeName);
            reply(context, "Selected route " + routeName);
            return 1;
        } catch (IllegalArgumentException exception) {
            reply(context, exception.getMessage());
            return 0;
        }
    }

    private void renderHud(DrawContext context, float tickDelta) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (controller == null || client == null || client.textRenderer == null || client.options == null) {
            return;
        }

        if (!client.options.hudHidden) {
            String status = controller.getStatusLine();
            context.drawText(client.textRenderer, Text.literal(status), 8, 8, 0xFFFFFF, true);
            if (controller.getPauseTicksRemaining() > 0) {
                context.drawText(client.textRenderer, Text.literal("Pause=" + controller.getPauseTicksRemaining()), 8, 18, 0x55FFFF, true);
            }
        }
    }

    private void reply(CommandContext<FabricClientCommandSource> context, String message) {
        context.getSource().sendFeedback(Text.literal("[AutoRoute] " + message));
    }

    private void sendMessage(String message) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player != null) {
            client.player.sendMessage(Text.literal(message), false);
        }
    }
}
