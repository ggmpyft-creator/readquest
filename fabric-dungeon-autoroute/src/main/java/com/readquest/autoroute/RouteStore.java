package com.readquest.autoroute;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.MinecraftClient;
import net.minecraft.text.Text;

import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class RouteStore {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private final Path configPath = FabricLoader.getInstance().getConfigDir().resolve("dungeon-autoroute").resolve("routes.json");
    private RouteConfig config = RouteConfig.createDefault();

    public void load() throws IOException {
        Files.createDirectories(configPath.getParent());
        if (Files.notExists(configPath)) {
            config = RouteConfig.createDefault();
            save();
            return;
        }

        try (Reader reader = Files.newBufferedReader(configPath)) {
            RouteConfig loaded = GSON.fromJson(reader, RouteConfig.class);
            if (loaded == null || loaded.routes == null || loaded.routes.isEmpty()) {
                config = RouteConfig.createDefault();
                save();
                return;
            }
            config = loaded;
        } catch (JsonParseException exception) {
            config = RouteConfig.createDefault();
            save();
            sendClientMessage("[AutoRoute] Invalid JSON config, restored defaults.");
        }

        ensureActiveRoute();
    }

    public void save() throws IOException {
        Files.createDirectories(configPath.getParent());
        try (Writer writer = Files.newBufferedWriter(configPath)) {
            GSON.toJson(config, writer);
        }
    }

    public RouteConfig config() {
        ensureActiveRoute();
        return config;
    }

    public List<Waypoint> getActiveWaypoints() {
        ensureActiveRoute();
        return config.routes.getOrDefault(config.activeRoute, List.of());
    }

    public String getActiveRouteName() {
        ensureActiveRoute();
        return config.activeRoute;
    }

    public void setActiveRoute(String routeName) {
        if (!config.routes.containsKey(routeName)) {
            throw new IllegalArgumentException("Unknown route: " + routeName);
        }
        config.activeRoute = routeName;
        try {
            save();
        } catch (IOException ignored) {
        }
    }

    public void setLoop(boolean loop) {
        config.loop = loop;
        try {
            save();
        } catch (IOException ignored) {
        }
    }

    public List<String> routeNames() {
        return new ArrayList<>(config.routes.keySet());
    }

    public Path configPath() {
        return configPath;
    }

    private void ensureActiveRoute() {
        if (config.routes == null || config.routes.isEmpty()) {
            config = RouteConfig.createDefault();
        }
        if (config.activeRoute == null || !config.routes.containsKey(config.activeRoute)) {
            for (Map.Entry<String, List<Waypoint>> entry : config.routes.entrySet()) {
                config.activeRoute = entry.getKey();
                break;
            }
        }
    }

    private void sendClientMessage(String message) {
        MinecraftClient client = MinecraftClient.getInstance();
        if (client.player != null) {
            client.player.sendMessage(Text.literal(message), false);
        }
    }
}
