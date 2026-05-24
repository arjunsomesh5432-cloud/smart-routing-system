import { useEffect, useRef } from "react";

const ALGO_LABELS = {
    astar:         "A* Algorithm",
    greedy:        "Greedy Algorithm",
    dijkstra:      "Dijkstra's Algorithm",
    bidirectional: "Bidirectional Search",
};

/**
 * Haversine distance in km between two lat/lon points.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Walk the parent chain from endNode back to startNode,
 * summing up real-world haversine distances in km.
 */
function computePathLengthKm(endNode) {
    let len = 0;
    let node = endNode;
    while (node?.parent && node.parent !== node) {
        len += haversineKm(
            node.latitude,    node.longitude,
            node.parent.latitude, node.parent.longitude
        );
        node = node.parent;
    }
    return len;
}

/**
 * Count how many nodes in the graph have been visited.
 */
function countExplored(graph) {
    if (!graph?.nodes) return 0;
    let count = 0;
    for (const node of graph.nodes.values()) {
        if (node.visited) count++;
    }
    return count;
}

/**
 * ResultsCard — shown bottom-left when animationEnded is true.
 *
 * Props:
 *   visible      {boolean}            whether to display the card
 *   algorithm    {string}             key like "astar"
 *   graphRef     {React.MutableRefObject} ref wrapping PathfindingState singleton
 */
export default function ResultsCard({ visible, algorithm, graphRef }) {
    const statsRef = useRef(null);

    // Compute stats once when card becomes visible
    useEffect(() => {
        if (!visible) {
            statsRef.current = null;
            return;
        }
        const state = graphRef.current;
        const explored  = countExplored(state.graph);
        const pathKm    = computePathLengthKm(state.endNode);
        const timeMin   = (pathKm / 50) * 60;

        statsRef.current = { explored, pathKm, timeMin };
    }, [visible]);

    if (!visible || !statsRef.current) return null;

    const { explored, pathKm, timeMin } = statsRef.current;

    const timeDisplay =
        timeMin < 1
            ? `${Math.round(timeMin * 60)}s`
            : timeMin < 60
            ? `${timeMin.toFixed(1)} min`
            : `${(timeMin / 60).toFixed(1)} hr`;

    return (
        <div className="results-card">
            <div className="results-card__header">
                <span className="results-card__icon">✦</span>
                <span className="results-card__title">Route Found</span>
            </div>

            <div className="results-card__algo">
                {ALGO_LABELS[algorithm] ?? algorithm}
            </div>

            <div className="results-card__divider" />

            <div className="results-card__stats">
                <Stat
                    icon="⬡"
                    label="Nodes Explored"
                    value={explored.toLocaleString()}
                />
                <Stat
                    icon="↗"
                    label="Path Length"
                    value={`${pathKm.toFixed(2)} km`}
                />
                <Stat
                    icon="⏱"
                    label="Est. Travel Time"
                    value={timeDisplay}
                    sub="at 50 km/h"
                />
            </div>
        </div>
    );
}

function Stat({ icon, label, value, sub }) {
    return (
        <div className="results-card__stat">
            <span className="results-card__stat-icon">{icon}</span>
            <div className="results-card__stat-body">
                <span className="results-card__stat-label">{label}</span>
                <span className="results-card__stat-value">{value}</span>
                {sub && <span className="results-card__stat-sub">{sub}</span>}
            </div>
        </div>
    );
}
