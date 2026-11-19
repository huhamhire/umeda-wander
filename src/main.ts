import { messageText } from './infrastructure/i18n/index.ts';
import type { FacilityKind, LevelId, StationId } from './domain/map/model.ts';
import type { FacilityOption, NavigationData } from './application/exploration/navigation-data.ts';
import { MapSession, type MapViewState } from './application/map-session.ts';
import type { MapScene, MapCameraSnapshot } from './presentation/map-scene.ts';
import { element } from './utils/dom.ts';
import { bindSidebarTabs } from './presentation/components/sidebar-tabs.ts';
import { bindPanelSelect } from './presentation/components/panel-select.ts';
import { stationPalettes } from './presentation/appearance/station-palette.ts';
import { floorOptions } from './presentation/components/floor-options.ts';
import { filterFacilities, facilityCategory } from './application/exploration/facility-filter.ts';
import { facilityCodes } from './infrastructure/facility-codes.ts';
import { bindCreditsDialog } from './presentation/components/source-credits-dialog.ts';
import { bindPagePreferences, mountLocalizedPage } from './presentation/components/page-preferences.ts';
import { allowsGroundLayer } from './application/exploration/view-layer.ts';
import { createFacilityIcon } from './presentation/components/facility-icon.ts';
import { bindWalkingRoutePanel, type WalkingDraft } from './presentation/components/walking-route-panel.ts';
import { bindMapViewUrl, readMapView, type ShareFilters, type SharedMapView } from './presentation/camera/map-view-url.ts';
import { planWalkingRoute } from './application/navigation/walking-route.ts';

interface LanguageChangeView {
    state: MapViewState;
    filters: ShareFilters;
    facility: string;
    facilityTab: boolean;
    walkingTab?: boolean;
    walkingDraft?: WalkingDraft;
    navigationExpanded?: boolean;
    roadsVisible: boolean;
    categoryScroll: number;
    camera?: MapCameraSnapshot;
    pendingFacility?: string;
}

const languageChangeKey = 'umeda-language-change-view';

/** Read the previous language's view once without starting a persistent map history. */
function takeLanguageChangeView(): LanguageChangeView | undefined {
    try {
        const raw = sessionStorage.getItem(languageChangeKey);
        sessionStorage.removeItem(languageChangeKey);
        return raw ? JSON.parse(raw) as LanguageChangeView : undefined;
    }
    catch {
        return undefined;
    }
}

mountLocalizedPage();
const navigation = JSON.parse(element('#navigation-data').textContent!) as NavigationData;
const { facilities, levels, stations, walkingPlaces } = navigation;
bindCreditsDialog(
    element<HTMLDialogElement>('#credits-dialog'),
    element('#credits-open'),
    element<HTMLButtonElement>('#credits-close'),
    element('#credits-title')
);
let session = new MapSession([]);
const restored = takeLanguageChangeView();
const shared = restored ? undefined : readMapView(new URL(location.href), navigation);
if (restored) {
    session.state = restored.state;
} else if (shared) {
    session.state = {
        level: shared.level,
        focusStation: shared.station,
        explode: shared.explode,
        roof: shared.buildings,
        route: null
    };
}
let scene: MapScene | undefined;
let savedCamera = restored?.camera;
let sharedCamera = shared?.camera;
let sharedItinerary = shared?.itinerary;
let pendingFacility = restored?.pendingFacility;
let selectedFacilityId = pendingFacility ?? savedCamera?.facility ?? restored?.facility ?? shared?.facility ?? '';
const queueMapUrl = bindMapViewUrl(currentSharedView);
let screenDirection: typeof import('./presentation/camera/view-orientation.ts').screenDirection | undefined;
/**
 * Project geographic north onto the screen and update the compass needle and cardinal labels.
 */
function updateCompass(): void {
    const north = screenDirection?.(-Math.PI / 2);
    if (!north) {
        return;
    }
    element('#compass-needle').setAttribute(
        'transform',
        `rotate(${Math.atan2(north.x, -north.y) * 180 / Math.PI} 30 30)`
    );
    for (const [id, sign] of [['compass-north', 1], ['compass-south', -1]] as const) {
        element(`#${id}`).setAttribute('x', String(30 + north.x * 25 * sign));
        element(`#${id}`).setAttribute('y', String(30 + north.y * 25 * sign));
    }
}
window.addEventListener('map-orientation', updateCompass);
const roads = element<HTMLInputElement>('#roads');
let groundPreference = restored?.roadsVisible ?? shared?.ground ?? roads.checked;
roads.addEventListener('change', () => {
    groundPreference = roads.checked;
    scene?.setRoadsVisible(groundPreference);
    queueMapUrl();
});
const slider = element<HTMLInputElement>('#explode');
const roof = element<HTMLInputElement>('#roof');
const facilityPanel = element('#panel-facilities');
const facilityPickerButton = element<HTMLButtonElement>('#facility-picker');
const facilityClear = element<HTMLButtonElement>('#facility-clear');
const facilityStationButton = element<HTMLButtonElement>('#facility-station');
const facilityFloorButton = element<HTMLButtonElement>('#facility-floor');
const walkingPanel = element('#panel-walking');
const facilityWalkingActions = element('#facility-walking-actions');
const facilityWalkingStop = element<HTMLButtonElement>('#facility-walking-stop');
const facilityWalkingRoles = ['start', 'end', 'stop'] as const;
const placeByFacility = new Map(walkingPlaces.flatMap(place => place.facilityId ? [[place.facilityId, place] as const] : []));
const categoryLabels = {
    all: messageText('facilities.types.all'),
    entrance: messageText('facilities.types.entrance'),
    platform: messageText('facilities.types.platform'),
    gate: messageText('facilities.types.gate'),
    ticket: messageText('facilities.types.ticket'),
    'ticket-machine': messageText('facilities.types.ticket'),
    escalator: messageText('facilities.types.escalator'),
    elevator: messageText('facilities.types.elevator'),
    stairs: messageText('facilities.types.stairs'),
    information: messageText('facilities.types.information'),
    'convenience-store': messageText('facilities.types.convenienceStore'),
    police: messageText('facilities.types.police'),
    'luggage-storage': messageText('facilities.types.luggageStorage'),
    locker: messageText('facilities.types.locker')
};
const facilityPicker = bindPanelSelect(facilityPickerButton, facilityPanel, {
    label: messageText('ui.facilities.search'),
    empty: messageText('ui.facilities.searchEmpty')
});
const facilityStation = bindPanelSelect(facilityStationButton, facilityPanel);
const facilityFloor = bindPanelSelect(facilityFloorButton, facilityPanel);
const facilityFilter: ShareFilters = restored?.filters ?? shared?.filters ?? { station: null, level: 'all', kind: 'all' };
let filteredLabelIds: ReadonlySet<string> | undefined;

/** Apply manual facility filters to the label overlay while the facility tab is active. */
function syncFacilityLabels(): void {
    scene?.setFacilityLabelFilter(facilityPanel.hidden ? undefined : filteredLabelIds);
}

const floorList = element('#floor-list');
const floors = floorOptions(levels);
for (const level of [{ id: 'all', label: messageText('ui.floors.overview'), name: messageText('ui.floors.all') }, ...floors]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'floor';
    button.dataset.level = level.id;
    button.setAttribute('aria-label', `${level.label} · ${level.name}`);
    button.title = level.name;
    const number = document.createElement('span');
    number.className = 'floor-number';
    number.textContent = level.label;
    const name = document.createElement('span');
    name.textContent = level.name;
    button.append(number, name);
    floorList.append(button);
}
const floorButtons = [...floorList.querySelectorAll<HTMLButtonElement>('button')];
let closeWalkingEditor: (() => void) | undefined;
const showSidebarTab = bindSidebarTabs(
    [element<HTMLButtonElement>('#tab-layers'), element<HTMLButtonElement>('#tab-facilities'), element<HTMLButtonElement>('#tab-walking')],
    [element('#panel-layers'), facilityPanel, walkingPanel],
    () => {
        syncFacilityLabels();
        if (walkingPanel.hidden) {
            closeWalkingEditor?.();
        }
        if (!facilityPanel.hidden) {
            syncWalkingActions();
        }
        if (scene) {
            queueMapUrl();
        }
    }
);
const walkingRoute = bindWalkingRoutePanel(walkingPanel, walkingPlaces, levels, stations, {
    kindLabel: kind => categoryLabels[kind],
    preview: (places, allowPaid) => {
        const result = session.previewWalkingRoute(places.map(place => place.id), allowPaid);
        if (result.route) {
            clearFacilitySelection();
            scene?.reset();
            sync();
            return messageText('ui.walking.result', { count: places.length - 1 });
        }
        sync();
        if (result.issue === 'unavailable' || result.issue === 'gateRequired') {
            const name = (id: string) => places.find(place => place.id === id)!.name;
            return messageText(`ui.walking.${result.issue}`, { from: name(result.from), to: name(result.to) });
        }
        return messageText(`ui.walking.${result.issue}`);
    },
    clear: () => {
        sharedItinerary = undefined;
        if (session.state.route) {
            session.state.route = null;
            sync();
        }
    },
    pick: (places, onPick) => {
        if (places?.length) {
            const first = places[0]!;
            const group = floors.find(item => item.members.some(level => level.id === first.level));
            const oneFloor = group && places.every(place => group.members.some(level => level.id === place.level));
            session.state.level = oneFloor ? first.level : 'all';
            session.state.focusStation = places.every(place => place.station === first.station) ? first.station : null;
            session.state.roof = false;
            session.state.explode = oneFloor ? 0 : Math.max(.6, session.state.explode);
            clearFacilitySelection();
            sync();
        }
        scene?.setWalkingPickTargets(places?.map(place => place.id), onPick);
    }
}, restored?.walkingDraft ?? shared?.itinerary);
closeWalkingEditor = walkingRoute.closeEditor;
if (restored?.walkingTab || shared?.tab === 'walking') {
    showSidebarTab(2);
} else if (restored?.facilityTab || shared?.tab === 'facilities') {
    showSidebarTab(1);
}

/** Capture the visible route and visual filters alongside the exact settled camera frame. */
function currentSharedView(): SharedMapView | undefined {
    const camera = scene?.snapshotShareCamera();
    if (!camera) {
        return undefined;
    }
    const draft = session.state.route ? walkingRoute.snapshot() : undefined;
    const itinerary = draft?.ids.every(id => id !== null) ? { ids: draft.ids, allowPaid: draft.allowPaid } : undefined;
    return {
        camera,
        level: session.state.level,
        station: session.state.focusStation ?? null,
        facility: selectedFacilityId || undefined,
        explode: session.state.explode,
        buildings: session.state.roof,
        ground: groundPreference,
        tab: !walkingPanel.hidden ? 'walking' : !facilityPanel.hidden ? 'facilities' : 'layers',
        filters: facilityFilter,
        itinerary
    };
}
for (const role of facilityWalkingRoles) {
    element(`#facility-walking-${role}`).addEventListener('click', () => {
        const place = placeByFacility.get(selectedFacilityId);
        if (place) {
            walkingRoute.usePlace(place, role);
            showSidebarTab(2);
            element('#tab-walking').focus();
        }
    });
}

/** Show the route actions only when the currently selected facility is a route endpoint. */
function syncWalkingActions(): void {
    facilityWalkingActions.hidden = !placeByFacility.has(selectedFacilityId);
    facilityWalkingStop.hidden = facilityWalkingActions.hidden || !walkingRoute.canAddStop();
}
const sidebar = element('.sidebar');
const navigationToggle = element<HTMLButtonElement>('#navigation-toggle');

/** Match the mobile drawer visibility to the disclosure state without affecting the desktop sidebar. */
function setNavigationExpanded(expanded: boolean): void {
    if (!expanded) {
        facilityPicker.close();
        facilityStation.close();
        facilityFloor.close();
    }
    sidebar.toggleAttribute('data-collapsed', !expanded);
    navigationToggle.setAttribute('aria-expanded', String(expanded));
}

setNavigationExpanded(restored?.navigationExpanded ?? false);
navigationToggle.addEventListener('click', () => setNavigationExpanded(sidebar.hasAttribute('data-collapsed')));

/** Save only the current view so the locale reload can rebuild all names and labels in place. */
function saveLanguageChangeView(): void {
    const snapshot: LanguageChangeView = {
        state: session.state,
        filters: facilityFilter,
        facility: selectedFacilityId,
        facilityTab: element('#tab-facilities').getAttribute('aria-selected') === 'true',
        walkingTab: !walkingPanel.hidden,
        walkingDraft: walkingRoute.snapshot(),
        navigationExpanded: !sidebar.hasAttribute('data-collapsed'),
        roadsVisible: groundPreference,
        categoryScroll: element('#poi-list').scrollLeft,
        camera: scene?.snapshotCamera() ?? savedCamera,
        pendingFacility
    };
    try {
        sessionStorage.setItem(languageChangeKey, JSON.stringify(snapshot));
    }
    catch {
        // Storage restrictions should not prevent changing the language.
    }
}
bindPagePreferences(saveLanguageChangeView, dark => scene?.setDarkTheme(dark));
// Keep floating controls clear of every tab's actual height.
const atlas = element('.atlas');
new ResizeObserver(() => {
    atlas.style.setProperty('--navigation-height', `${sidebar.getBoundingClientRect().height}px`);
    scene?.refreshViewport();
}).observe(sidebar);
/**
 * Rebuild filtered facility options while retaining manual filters and category scroll position.
 */
function refreshFacilities(dismissExcludedSelection = false): void {
    const { station, level, kind: facilityKind } = facilityFilter;
    facilityStation.setOptions([
        { value: 'all', label: messageText('ui.filters.allStations') },
        ...stations.map(s => ({ value: s.id, label: s.name }))
    ], station ?? 'all');
    const current = floors.find(f => f.members.some(l => l.id === level));
    facilityFloor.setOptions([
        { value: 'all', label: messageText('ui.floors.all') },
        ...floors.map(f => ({ value: f.id, label: f.label }))
    ], current?.id ?? 'all');
    const filter = facilityFilter;
    const available = filterFacilities(facilities, levels, { ...filter, kind: 'all' });
    const visible = filterFacilities(facilities, levels, { ...filter, kind: facilityKind });
    if (dismissExcludedSelection && selectedFacilityId && !visible.some(f => f.id === selectedFacilityId)) {
        clearFacilitySelection();
    }
    filteredLabelIds = station || level !== 'all' || facilityKind !== 'all' ? new Set(visible.map(f => f.id)) : undefined;
    syncFacilityLabels();
    const choices = visible.map(f => {
        const location = f.kind === 'convenience-store' ? (f.level === 'bridge' ? messageText('ui.facilities.bridgeStore') : messageText('ui.facilities.centralStore')) : '';
        return { value: f.id, label: `${f.name}${location ? ' · ' + location : ''}`, code: facilityCodes[f.id], icon: () => createFacilityIcon(f.kind) };
    });
    const placeholder = station ? 'ui.facilities.placeholder' : 'ui.facilities.search';
    facilityPicker.setOptions(choices, selectedFacilityId, {
        placeholder: messageText(visible.length ? placeholder : 'ui.facilities.empty'),
        searchPrompt: station ? undefined : messageText('ui.facilities.searchPrompt')
    });
    facilityClear.hidden = selectedFacilityId === '';
    if (scene) {
        queueMapUrl();
    }
    const categoryList = element('#poi-list');
    const categoryScroll = categoryList.scrollLeft;
    categoryList.replaceChildren();
    for (const kind of [
        'all',
        'entrance',
        'platform',
        'gate',
        'ticket',
        'escalator',
        'elevator',
        'stairs',
        'information',
        'convenience-store',
        'police',
        'luggage-storage',
        'locker'
    ] as const) {
        if (kind !== 'all' && kind !== facilityKind && !available.some(f => facilityCategory(f.kind) === kind)) {
            continue;
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.kind = kind;
        button.classList.toggle('selected', facilityKind === kind);
        button.setAttribute('aria-pressed', String(facilityKind === kind));
        button.append(createFacilityIcon(kind), categoryLabels[kind]);
        button.addEventListener(
            'click',
            () => {
                facilityFilter.kind = kind;
                refreshFacilities(true);
                categoryList.querySelector<HTMLButtonElement>(`[data-kind="${kind}"]`)?.focus({ preventScroll: true });
            }
        );
        categoryList.append(button);
    }
    categoryList.scrollLeft = categoryScroll;
}

/**
 * Synchronize exploration state with the scene, floor buttons, operator palette and expansion controls.
 */
function sync(): void {
    scene?.update(session.state);
    if (scene) {
        queueMapUrl();
    }
    roads.disabled = !allowsGroundLayer(levels, session.state);
    roads.checked = !roads.disabled && groundPreference;
    const focus = session.state.focusStation;
    const palette = stationPalettes[focus ?? 'jr-osaka'];
    element('.atlas').style.setProperty('--paid-color', `#${palette.paid.toString(16).padStart(6, '0')}`);
    for (const button of floorButtons) {
        const option = floors.find(l => l.id === button.dataset.level);
        const active = option ? option.members.some(l => l.id === session.state.level) : session.state.level === 'all';
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
    }
    slider.value = String(Math.round(session.state.explode * 100));
    element('#explode-value').textContent = `${slider.value}%`;
    roof.checked = session.state.roof;
}

/**
 * Focus a facility and its floor without modifying the user’s manual filters.
 */
function select(f: Pick<FacilityOption, 'id' | 'level'>): void {
    const owner = levels.find(l => l.id === f.level)!.station!;
    if (session.state.focusStation !== owner) {
        scene?.reset();
    }
    session.state.focusStation = owner;
    session.state.level = f.level;
    session.state.route = null;
    sharedItinerary = undefined;
    selectedFacilityId = f.id;
    facilityPicker.value = f.id;
    facilityClear.hidden = false;
    syncWalkingActions();
    showSidebarTab(1);
    sync();
    if (scene) {
        scene.selectById(f.id);
    } else {
        pendingFacility = f.id;
        savedCamera = undefined;
        sharedCamera = undefined;
    }
}

/** Clear the facility independently of filters, floor selection and camera framing. */
function clearFacilitySelection(): void {
    if (!selectedFacilityId) {
        return;
    }
    selectedFacilityId = '';
    pendingFacility = undefined;
    if (savedCamera) {
        savedCamera = { ...savedCamera, facility: undefined, followFacility: false };
    }
    facilityPicker.value = '';
    facilityClear.hidden = true;
    syncWalkingActions();
    scene?.clearFacilitySelection();
    queueMapUrl();
}

/** Treat a second tap on the same facility, or a tap on the background, as dismissal. */
function selectFromMap(f?: Pick<FacilityOption, 'id' | 'level'>): void {
    if (!f || f.id === selectedFacilityId) {
        clearFacilitySelection();
    } else {
        select(f);
    }
}

facilityClear.addEventListener('click', () => {
    clearFacilitySelection();
    const next = facilityPickerButton.disabled ? element('#poi-list').querySelector<HTMLButtonElement>('[aria-pressed="true"]') : facilityPickerButton;
    next?.focus({ preventScroll: true });
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing &&
        !document.querySelector('dialog[open], [popover]:popover-open')) {
        if (!walkingPanel.hidden && walkingRoute.cancelEditing()) {
            event.preventDefault();
            return;
        }
        const fromClearButton = document.activeElement === facilityClear;
        if (fromClearButton) {
            facilityClear.click();
        } else {
            clearFacilitySelection();
        }
    }
});
for (const b of floorButtons) {
    b.addEventListener(
        'click',
        () => {
            session.state.level = b.dataset.level as LevelId | 'all';
            facilityFilter.level = session.state.level;
            pendingFacility = undefined;
            refreshFacilities(true);
            sync();
        }
    );
}
facilityStationButton.addEventListener(
    'change',
    () => {
        facilityFilter.station = facilityStation.value === 'all' ? null : facilityStation.value as StationId;
        clearFacilitySelection();
        pendingFacility = undefined;
        savedCamera = undefined;
        sharedCamera = undefined;
        sharedItinerary = undefined;
        session.focusStation(facilityFilter.station);
        if (facilityFilter.level !== 'all') {
            session.state.level = facilityFilter.level;
        }
        scene?.reset();
        refreshFacilities();
        sync();
    }
);
facilityFloorButton.addEventListener(
    'change',
    () => {
        facilityFilter.level = facilityFloor.value as LevelId | 'all';
        session.state.level = facilityFilter.level;
        pendingFacility = undefined;
        refreshFacilities(true);
        sync();
    }
);
let explodePointer: number | undefined;
slider.addEventListener('pointerdown', event => {
    explodePointer = event.pointerId;
    scene?.setExplodeDragging(true);
});

/** Restore full scene detail once the slider pointer leaves, including releases outside the panel. */
function endExplodeDrag(event?: PointerEvent): void {
    if (explodePointer === undefined || (event && event.pointerId !== explodePointer)) {
        return;
    }
    explodePointer = undefined;
    scene?.setExplodeDragging(false);
}

window.addEventListener('pointerup', endExplodeDrag);
window.addEventListener('pointercancel', endExplodeDrag);
window.addEventListener('blur', () => endExplodeDrag());
slider.addEventListener(
    'input',
    () => {
        session.state.explode = Number(slider.value) / 100;
        element('#explode-value').textContent = `${slider.value}%`;
        scene?.update(session.state, { immediateExplode: true });
        queueMapUrl();
    }
);
roof.addEventListener('change', () => {
    session.state.roof = roof.checked;
    sync();
});
facilityPickerButton.addEventListener(
    'change',
    () => {
        const f = facilities.find(f => f.id === facilityPicker.value);
        if (f) {
            select(f);
        }
    }
);
/**
 * Reset exploration, camera and manual filters, then return to the floor tab.
 */
function reset(): void {
    walkingRoute.reset();
    clearFacilitySelection();
    pendingFacility = undefined;
    savedCamera = undefined;
    sharedCamera = undefined;
    session.reset();
    scene?.reset(true);
    Object.assign(facilityFilter, { station: null, level: 'all', kind: 'all' });
    refreshFacilities();
    showSidebarTab(0);
    sync();
}
const zoomIn = element<HTMLButtonElement>('#zoom-in');
const zoomOut = element<HTMLButtonElement>('#zoom-out');
zoomIn.addEventListener('click', () => scene?.zoom(1.18));
zoomOut.addEventListener('click', () => scene?.zoom(1 / 1.18));
element('#reset').addEventListener('click', reset);
element('.brand').addEventListener('click', e => {
    e.preventDefault();
    reset();
});
refreshFacilities();
syncWalkingActions();
if (restored) {
    element('#poi-list').scrollLeft = restored.categoryScroll;
    element<HTMLSelectElement>('#language').focus({ preventScroll: true });
}
sync();

/** Let the browser paint the navigation and loading state before evaluating the geographic map. */
async function loadMap(): Promise<void> {
    const viewport = element('#viewport');
    const labels = element('#labels');
    try {
        await new Promise<void>(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve());
            });
        });
        const runtime = await import('./presentation/map-runtime.ts');
        screenDirection = runtime.screenDirection;
        const currentState = session.state;
        if (sharedItinerary) {
            currentState.route = planWalkingRoute(runtime.edges, sharedItinerary.ids, sharedItinerary.allowPaid).route ?? null;
            sharedItinerary = undefined;
        }
        session = new MapSession(runtime.edges, { nodes: runtime.nodes, levels: runtime.levels });
        session.state = currentState;
        scene = new runtime.MapScene(viewport, labels, runtime.levels, runtime.facilities, runtime.nodes, runtime.layout, currentState, selectFromMap, queueMapUrl);
        syncFacilityLabels();
        scene.setExplodeDragging(explodePointer !== undefined);
        scene.setRoadsVisible(groundPreference);
        scene.setDarkTheme(document.documentElement.dataset.theme === 'dark');
        if (pendingFacility) {
            scene.selectById(pendingFacility);
            pendingFacility = undefined;
        } else if (savedCamera) {
            scene.restoreCamera(savedCamera);
        } else if (sharedCamera) {
            scene.restoreShareCamera(sharedCamera, selectedFacilityId || undefined);
        } else if (selectedFacilityId) {
            scene.selectById(selectedFacilityId, false);
        }
        updateCompass();
        scene.renderFirstFrame();
        walkingRoute.enableMap();
        zoomIn.disabled = false;
        zoomOut.disabled = false;
    }
    catch (error) {
        console.error('Map initialization failed', error);
        scene?.dispose();
        scene = undefined;
        const fallback = element('#fallback');
        fallback.hidden = false;
        const message = error instanceof Error ? error.message : String(error);
        const webgl = /WebGL|context creation|Error creating WebGL context/i.test(message);
        fallback.querySelector('h2')!.textContent = webgl ? messageText('ui.errors.webglTitle') : messageText('ui.errors.initializationTitle');
        fallback.querySelector('p')!.textContent = webgl ? messageText('ui.errors.webglAdvice') : messageText('ui.errors.initializationDetail', { message });
        viewport.replaceChildren();
        labels.replaceChildren();
    }
    finally {
        element('#map-loading').hidden = true;
        viewport.setAttribute('aria-busy', 'false');
    }
}

void loadMap();
