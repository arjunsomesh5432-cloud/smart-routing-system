import DeckGL from "@deck.gl/react";
import { Map as MapGL } from "react-map-gl";
import maplibregl from "maplibre-gl";
import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "deck.gl";
import { TripsLayer } from "@deck.gl/geo-layers";
import { createGeoJSONCircle } from "../helpers";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { getBoundingBoxFromPolygon, getMapGraph, getNearestNode } from "../services/MapService";
import PathfindingState from "../models/PathfindingState";
import Interface from "./Interface";
import ResultsCard from "./ResultsCard";
import { INITIAL_COLORS, INITIAL_VIEW_STATE, MAP_STYLE } from "../config";
import useSmoothStateChange from "../hooks/useSmoothStateChange";

function Map() {
    const [startNode, setStartNode] = useState(null);
    const [endNode, setEndNode] = useState(null);
    const [selectionRadius, setSelectionRadius] = useState([]);
    const [tripsData, setTripsData] = useState([]);
    const [started, setStarted] = useState();
    const [time, setTime] = useState(0);
    const [animationEnded, setAnimationEnded] = useState(false);
    const [playbackOn, setPlaybackOn] = useState(false);
    const [playbackDirection, setPlaybackDirection] = useState(1);
    const [fadeRadiusReverse, setFadeRadiusReverse] = useState(false);
    const [cinematic, setCinematic] = useState(false);
    const [placeEnd, setPlaceEnd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({ algorithm: "astar", radius: 4, speed: 5 });
    const [colors, setColors] = useState(INITIAL_COLORS);
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
    const ui = useRef();
    const fadeRadius = useRef();
    const requestRef = useRef();
    const previousTimeRef = useRef();
    const timer = useRef(0);
    const waypoints = useRef([]);
    const state = useRef(new PathfindingState());
    const traceNode = useRef(null);
    const traceNode2 = useRef(null);

    // Keep refs to latest values for use inside rAF callbacks (avoids stale closures
    // without adding them to useEffect dep arrays)
    const startedRef = useRef(started);
    const animationEndedRef = useRef(animationEnded);
    const playbackOnRef = useRef(playbackOn);
    const playbackDirectionRef = useRef(playbackDirection);
    const settingsRef = useRef(settings);
    const timeRef = useRef(time);

    useEffect(() => { startedRef.current = started; }, [started]);
    useEffect(() => { animationEndedRef.current = animationEnded; }, [animationEnded]);
    useEffect(() => { playbackOnRef.current = playbackOn; }, [playbackOn]);
    useEffect(() => { playbackDirectionRef.current = playbackDirection; }, [playbackDirection]);
    useEffect(() => { settingsRef.current = settings; }, [settings]);
    useEffect(() => { timeRef.current = time; }, [time]);

    const selectionRadiusOpacity = useSmoothStateChange(0, 0, 1, 400, fadeRadius.current, fadeRadiusReverse);

    const clearPath = useCallback(() => {
        setStarted(false);
        setTripsData([]);
        setTime(0);
        state.current.reset();
        waypoints.current = [];
        timer.current = 0;
        previousTimeRef.current = null;
        traceNode.current = null;
        traceNode2.current = null;
        setAnimationEnded(false);
    }, []);

    const mapClick = useCallback(async (e, info, radius = null) => {
        if (startedRef.current && !animationEndedRef.current) return;

        setFadeRadiusReverse(false);
        fadeRadius.current = true;
        clearPath();

        // Place end node
        if (info.rightButton || placeEnd) {
            if (e.layer?.id !== "selection-radius") {
                ui.current.showSnack("Please select a point inside the radius.", "info");
                return;
            }

            if (loading) {
                ui.current.showSnack("Please wait for all data to load.", "info");
                return;
            }

            const loadingHandle = setTimeout(() => {
                setLoading(true);
            }, 300);

            const node = await getNearestNode(e.coordinate[1], e.coordinate[0]);
            if (!node) {
                ui.current.showSnack("No path was found in the vicinity, please try another location.");
                clearTimeout(loadingHandle);
                setLoading(false);
                return;
            }

            const realEndNode = state.current.getNode(node.id);
            setEndNode(node);

            clearTimeout(loadingHandle);
            setLoading(false);

            if (!realEndNode) {
                ui.current.showSnack("An error occurred. Please try again.");
                return;
            }
            state.current.endNode = realEndNode;

            return;
        }

        const loadingHandle = setTimeout(() => {
            setLoading(true);
        }, 300);

        // Fetch nearest node
        const node = await getNearestNode(e.coordinate[1], e.coordinate[0]);
        if (!node) {
            ui.current.showSnack("No path was found in the vicinity, please try another location.");
            clearTimeout(loadingHandle);
            setLoading(false);
            return;
        }

        setStartNode(node);
        setEndNode(null);
        const circle = createGeoJSONCircle([node.lon, node.lat], radius ?? settingsRef.current.radius);
        setSelectionRadius([{ contour: circle }]);

        // Fetch nodes inside the radius
        getMapGraph(getBoundingBoxFromPolygon(circle), node.id).then(graph => {
            state.current.graph = graph;
            clearPath();
            clearTimeout(loadingHandle);
            setLoading(false);
        });
    }, [clearPath, loading, placeEnd]);

    // Start new pathfinding animation
    const startPathfinding = useCallback(() => {
        setFadeRadiusReverse(true);
        setTimeout(() => {
            clearPath();
            state.current.start(settingsRef.current.algorithm);
            setStarted(true);
        }, 400);
    }, [clearPath]);

    // Start or pause already running animation
    const toggleAnimation = useCallback((loop = true, direction = 1) => {
        if (timeRef.current === 0 && !animationEndedRef.current) return;
        setPlaybackDirection(direction);
        if (animationEndedRef.current) {
            if (loop && timeRef.current >= timer.current) {
                setTime(0);
            }
            setStarted(true);
            setPlaybackOn(prev => !prev);
            return;
        }
        setStarted(prev => !prev);
        if (startedRef.current) {
            previousTimeRef.current = null;
        }
    }, []);

    // Add new node to the waypoints property and increment timer
    function updateWaypoints(node, refererNode, color = "path", timeMultiplier = 1) {
        if (!node || !refererNode) return;
        const distance = Math.hypot(node.longitude - refererNode.longitude, node.latitude - refererNode.latitude);
        const timeAdd = distance * 50000 * timeMultiplier;

        waypoints.current = [...waypoints.current,
            {
                path: [[refererNode.longitude, refererNode.latitude], [node.longitude, node.latitude]],
                timestamps: [timer.current, timer.current + timeAdd],
                color,
            }
        ];

        timer.current += timeAdd;
        setTripsData(() => waypoints.current);
    }

    // Progress animation by one step — reads from refs to avoid stale closures
    function animateStep(newTime) {
        const updatedNodes = state.current.nextStep();
        for (const updatedNode of updatedNodes) {
            updateWaypoints(updatedNode, updatedNode.referer);
        }

        const curAnimationEnded = animationEndedRef.current;
        const curTime = timeRef.current;
        const curPlaybackOn = playbackOnRef.current;
        const curPlaybackDirection = playbackDirectionRef.current;
        const curSpeed = settingsRef.current.speed;
        const curAlgorithm = settingsRef.current.algorithm;

        // Found end but waiting for animation to end
        if (state.current.finished && !curAnimationEnded) {
            if (curAlgorithm === "bidirectional") {
                if (!traceNode.current) traceNode.current = updatedNodes[0];
                const parentNode = traceNode.current.parent;
                updateWaypoints(parentNode, traceNode.current, "route", Math.max(Math.log2(curSpeed), 1));
                traceNode.current = parentNode ?? traceNode.current;

                if (!traceNode2.current) {
                    traceNode2.current = updatedNodes[0];
                    traceNode2.current.parent = traceNode2.current.prevParent;
                }
                const parentNode2 = traceNode2.current.parent;
                updateWaypoints(parentNode2, traceNode2.current, "route", Math.max(Math.log2(curSpeed), 1));
                traceNode2.current = parentNode2 ?? traceNode2.current;
                setAnimationEnded(curTime >= timer.current && parentNode == null && parentNode2 == null);
            }
            else {
                if (!traceNode.current) traceNode.current = state.current.endNode;
                const parentNode = traceNode.current.parent;
                updateWaypoints(parentNode, traceNode.current, "route", Math.max(Math.log2(curSpeed), 1));
                traceNode.current = parentNode ?? traceNode.current;
                setAnimationEnded(curTime >= timer.current && parentNode == null);
            }
        }

        // Animation progress
        if (previousTimeRef.current != null && !curAnimationEnded) {
            const deltaTime = newTime - previousTimeRef.current;
            setTime(prevTime => (prevTime + deltaTime * curPlaybackDirection));
        }

        // Playback progress
        if (previousTimeRef.current != null && curAnimationEnded && curPlaybackOn) {
            const deltaTime = newTime - previousTimeRef.current;
            if (curTime >= timer.current && curPlaybackDirection !== -1) {
                setPlaybackOn(false);
            }
            setTime(prevTime => (Math.max(Math.min(prevTime + deltaTime * 2 * curPlaybackDirection, timer.current), 0)));
        }
    }

    // Animation callback
    function animate(newTime) {
        for (let i = 0; i < settingsRef.current.speed; i++) {
            animateStep(newTime);
        }

        previousTimeRef.current = newTime;
        requestRef.current = requestAnimationFrame(animate);
    }

    function changeLocation(location) {
        setViewState(prev => ({ ...prev, longitude: location.longitude, latitude: location.latitude, zoom: 13, transitionDuration: 1, transitionInterpolator: new FlyToInterpolator() }));
    }

    const changeSettings = useCallback((newSettings) => {
        setSettings(newSettings);
        setColors(prevColors => {
            const items = { settings: newSettings, colors: prevColors };
            localStorage.setItem("path_settings", JSON.stringify(items));
            return prevColors;
        });
    }, []);

    const changeColors = useCallback((newColors) => {
        setColors(newColors);
        setSettings(prevSettings => {
            const items = { settings: prevSettings, colors: newColors };
            localStorage.setItem("path_settings", JSON.stringify(items));
            return prevSettings;
        });
    }, []);

    const changeAlgorithm = useCallback((algorithm) => {
        clearPath();
        setSettings(prev => {
            const newSettings = { ...prev, algorithm };
            const items = { settings: newSettings, colors: colors };
            localStorage.setItem("path_settings", JSON.stringify(items));
            return newSettings;
        });
    }, [clearPath, colors]);

    const changeRadius = useCallback((radius) => {
        setSettings(prev => {
            const newSettings = { ...prev, radius };
            const items = { settings: newSettings, colors: colors };
            localStorage.setItem("path_settings", JSON.stringify(items));
            return newSettings;
        });
        if (startNode) {
            mapClick({ coordinate: [startNode.lon, startNode.lat] }, {}, radius);
        }
    }, [startNode, mapClick, colors]);

    // Animation loop: only restart when started/animationEnded/playbackOn change.
    // Do NOT include `time` — the rAF loop reads it via ref to avoid constant restarts.
    useEffect(() => {
        if (!started) return;
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [started, animationEnded, playbackOn]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(res => {
            changeLocation(res.coords);
        });

        const saved = localStorage.getItem("path_settings");
        if (!saved) return;
        const items = JSON.parse(saved);

        setSettings(items.settings);
        setColors(items.colors);
    }, []);

    // Memoize layer data arrays to prevent deck.gl re-evaluation on unrelated state changes
    const startEndData = useMemo(() => [
        ...(startNode ? [{ coordinates: [startNode.lon, startNode.lat], color: colors.startNodeFill, lineColor: colors.startNodeBorder }] : []),
        ...(endNode ? [{ coordinates: [endNode.lon, endNode.lat], color: colors.endNodeFill, lineColor: colors.endNodeBorder }] : []),
    ], [startNode, endNode, colors.startNodeFill, colors.startNodeBorder, colors.endNodeFill, colors.endNodeBorder]);

    return (
        <>
            <div onContextMenu={(e) => { e.preventDefault(); }}>
                <DeckGL
                    viewState={viewState}
                    onViewStateChange={({ viewState: vs }) => setViewState(vs)}
                    controller={{ doubleClickZoom: false, keyboard: false }}
                    onClick={mapClick}
                >
                    <PolygonLayer
                        id={"selection-radius"}
                        data={selectionRadius}
                        pickable={true}
                        stroked={true}
                        getPolygon={d => d.contour}
                        getFillColor={[80, 210, 0, 10]}
                        getLineColor={[9, 142, 46, 175]}
                        getLineWidth={3}
                        opacity={selectionRadiusOpacity}
                    />
                    <TripsLayer
                        id={"pathfinding-layer"}
                        data={tripsData}
                        opacity={1}
                        widthMinPixels={3}
                        widthMaxPixels={5}
                        fadeTrail={false}
                        currentTime={time}
                        getColor={d => colors[d.color]}
                        updateTriggers={{
                            getColor: [colors.path, colors.route]
                        }}
                    />
                    <ScatterplotLayer
                        id="start-end-points"
                        data={startEndData}
                        pickable={true}
                        opacity={1}
                        stroked={true}
                        filled={true}
                        radiusScale={1}
                        radiusMinPixels={7}
                        radiusMaxPixels={20}
                        lineWidthMinPixels={1}
                        lineWidthMaxPixels={3}
                        getPosition={d => d.coordinates}
                        getFillColor={d => d.color}
                        getLineColor={d => d.lineColor}
                    />
                    <MapGL
                        reuseMaps mapLib={maplibregl}
                        mapStyle={MAP_STYLE}
                        doubleClickZoom={false}
                    />
                </DeckGL>
            </div>
            <Interface
                ref={ui}
                canStart={startNode && endNode}
                started={started}
                animationEnded={animationEnded}
                playbackOn={playbackOn}
                time={time}
                startPathfinding={startPathfinding}
                toggleAnimation={toggleAnimation}
                clearPath={clearPath}
                timeChanged={setTime}
                changeLocation={changeLocation}
                maxTime={timer.current}
                settings={settings}
                setSettings={changeSettings}
                changeAlgorithm={changeAlgorithm}
                colors={colors}
                setColors={changeColors}
                loading={loading}
                cinematic={cinematic}
                setCinematic={setCinematic}
                placeEnd={placeEnd}
                setPlaceEnd={setPlaceEnd}
                changeRadius={changeRadius}
            />
            <ResultsCard
                visible={animationEnded}
                algorithm={settings.algorithm}
                graphRef={state}
            />
            <div className="attrib-container"><summary className="maplibregl-ctrl-attrib-button" title="Toggle attribution" aria-label="Toggle attribution"></summary><div className="maplibregl-ctrl-attrib-inner">© <a href="https://carto.com/about-carto/" target="_blank" rel="noopener">CARTO</a>, © <a href="http://www.openstreetmap.org/about/" target="_blank">OpenStreetMap</a> contributors</div></div>
        </>
    );
}

export default Map;