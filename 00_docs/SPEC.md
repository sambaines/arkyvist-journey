# Arkyvist Map Tool — Architecture Spec
**Project:** Arkyvist Map Tool
**Version:** v0.2
**Last Updated:** 2026-04-20
**Status:** Draft

---

## ⚠️ Claude: Read This First
This is the implementation contract for the map tool.
Architectural decisions here take precedence over in-session suggestions.
If you believe something here is wrong or outdated, flag it — don't silently work around it.
Feature-level detail may be broken out into `/00_docs/specs/[feature].md` as the project grows.

---

## 1. Product Overview

A public-facing, client-side web tool that allows anyone to upload a custom map image and plan journeys across it. The primary audience is tabletop RPG players (D&D and similar) and world-building enthusiasts who want to calculate realistic travel times across fictional maps.

**Hosted at:** `journey.arkyvist.com` (separate Netlify site, own deploy pipeline)
**Deployment:** Netlify
**Authentication:** None — fully public tool

### Core User Flow
1. User lands on the tool — sees an empty state with upload prompt
2. User uploads a map image — dimensions are inferred automatically
3. User calibrates scale using two known points on the map (or sets manually)
4. User creates a named route and places waypoints by clicking the map
5. User assigns terrain type to each segment between waypoints
6. Tool calculates total distance and travel time per travel mode
7. User can save, export, or share their route

---

## 2. Application States

Two top-level application states drive the entire UI:

### State 1 — Empty (No Map Loaded)
- Full-screen landing/upload area
- Clear call to action: upload a map image
- No map controls or route tools visible
- Option to import a previously exported JSON session

### State 2 — Map Loaded
- Map image fills the full viewport
- Pan and zoom controls active
- Route panel (sidebar or overlay) visible
- All tools accessible: waypoints, scale, routes, terrain, travel speeds

Transition between states: map upload or JSON import → State 2. Clearing/removing the map → State 1.

---

## 3. Feature Specification

### 3.1 Map Upload & Display
- Accepts common image formats: PNG, JPG, WebP, SVG
- Map dimensions (pixel width/height) inferred automatically from the image file on upload
- **File size:** Soft warning shown at 5MB; hard limit of 15MB enforced on upload
- Map fills the full viewport — no fixed container, true fullscreen
- **Pan:** Click and drag to move around the map
- **Zoom:** Scroll wheel (desktop), pinch gesture (mobile/touch)
- Zoom has sensible min/max limits to prevent the map being unusably small or the canvas being lost
- Canvas overlay sits above the map image to render waypoints, route lines, and annotations

### 3.2 Scale Calibration
Two methods available — either can be used, last set value wins:

**Method A — Two-Point Calibration (primary, recommended)**
1. User activates calibration mode
2. User clicks two points on the map (e.g. the two ends of the map's built-in scale bar)
3. User enters the real-world distance those two points represent
4. User selects the distance unit
5. Tool calculates and stores the pixels-per-unit ratio

**Method B — Manual Input (fallback)**
- Simple input field: `X pixels = Y [unit]`
- Useful when the user already knows the map's scale

**Distance Units (selectable list):**
- Miles
- Kilometres
- Leagues
- Nautical Miles
- Hexes (unitless — common in tabletop mapping)
- Custom (user-defined label)

The active unit is displayed throughout the tool on all distance and speed readouts.

### 3.3 Routes
- Multiple named routes can exist on a single map
- One route is **active** at a time — all waypoint placement and editing applies to the active route
- Routes are listed in a panel with:
  - Route name (editable)
  - Route colour (auto-assigned from palette on creation, user-selectable via colour picker)
  - Total distance
  - Calculated travel times per mode (see 3.5)
  - Show/hide toggle
  - Delete action
- Each route stores its own ordered list of waypoints

### 3.4 Waypoints & Route Drawing (MVP)
- User clicks the map canvas to place a waypoint on the active route
- Waypoints are connected in order by straight lines (polyline)
- Waypoints are draggable after placement for adjustment
- Waypoints can be deleted individually (removes the point and rejoins adjacent segments)
- Waypoints can be inserted between two existing points
- Route lines are rendered on the canvas overlay with a visible colour per route
- On mobile: tap to place waypoints, drag handles for repositioning

> **V2 — Freehand Drawing**
> Freehand path drawing as an alternative to waypoints. Not in MVP scope.
> When implemented, freehand paths are stored as a series of sampled points, not as a continuous curve.

### 3.5 Terrain & Travel Speeds

#### Terrain Assignment
- Terrain is assigned **per segment** (the line between two consecutive waypoints)
- Default terrain on new segment: **Road**
- To handle terrain transitions (e.g. land → sea), the user adds a waypoint at the transition point, then assigns terrain to each leg independently

**Terrain Types:**

| Terrain | Effect | Notes |
|---------|--------|-------|
| Road | Full speed | Default |
| Open Ground | Full speed | Flat, clear terrain |
| Forest / Difficult | Reduced speed | Rough undergrowth, hills |
| Mountains | Heavily reduced speed | Steep, slow going |
| Marsh / Swamp | Heavily reduced speed | Boggy, exhausting |
| Water (River) | Boat speeds only | Current affects travel |
| Water (Sea / Lake) | Boat speeds only | Open water |

Terrain type is set via a context action on the segment (e.g. clicking a segment or a segment label).

#### Travel Modes & Default Speeds
Speeds are based on D&D 5e PHB travel pace defaults. All speeds are user-editable per session.

**Land:**

| Mode | Default Speed | Notes |
|------|--------------|-------|
| On Foot (Normal) | 24 miles/day | PHB standard |
| On Foot (Fast) | 30 miles/day | Forced march, exhaustion risk |
| On Foot (Slow) | 18 miles/day | Stealthy/cautious |
| Horse (Trot) | 30 miles/day | Sustainable pace |
| Horse (Sprint) | 48 miles/day | Short bursts only |
| Cart / Wagon | 18 miles/day | PHB standard |

**Water:**

| Mode | Default Speed | Notes |
|------|--------------|-------|
| Rowboat | 15 miles/day | |
| Sailing Ship | 90 miles/day | PHB standard |
| Galley | 90 miles/day | Oared, can travel in low wind |
| Keelboat | 18 miles/day | River travel |

**Terrain modifiers** (applied as multipliers to the above speeds):

| Terrain | Speed Modifier |
|---------|---------------|
| Road | ×1.0 |
| Open Ground | ×1.0 |
| Forest / Difficult | ×0.5 |
| Mountains | ×0.5 |
| Marsh / Swamp | ×0.5 |
| Water | Land modes blocked; water modes ×1.0 |

All defaults and modifiers are editable by the user in a settings panel.

#### Time Output
- Total distance displayed in the active unit
- Travel time shown per travel mode (e.g. "4 days 6 hours on foot")
- If a route mixes terrain, per-segment breakdown is shown

### 3.6 Persistence & Sharing

**Session Persistence (IndexedDB)**
- The full session is auto-saved on every change — including the map image itself, stored in IndexedDB
- On next visit, the tool detects the saved session and offers to restore it — no re-upload required
- Session data stored: map image binary, map dimensions, scale, all routes, waypoints, terrain assignments, speed settings
- localStorage is used only for lightweight flags (e.g. "session exists" indicator)

**JSON Export / Import**
- User can export the full session as a `.json` file
- User can import a `.json` file to restore a session
- The map image is **not** embedded in the JSON — only its filename is stored. On import, the user is prompted to re-upload the matching image.

**Shareable URL**
- A route (or full session) can be encoded into the URL hash (`#data=...`) using base64 / URL-safe encoding
- Sharing the URL allows another user to load the same route configuration
- Same limitation applies: the recipient must upload the map image themselves

---

## 4. UI Layout

### Empty State
```
┌─────────────────────────────────────────┐
│                                         │
│         [Arkyvist Map Tool logo]        │
│                                         │
│      Drop a map image to get started   │
│         or [Browse to upload]           │
│                                         │
│      ── or ──                           │
│      [Import saved session (.json)]     │
│                                         │
└─────────────────────────────────────────┘
```

### Loaded State
```
┌──────────────────────────────┬──────────┐
│                              │  Routes  │
│                              │──────────│
│                              │ [Route 1]│
│        MAP CANVAS            │ [Route 2]│
│    (fullscreen, pan/zoom)    │──────────│
│                              │ + New    │
│                              │──────────│
│                              │ Speeds   │
│                              │ Scale    │
└──────────────────────────────┴──────────┘
         [Toolbar — bottom or top]
```

On mobile, the side panel collapses to a bottom sheet or a toggled drawer. The map takes full screen. Controls are touch-optimised (larger tap targets, pinch-zoom, tap-to-waypoint).

---

## 5. Tech Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | React (via Vite) | State complexity warrants component model |
| Build tool | Vite | Fast dev server, clean React setup |
| Styling | Vanilla CSS + CSS custom properties | Consistent with Arkyvist; no Tailwind |
| Canvas rendering | HTML5 Canvas API | Waypoint overlay, route drawing |
| Testing | Vitest | Calculation logic only (distance, time, scale) |
| UI feedback (dev) | Agentation | Browser overlay for annotating and iterating UI — dev mode only |
| Deployment | Netlify | Static build output |
| Package manager | Yarn | Consistent with Arkyvist |

---

## 6. Repository Structure

```
/05_arkyvist-map-tool
├── 00_docs/
│   └── SPEC.md
├── public/
├── src/
│   ├── components/
│   │   ├── canvas/          # Map canvas, overlay, waypoint rendering
│   │   ├── controls/        # Toolbar, scale calibration, speed settings
│   │   ├── routes/          # Route list, route item, segment terrain
│   │   └── ui/              # Shared UI primitives (buttons, inputs, panels)
│   ├── hooks/               # useMap, useRoutes, useScale, usePanZoom
│   ├── lib/
│   │   ├── calculations.ts  # Distance, time, scale conversion (unit tested)
│   │   ├── storage.ts       # localStorage read/write
│   │   ├── serialise.ts     # JSON export/import, URL hash encoding
│   │   └── constants.ts     # Default speeds, terrain modifiers, unit list
│   ├── styles/              # Global CSS, custom properties, resets
│   ├── types/               # TypeScript interfaces
│   └── App.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 7. Data Model

```typescript
interface MapSession {
  mapFilename: string;
  mapWidth: number;       // px, inferred on upload
  mapHeight: number;      // px, inferred on upload
  scale: Scale;
  routes: Route[];
  activeRouteId: string;
  speedSettings: SpeedSettings;
}

interface Scale {
  pixelsPerUnit: number;
  unit: DistanceUnit;
}

type DistanceUnit = 'miles' | 'km' | 'leagues' | 'nautical-miles' | 'hexes' | 'custom';

interface Route {
  id: string;
  name: string;
  visible: boolean;
  colour: string;
  waypoints: Waypoint[];
}

interface Waypoint {
  id: string;
  x: number;             // px on original image
  y: number;             // px on original image
  terrainToNext: Terrain; // terrain of the segment TO the next waypoint
}

type Terrain =
  | 'road'
  | 'open'
  | 'forest'
  | 'mountains'
  | 'marsh'
  | 'water-river'
  | 'water-open';

interface SpeedSettings {
  modes: TravelMode[];
}

interface TravelMode {
  id: string;
  label: string;
  category: 'land' | 'water';
  baseSpeedPerDay: number;  // in the active distance unit
}
```

---

## 8. Calculation Logic (to be unit tested)

All of the following live in `src/lib/calculations.ts`:

- `pixelDistanceBetween(a: Waypoint, b: Waypoint): number` — Euclidean pixel distance
- `pixelsToUnits(pixels: number, scale: Scale): number` — apply scale ratio
- `routeTotalDistance(route: Route, scale: Scale): number` — sum all segments
- `segmentDistance(a: Waypoint, b: Waypoint, scale: Scale): number`
- `travelTime(distanceInUnits: number, speedPerDay: number): { days: number, hours: number }`
- `travelTimeForRoute(route: Route, scale: Scale, mode: TravelMode, terrainModifiers: Record<Terrain, number>): TravelTime`
- `twoPointCalibration(p1: Point, p2: Point, realWorldDistance: number): number` — returns pixelsPerUnit

---

## 9. Responsive Behaviour

| Breakpoint | Behaviour |
|-----------|-----------|
| Desktop (>900px) | Side panel visible at all times |
| Tablet (600–900px) | Side panel collapses to a toggle drawer |
| Mobile (<600px) | Panel is a bottom sheet; map is full screen; tap to place waypoints; pinch to zoom |

Touch interactions:
- **Tap** → place waypoint (when route tool active)
- **Drag** → pan map
- **Pinch** → zoom
- **Long press** on waypoint → context menu (delete, insert before/after)

---

## 10. MVP Scope

**In for v1:**
- Map upload (PNG, JPG, WebP)
- Inferred map dimensions
- Two-point scale calibration + manual fallback
- Distance unit selection
- Pan and zoom
- Multiple named routes
- Waypoint placement, drag, delete
- Per-segment terrain assignment
- All travel modes with editable speeds
- Distance and time output
- LocalStorage auto-save + session restore
- JSON export and import
- Shareable URL hash

**Out of scope for v1 (V2+):**
- Freehand path drawing
- Terrain zone painting
- Per-segment speed split (e.g. 30% land / 70% sea slider)
- Elevation / 3D terrain
- Map annotations (labels, icons)
- Multiple maps per session
- Account / cloud save

---

## 11. Open Questions

- [x] How does the tool integrate into `arkyvist.com`? → **Separate Netlify site at `journey.arkyvist.com`**
- [x] Session restore requiring image re-upload? → **Image stored in IndexedDB — seamless restore, no re-upload**
- [x] Route colours — auto-assigned or user-selectable? → **Auto-assigned from palette on creation, user can override via colour picker**
- [x] Maximum image file size? → **Soft warning at 5MB, hard limit at 15MB**

---

## Changelog
| Date | Version | Change |
|------|---------|--------|
| 2026-04-20 | v0.1 | Initial spec |
| 2026-04-20 | v0.2 | Resolved all open questions |
