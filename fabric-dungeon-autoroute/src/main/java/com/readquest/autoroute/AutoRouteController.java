package com.readquest.autoroute;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.text.Text;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.math.Vec3d;

import java.util.Collections;
import java.util.List;

public class AutoRouteController {
    private final MinecraftClient client;
    private final RouteStore routeStore;
    private boolean running;
    private int currentIndex;
    private int pauseTicksRemaining;

    public AutoRouteController(MinecraftClient client, RouteStore routeStore) {
        this.client = client;
        this.routeStore = routeStore;
    }

    public void tick() {
        ClientPlayerEntity player = client.player;
        if (player == null || client.world == null) {
            stop(false);
            return;
        }

        if (pauseTicksRemaining > 0) {
            pauseTicksRemaining--;
            if (pauseTicksRemaining <= 0) {
                currentIndex++;
                if (!isRouteFinished()) {
                    sendMessage(Text.literal("[AutoRoute] Advancing to " + currentWaypoint().label));
                }
            }
            return;
        }

        if (!running) {
            releaseMovementKeys();
            return;
        }

        List<Waypoint> route = routeStore.getActiveWaypoints();
        if (route.isEmpty()) {
            sendMessage(Text.literal("[AutoRoute] No waypoints are loaded for the active route."));
            stop(true);
            return;
        }

        if (isRouteFinished()) {
            if (routeStore.config().loop) {
                currentIndex = 0;
                sendMessage(Text.literal("[AutoRoute] Looping route " + routeStore.getActiveRouteName()));
            } else {
                sendMessage(Text.literal("[AutoRoute] Route complete."));
                stop(true);
                return;
            }
        }

        Waypoint waypoint = route.get(currentIndex);
        Vec3d playerPos = player.getPos();
        Vec3d target = new Vec3d(waypoint.x, waypoint.y, waypoint.z);
        Vec3d delta = target.subtract(playerPos);
        double horizontalDistance = Math.sqrt(delta.x * delta.x + delta.z * delta.z);
        double verticalDistance = Math.abs(delta.y);

        if (horizontalDistance <= waypoint.radius && verticalDistance <= 1.25D) {
            releaseMovementKeys();
            if (waypoint.pauseTicks > 0) {
                pauseTicksRemaining = waypoint.pauseTicks;
                sendMessage(Text.literal("[AutoRoute] Reached " + waypoint.label + ", pausing for " + waypoint.pauseTicks + " ticks."));
            } else {
                currentIndex++;
            }
            return;
        }

        float yaw = (float) (Math.toDegrees(Math.atan2(delta.z, delta.x)) - 90.0D);
        player.setYaw(MathHelper.wrapDegrees(yaw));
        player.setPitch(waypoint.lookPitch != null ? waypoint.lookPitch : 10.0F);

        client.options.forwardKey.setPressed(true);
        client.options.sprintKey.setPressed(waypoint.sprint || horizontalDistance > 3.0D);
        client.options.jumpKey.setPressed(waypoint.jump || (delta.y > 0.6D && player.isOnGround()));
    }

    public void start() {
        if (routeStore.getActiveWaypoints().isEmpty()) {
            sendMessage(Text.literal("[AutoRoute] The active route has no waypoints."));
            return;
        }
        running = true;
        pauseTicksRemaining = 0;
        currentIndex = Math.min(currentIndex, Math.max(routeStore.getActiveWaypoints().size() - 1, 0));
        sendMessage(Text.literal("[AutoRoute] Started route " + routeStore.getActiveRouteName()));
    }

    public void stop(boolean resetIndex) {
        running = false;
        pauseTicksRemaining = 0;
        releaseMovementKeys();
        if (resetIndex) {
            currentIndex = 0;
        }
    }

    public void selectRoute(String routeName) {
        routeStore.setActiveRoute(routeName);
        currentIndex = 0;
        pauseTicksRemaining = 0;
        running = false;
        releaseMovementKeys();
        sendMessage(Text.literal("[AutoRoute] Selected route " + routeName));
    }

    public boolean isRunning() {
        return running;
    }

    public int getCurrentIndex() {
        return currentIndex;
    }

    public int getPauseTicksRemaining() {
        return pauseTicksRemaining;
    }

    public String getStatusLine() {
        List<Waypoint> route = routeStore.getActiveWaypoints();
        int shownIndex = route.isEmpty() ? 0 : Math.min(currentIndex + 1, route.size());
        String currentLabel = currentWaypoint() != null ? currentWaypoint().label : "none";
        return "Route=" + routeStore.getActiveRouteName()
            + " Step=" + shownIndex + "/" + route.size()
            + " Running=" + running
            + " Loop=" + routeStore.config().loop
            + " Target=" + currentLabel;
    }

    public Waypoint currentWaypoint() {
        List<Waypoint> route = routeStore.getActiveWaypoints();
        if (currentIndex < 0 || currentIndex >= route.size()) {
            return null;
        }
        return route.get(currentIndex);
    }

    public List<String> routeNames() {
        return Collections.unmodifiableList(routeStore.routeNames());
    }

    private boolean isRouteFinished() {
        return currentIndex >= routeStore.getActiveWaypoints().size();
    }

    private void releaseMovementKeys() {
        client.options.forwardKey.setPressed(false);
        client.options.sprintKey.setPressed(false);
        client.options.jumpKey.setPressed(false);
    }

    private void sendMessage(Text text) {
        ClientPlayerEntity player = client.player;
        if (player != null) {
            player.sendMessage(text, false);
        }
    }
}
