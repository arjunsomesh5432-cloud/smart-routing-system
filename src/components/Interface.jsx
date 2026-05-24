import { Button, IconButton, Typography, Snackbar, Alert, CircularProgress, Fade, Tooltip, Drawer, MenuItem, Select, InputLabel, FormControl, Menu, Backdrop, Stepper, Step, StepLabel, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { MuiColorInput } from "mui-color-input";
import { PlayArrow, Settings, Movie, Pause, Replay, ExpandMore } from "@mui/icons-material";
import Slider from "./Slider";
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { INITIAL_COLORS, LOCATIONS } from "../config";
import { arrayToRgb, rgbToArray } from "../helpers";

const Interface = forwardRef(({ canStart, started, animationEnded, playbackOn, time, maxTime, settings, colors, loading, timeChanged, cinematic, placeEnd, changeRadius, changeAlgorithm, setPlaceEnd, setCinematic, setSettings, setColors, startPathfinding, toggleAnimation, clearPath, changeLocation }, ref) => {
    const [sidebar, setSidebar] = useState(false);
    const [snack, setSnack] = useState({
        open: false,
        message: "",
        type: "error",
    });
    const [showTutorial, setShowTutorial] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [helper, setHelper] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const menuOpen = Boolean(menuAnchor);
    const helperTime = useRef(4800);
    const rightDown = useRef(false);
    const leftDown = useRef(false);

    // Expose showSnack to parent from ref
    useImperativeHandle(ref, () => ({
        showSnack(message, type = "error") {
            setSnack({ open: true, message, type });
        },
    }));

    function closeSnack() {
        setSnack({ ...snack, open: false });
    }

    function closeHelper() {
        setHelper(false);
    }

    function handleTutorialChange(direction) {
        if (activeStep >= 2 && direction > 0) {
            setShowTutorial(false);
            return;
        }

        setActiveStep(Math.max(activeStep + direction, 0));
    }

    // Start pathfinding or toggle playback
    function handlePlay() {
        if (!canStart) return;
        if (!started && time === 0) {
            startPathfinding();
            return;
        }
        toggleAnimation();
    }

    function closeMenu() {
        setMenuAnchor(null);
    }

    // Show cinematic mode helper
    useEffect(() => {
        if (!cinematic) return;
        setHelper(true);
        setTimeout(() => {
            helperTime.current = 2500;
        }, 200);
    }, [cinematic]);

    useEffect(() => {
        if (localStorage.getItem("path_sawtutorial")) return;
        setShowTutorial(true);
        localStorage.setItem("path_sawtutorial", true);
    }, []);

    // Keyboard shortcuts — use addEventListener so handler is properly cleaned up
    // and not reassigned on every render, preventing stale closure accumulation.
    useEffect(() => {
        const onKeyDown = e => {
            if (e.code === "ArrowRight" && !rightDown.current && !leftDown.current && (!started || animationEnded)) {
                rightDown.current = true;
                toggleAnimation(false, 1);
            }
            else if (e.code === "ArrowLeft" && !leftDown.current && !rightDown.current && animationEnded) {
                leftDown.current = true;
                toggleAnimation(false, -1);
            }
        };

        const onKeyUp = e => {
            if (e.code === "Escape") setCinematic(false);
            else if (e.code === "Space") {
                e.preventDefault();
                if (!canStart) return;
                if (!started && time === 0) {
                    startPathfinding();
                    return;
                }
                toggleAnimation();
            }
            else if (e.code === "ArrowRight" && rightDown.current) {
                rightDown.current = false;
                toggleAnimation(false, 1);
            }
            else if (e.code === "ArrowLeft" && animationEnded && leftDown.current) {
                leftDown.current = false;
                toggleAnimation(false, 1);
            }
            else if (e.code === "KeyR" && (animationEnded || !started)) clearPath();
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [started, animationEnded, toggleAnimation, setCinematic, clearPath, canStart, startPathfinding, time]);

    return (
        <>
            <div className={`nav-top ${cinematic ? "cinematic" : ""}`}>
                <div className="side slider-container">
                    <Typography id="playback-slider" gutterBottom>
                        Animation playback
                    </Typography>
                    <Slider disabled={!animationEnded} value={animationEnded ? time : maxTime} min={animationEnded ? 0 : -1} max={maxTime} onChange={(e) => { timeChanged(Number(e.target.value)); }} className="slider" aria-labelledby="playback-slider" />
                </div>
                <IconButton disabled={!canStart} onClick={handlePlay} style={{ backgroundColor: "#46B780", width: 60, height: 60 }} size="large">
                    {(!started || animationEnded && !playbackOn)
                        ? <PlayArrow style={{ color: "#fff", width: 26, height: 26 }} fontSize="inherit" />
                        : <Pause style={{ color: "#fff", width: 26, height: 26 }} fontSize="inherit" />
                    }
                </IconButton>
                <div className="side">
                    <Button disabled={!animationEnded && started} onClick={clearPath} style={{ color: "#fff", backgroundColor: "#404156", paddingInline: 30, paddingBlock: 7 }} variant="contained">Clear path</Button>
                </div>
            </div>

            <div className={`nav-right ${cinematic ? "cinematic" : ""}`}>
                <Tooltip title="Open settings">
                    <IconButton onClick={() => { setSidebar(true); }} style={{ backgroundColor: "#2A2B37", width: 36, height: 36 }} size="large">
                        <Settings style={{ color: "#fff", width: 24, height: 24 }} fontSize="inherit" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Cinematic mode">
                    <IconButton className="btn-cinematic" onClick={() => { setCinematic(!cinematic); }} style={{ backgroundColor: "#2A2B37", width: 36, height: 36 }} size="large">
                        <Movie style={{ color: "#fff", width: 24, height: 24 }} fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            </div>

            <div className="loader-container">
                <Fade
                    in={loading}
                    style={{
                        transitionDelay: loading ? "50ms" : "0ms",
                    }}
                    unmountOnExit
                >
                    <CircularProgress color="inherit" />
                </Fade>
            </div>

            <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                open={snack.open}
                autoHideDuration={4000}
                onClose={closeSnack}>
                <Alert
                    onClose={closeSnack}
                    severity={snack.type}
                    style={{ width: "100%", color: "#fff" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>

            <Snackbar
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
                open={helper}
                autoHideDuration={helperTime.current}
                onClose={closeHelper}
            >
                <div className="cinematic-alert">
                    <Typography fontSize="18px"><b>Cinematic mode</b></Typography>
                    <Typography>Use keyboard shortcuts to control animation</Typography>
                    <Typography>Press <b>Escape</b> to exit</Typography>
                </div>
            </Snackbar>

            <div className="mobile-controls">
                <Button onClick={() => { setPlaceEnd(!placeEnd); }} style={{ color: "#fff", backgroundColor: "#404156", paddingInline: 30, paddingBlock: 7 }} variant="contained">
                    {placeEnd ? "placing destination node" : "placing source node"}
                </Button>
            </div>

            <Backdrop
                open={showTutorial}
                onClick={e => { if (e.target.classList.contains("backdrop")) setShowTutorial(false); }}
                className="backdrop"
            >
                <div className="tutorial-container">
                    <Stepper activeStep={activeStep}>
                        <Step>
                            <StepLabel>Basic controls</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Playback controls</StepLabel>
                        </Step>
                        <Step>
                            <StepLabel>Changing settings</StepLabel>
                        </Step>
                    </Stepper>
                    <div className="content">
                        <h1>Smart Routing System</h1>
                        {activeStep === 0 && <div>
                            <p>
                                <b>Controls:</b> <br />
                                <b>Left button:</b> Place source node <br />
                                <b>Right button:</b> Place destination node <br />
                            </p>
                            <p>The destination node must be placed within the shown radius.</p>
                            <video className="video" autoPlay muted loop>
                                <source src="./videos/tutorial1.mp4" type="video/mp4" />
                            </video>
                        </div>}
                        {activeStep === 1 && <div>
                            <p>
                                To start the visualization, press the <b>Start Button</b> or press <b>Space</b>.<br />
                                A playback feature is available after the algorithm ends.
                            </p>
                            <video className="video" autoPlay muted loop>
                                <source src="./videos/tutorial2.mp4" type="video/mp4" />
                            </video>
                        </div>}
                        {activeStep === 2 && <div>
                            <p>
                                You can customize the settings of the animation in the <b>Settings Sidebar</b>. <br />
                                Try to keep the area radius only as large as you need it to be. <br />
                                Anything above <b>10km</b> is considered experimental, if you run into performance issues, stop the animation and clear the path.
                            </p>
                            <video className="video" autoPlay muted loop>
                                <source src="./videos/tutorial3.mp4" type="video/mp4" />
                            </video>
                        </div>}
                    </div>
                    <div className="controls">
                        <Button onClick={() => { setShowTutorial(false); }}
                            className="close" variant="outlined" style={{ borderColor: "#9f9f9f", color: "#9f9f9f", paddingInline: 15 }}
                        >
                            Close
                        </Button>
                        <Button onClick={() => { handleTutorialChange(-1); }}
                            variant="outlined" style={{ borderColor: "#9f9f9f", color: "#9f9f9f", paddingInline: 18 }}
                        >
                            Back
                        </Button>
                        <Button onClick={() => { handleTutorialChange(1); }}
                            variant="contained" style={{ backgroundColor: "#46B780", color: "#fff", paddingInline: 30, fontWeight: "bold" }}
                        >
                            {activeStep >= 2 ? "Finish" : "Next"}
                        </Button>
                    </div>
                </div>
            </Backdrop>

            <Drawer
                className={`side-drawer ${cinematic ? "cinematic" : ""}`}
                anchor="left"
                open={sidebar}
                onClose={() => { setSidebar(false); }}
            >
                <div className="sidebar-container">

                    <div>
                        <p className="sidebar-section-label">Algorithm</p>
                        <div className="algo-btn-group">
                            {[
                                { value: "astar", label: "A* Algorithm" },
                                { value: "greedy", label: "Greedy Algorithm" },
                                { value: "dijkstra", label: "Dijkstra's Algorithm" },
                                { value: "bidirectional", label: "Bidirectional Search" },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    className={`algo-btn${settings.algorithm === value ? " algo-btn--active" : ""}`}
                                    onClick={() => { changeAlgorithm(value); }}
                                    disabled={!animationEnded && started}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Button
                            id="locations-button"
                            aria-controls={menuOpen ? "locations-menu" : undefined}
                            aria-haspopup="true"
                            aria-expanded={menuOpen ? "true" : undefined}
                            onClick={(e) => { setMenuAnchor(e.currentTarget); }}
                            variant="contained"
                            disableElevation
                            style={{ backgroundColor: "#404156", color: "#fff", textTransform: "none", fontSize: 16, paddingBlock: 8, justifyContent: "start" }}
                        >
                            Locations
                        </Button>
                        <Menu
                            id="locations-menu"
                            anchorEl={menuAnchor}
                            open={menuOpen}
                            onClose={() => { setMenuAnchor(null); }}
                            MenuListProps={{
                                "aria-labelledby": "locations-button",
                                sx: {
                                    backgroundColor: "#404156"
                                }
                            }}
                            anchorOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
                        >
                            {LOCATIONS.map(location =>
                                <MenuItem key={location.name} onClick={() => {
                                    closeMenu();
                                    changeLocation(location);
                                }}>{location.name}</MenuItem>
                            )}
                        </Menu>
                    </div>

                    <div className="side slider-container">
                        <Typography id="speed-slider" >
                            Animation speed
                        </Typography>
                        <Slider min={1} max={30} value={settings.speed} onChange={e => { setSettings({ ...settings, speed: Number(e.target.value) }); }} className="slider" aria-labelledby="speed-slider" style={{ marginBottom: 1 }} />
                    </div>

                    <Accordion className="advanced-settings-accordion" style={{ backgroundColor: "transparent", color: "#fff", boxShadow: "none" }} disableGutters sx={{ '&::before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMore style={{ color: "#6B7280" }} />} style={{ padding: 0, minHeight: "unset" }} sx={{ '& .MuiAccordionSummary-content': { margin: "10px 0" } }}>
                            <Typography className="advanced-settings-title">
                                ADVANCED SETTINGS
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails style={{ padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>

                            <div className="side slider-container custom-slider-container">
                                <Typography id="area-slider" className="slider-label">
                                    Area radius: {settings.radius}km ({(settings.radius / 1.609).toFixed(1)}mi)
                                </Typography>
                                <Slider disabled={started && !animationEnded} min={2} max={20} step={1} value={settings.radius} onChangeCommited={() => { changeRadius(settings.radius); }} onChange={e => { setSettings({ ...settings, radius: Number(e.target.value) }); }} className="slider custom-slider" aria-labelledby="area-slider" style={{ marginBottom: 1 }}
                                    marks={[
                                        {
                                            value: 2,
                                            label: "2km"
                                        },
                                        {
                                            value: 20,
                                            label: "20km"
                                        }
                                    ]}
                                />
                            </div>

                            <div className="styles-container">
                                <Typography className="sub-header">
                                    STYLES
                                </Typography>

                                <div className="color-picker-row">
                                    <Typography id="start-fill-label" className="color-picker-label">
                                        Source node fill color
                                    </Typography>
                                    <div className="color-container">
                                        <MuiColorInput className="color-picker-input" value={arrayToRgb(colors.startNodeFill)} onChange={v => { setColors({ ...colors, startNodeFill: rgbToArray(v) }); }} aria-labelledby="start-fill-label" />
                                        <IconButton className="reset-btn" onClick={() => { setColors({ ...colors, startNodeFill: INITIAL_COLORS.startNodeFill }); }} size="small">
                                            <Replay fontSize="inherit" />
                                        </IconButton>
                                    </div>
                                </div>

                                <div className="color-picker-row">
                                    <Typography id="start-border-label" className="color-picker-label">
                                        Source node border color
                                    </Typography>
                                    <div className="color-container">
                                        <MuiColorInput className="color-picker-input" value={arrayToRgb(colors.startNodeBorder)} onChange={v => { setColors({ ...colors, startNodeBorder: rgbToArray(v) }); }} aria-labelledby="start-border-label" />
                                        <IconButton className="reset-btn" onClick={() => { setColors({ ...colors, startNodeBorder: INITIAL_COLORS.startNodeBorder }); }} size="small">
                                            <Replay fontSize="inherit" />
                                        </IconButton>
                                    </div>
                                </div>

                                <div className="color-picker-row">
                                    <Typography id="end-fill-label" className="color-picker-label">
                                        Destination node fill color
                                    </Typography>
                                    <div className="color-container">
                                        <MuiColorInput className="color-picker-input" value={arrayToRgb(colors.endNodeFill)} onChange={v => { setColors({ ...colors, endNodeFill: rgbToArray(v) }); }} aria-labelledby="end-fill-label" />
                                        <IconButton className="reset-btn" onClick={() => { setColors({ ...colors, endNodeFill: INITIAL_COLORS.endNodeFill }); }} size="small">
                                            <Replay fontSize="inherit" />
                                        </IconButton>
                                    </div>
                                </div>

                                <div className="color-picker-row">
                                    <Typography id="end-border-label" className="color-picker-label">
                                        Destination node border color
                                    </Typography>
                                    <div className="color-container">
                                        <MuiColorInput className="color-picker-input" value={arrayToRgb(colors.endNodeBorder)} onChange={v => { setColors({ ...colors, endNodeBorder: rgbToArray(v) }); }} aria-labelledby="end-border-label" />
                                        <IconButton className="reset-btn" onClick={() => { setColors({ ...colors, endNodeBorder: INITIAL_COLORS.endNodeBorder }); }} size="small">
                                            <Replay fontSize="inherit" />
                                        </IconButton>
                                    </div>
                                </div>

                                <div className="color-picker-row">
                                    <Typography id="path-label" className="color-picker-label">
                                        Path color
                                    </Typography>
                                    <div className="color-container">
                                        <MuiColorInput className="color-picker-input" value={arrayToRgb(colors.path)} onChange={v => { setColors({ ...colors, path: rgbToArray(v) }); }} aria-labelledby="path-label" />
                                        <IconButton className="reset-btn" onClick={() => { setColors({ ...colors, path: INITIAL_COLORS.path }); }} size="small">
                                            <Replay fontSize="inherit" />
                                        </IconButton>
                                    </div>
                                </div>

                                <div className="color-picker-row">
                                    <Typography id="route-label" className="color-picker-label">
                                        Shortest route color
                                    </Typography>
                                    <div className="color-container">
                                        <MuiColorInput className="color-picker-input" value={arrayToRgb(colors.route)} onChange={v => { setColors({ ...colors, route: rgbToArray(v) }); }} aria-labelledby="route-label" />
                                        <IconButton className="reset-btn" onClick={() => { setColors({ ...colors, route: INITIAL_COLORS.route }); }} size="small">
                                            <Replay fontSize="inherit" />
                                        </IconButton>
                                    </div>
                                </div>
                            </div>

                            <div className="shortcuts-container">
                                <Typography className="sub-header">
                                    SHORTCUTS
                                </Typography>

                                <div className="shortcut">
                                    <p className="key-badge">SPACE</p>
                                    <p>Start/Stop animation</p>
                                </div>
                                <div className="shortcut">
                                    <p className="key-badge">R</p>
                                    <p>Clear path</p>
                                </div>
                                <div className="shortcut">
                                    <p className="key-badge">Arrows</p>
                                    <p>Animation playback</p>
                                </div>
                                <button className="show-tutorial-btn" onClick={() => { setActiveStep(0); setShowTutorial(true); }}>
                                    SHOW TUTORIAL
                                </button>
                            </div>
                        </AccordionDetails>
                    </Accordion>
                </div>
            </Drawer>
        </>
    );
});

Interface.displayName = "Interface";

export default Interface;
