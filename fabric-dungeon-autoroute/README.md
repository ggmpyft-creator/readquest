# Fabric Dungeon AutoRoute

This is a client-side Fabric mod project that builds into a `.jar` you can drop into Prism Launcher's `mods` folder.

## What it does
- Loads waypoint routes from `config/dungeon-autoroute/routes.json`.
- Lets you start/stop and switch routes with Fabric client commands.
- Automatically turns the player, walks forward, sprints, jumps, and pauses at configured waypoints.
- Draws a simple HUD with the selected route and current waypoint progress.

## Build
Use Java 17+ and run this from the mod folder:

```bash
gradle build
```

### Step-by-step build guide
1. Open a terminal.
2. Change into the mod folder:
   ```bash
   cd fabric-dungeon-autoroute
   ```
3. Make sure Java 17 or newer is installed:
   ```bash
   java -version
   ```
4. Run the build:
   ```bash
   gradle build
   ```
5. Wait for Gradle to finish downloading dependencies and compiling the mod.
6. Open the `build/libs` folder.
7. Find the finished jar:
   - `dungeon-autoroute-1.0.0.jar`
8. Copy that jar into your Prism Launcher instance's `mods` folder.

If the build succeeds, the full jar path from the repository root is:

- `fabric-dungeon-autoroute/build/libs/dungeon-autoroute-1.0.0.jar`

If you change the mod version later, the filename will become `dungeon-autoroute-<new version>.jar`.

## Prism Launcher install
1. Create or open a Minecraft **1.20.4 Fabric** instance in Prism Launcher.
2. Build this mod.
3. Copy `fabric-dungeon-autoroute/build/libs/dungeon-autoroute-1.0.0.jar` into that instance's `mods/` folder.
4. Launch the game once so the config file is created.
5. Edit `config/dungeon-autoroute/routes.json` with your own dungeon coordinates.
6. Relaunch the game or run `/autoroute reload`.

## Quick start in-game
1. Run `/autoroute list` to see the available route names.
2. Run `/autoroute route <name>` to select one, for example `/autoroute route catacombs_floor_1`.
3. Stand at the starting position for that route.
4. Run `/autoroute start` to begin walking.
5. Use `/autoroute stop` any time you want to cancel.
6. Use `/autoroute status` to confirm the active route, current step, and loop state.

## Commands
- `/autoroute list`
- `/autoroute route <name>`
- `/autoroute start`
- `/autoroute stop`
- `/autoroute reload`
- `/autoroute loop <true|false>`
- `/autoroute status`

## Route file format
The mod writes an example config to `config/dungeon-autoroute/routes.json` if one does not exist. A checked-in example is also included at `config/routes.example.json`.

Each waypoint supports:
- `label`: HUD/debug name
- `x`, `y`, `z`: target coordinates
- `radius`: completion radius before moving to the next waypoint
- `pauseTicks`: ticks to wait after reaching the waypoint
- `sprint`: whether sprint should be held while moving to this waypoint
- `jump`: whether jump should be held while moving to this waypoint
- `lookPitch`: optional pitch override while traveling to the waypoint

## Notes
- This mod follows explicit waypoints; it does **not** do world pathfinding.
- Replace the generated example routes with your real private-server layout.
