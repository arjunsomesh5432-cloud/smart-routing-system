# Smart Routing System

A smart route optimization system that visualizes routing algorithms on a real-world interactive map.

## Project Purpose
The Smart Routing System is designed to provide an interactive, visual medium for understanding and analyzing different pathfinding and routing algorithms on real-world map data. By projecting graph search processes onto actual street grids, it bridges the gap between abstract computer science theory and concrete real-world navigation.

## Features
- **Real-World Map Graphing**: Utilizes real-world street maps and coordinates.
- **Interactive Source & Destination Selection**: Easily place the source and destination nodes anywhere on the interactive map.
- **Dynamic Radius Selector**: Define the graph search area boundary radius.
- **Speed & Playback Controls**: Control the visual animation speed and step through the routing progression manually.
- **Multiple Search Algorithms**: Visual support for major routing algorithms:
  - **A* Search**: Uses heuristics to find the shortest path efficiently.
  - **Dijkstra's Algorithm**: Guarantees the shortest path on weighted graphs.
  - **Greedy Best-First Search**: Explores nodes closest to the destination.
  - **Bidirectional Search**: Runs searches from both source and destination simultaneously to meet in the middle.
- **Visual Color Customizer**: Personalize search path, route, and node colors.

## Technologies Used
- **Frontend**: React (JS/JSX)
- **Mapping & Visualization**: Deck.gl, react-map-gl, Maplibre GL
- **UI Components**: Material UI (MUI), mui-color-input
- **Styling**: Sass / Scss

## Installation
1. Clone this repository to your local machine.
2. Navigate into the repository folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Usage
1. **Define Search Area**: Left-click on the map to set the **Source Node** (green marker) and map boundary radius.
2. **Set Target**: Right-click (or use mobile toggles) within the green boundary to place the **Destination Node** (red marker).
3. **Select Algorithm**: Open the settings panel on the left to choose a routing algorithm (A*, Dijkstra, Greedy, or Bidirectional).
4. **Run Simulation**: Click the green **Play** button at the top to visualize the algorithm search process.
5. **Analyze Results**: Once completed, use the playback slider or arrow keys to step through the steps, or click **Clear Path** to run a new search.
