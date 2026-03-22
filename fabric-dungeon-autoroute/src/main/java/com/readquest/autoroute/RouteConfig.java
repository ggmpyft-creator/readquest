package com.readquest.autoroute;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class RouteConfig {
    public boolean loop = false;
    public String activeRoute = "catacombs_floor_1";
    public Map<String, List<Waypoint>> routes = new LinkedHashMap<>();

    public static RouteConfig createDefault() {
        RouteConfig config = new RouteConfig();

        List<Waypoint> floorOne = new ArrayList<>();
        floorOne.add(waypoint("Spawn", 5.5D, 70.0D, 5.5D, 1.2D, 0, true, false, 10.0F));
        floorOne.add(waypoint("Blood Door", 24.5D, 70.0D, -18.5D, 1.4D, 0, true, false, 10.0F));
        floorOne.add(waypoint("Trap Entrance", 40.5D, 67.0D, -36.5D, 1.4D, 12, true, true, 12.0F));
        floorOne.add(waypoint("Boss Door", 63.5D, 69.0D, -58.5D, 1.6D, 0, true, false, 10.0F));
        config.routes.put("catacombs_floor_1", floorOne);

        List<Waypoint> floorThree = new ArrayList<>();
        floorThree.add(waypoint("Spawn", 8.5D, 72.0D, 6.5D, 1.2D, 0, true, false, 10.0F));
        floorThree.add(waypoint("Left Clear", -16.5D, 72.0D, -20.5D, 1.3D, 0, true, false, 10.0F));
        floorThree.add(waypoint("Puzzle Hall", -34.5D, 70.0D, -42.5D, 1.3D, 8, true, false, 12.0F));
        floorThree.add(waypoint("Boss Prep", -58.5D, 68.0D, -60.5D, 1.5D, 0, true, false, 10.0F));
        config.routes.put("catacombs_floor_3", floorThree);

        return config;
    }

    private static Waypoint waypoint(String label, double x, double y, double z, double radius, int pauseTicks,
                                     boolean sprint, boolean jump, Float lookPitch) {
        Waypoint waypoint = new Waypoint();
        waypoint.label = label;
        waypoint.x = x;
        waypoint.y = y;
        waypoint.z = z;
        waypoint.radius = radius;
        waypoint.pauseTicks = pauseTicks;
        waypoint.sprint = sprint;
        waypoint.jump = jump;
        waypoint.lookPitch = lookPitch;
        return waypoint;
    }
}
