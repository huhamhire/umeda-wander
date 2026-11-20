import type { FacilityKind, Level, StationId } from '../../domain/map/model.ts';
import type { WalkingApproaches, WalkingPlace } from '../../application/navigation/walking-route.ts';
import type { FacilityOption } from '../../application/exploration/navigation-data.ts';
import { maxWalkingStops } from '../../application/navigation/walking-route.ts';
import { facilityCategory } from '../../application/exploration/facility-filter.ts';
import { messageText } from '../../infrastructure/i18n/index.ts';
import { matchingOptions, searchDelayMs } from './panel-select.ts';
import { floorOptions } from './floor-options.ts';
import { createFacilityIcon } from './facility-icon.ts';

interface WalkingActions {
    preview(places: readonly Pick<WalkingCandidate, 'id' | 'name'>[], allowPaid: boolean): WalkingPreview;
    clear(): void;
    pick(targets: readonly WalkingCandidate[] | undefined, onPick: (id: string) => void): void;
    kindLabel(kind: FacilityKind): string;
}

interface WalkingPreview {
    message: string;
    gateRequired?: boolean;
}

interface WalkingField {
    row: HTMLLIElement;
    element: HTMLElement;
    input: HTMLInputElement;
    clear: HTMLButtonElement;
    grip: HTMLElement;
    icon: HTMLElement;
}

interface StopDrag {
    from: number;
    pointer: number;
    startY: number;
    target?: number;
}

interface WalkingCandidate extends Omit<FacilityOption, 'kind'> {
    station: StationId | null;
    kind?: FacilityKind;
    facilityId?: string;
    place?: WalkingPlace;
}

export interface WalkingDraft {
    ids: (string | null)[];
    allowPaid: boolean;
}

/** Edit route points in place, with one shared result list for the active field. */
export function bindWalkingRoutePanel(
    panel: HTMLElement,
    places: WalkingPlace[],
    levels: Level[],
    stations: { id: StationId; name: string }[],
    facilities: readonly FacilityOption[],
    actions: WalkingActions,
    restored?: WalkingDraft,
    approaches?: WalkingApproaches
) {
    const rows = panel.querySelector<HTMLOListElement>('#walking-places')!;
    const add = panel.querySelector<HTMLButtonElement>('#walking-add')!;
    const station = panel.querySelector<HTMLSelectElement>('#walking-station')!;
    const floor = panel.querySelector<HTMLSelectElement>('#walking-floor')!;
    const kind = panel.querySelector<HTMLSelectElement>('#walking-kind')!;
    const pick = panel.querySelector<HTMLButtonElement>('#walking-pick')!;
    const results = panel.querySelector<HTMLElement>('#walking-results')!;
    const searchStatus = panel.querySelector<HTMLElement>('#walking-search-status')!;
    const gates = panel.querySelector<HTMLInputElement>('#walking-gates')!;
    const preview = panel.querySelector<HTMLButtonElement>('#walking-preview')!;
    const reset = panel.querySelector<HTMLButtonElement>('#walking-clear')!;
    const status = panel.querySelector<HTMLElement>('#walking-status')!;
    const gateAction = panel.querySelector<HTMLElement>('#walking-gate-action')!;
    const allowGates = panel.querySelector<HTMLButtonElement>('#walking-allow-gates')!;
    const floors = floorOptions(levels);
    const facilityById = new Map(facilities.map(facility => [facility.id, facility]));
    const routableFacilities = new Set(places.map(place => place.facilityId));
    const stationByLevel = new Map(levels.map(level => [level.id, level.station ?? null]));
    const candidates: WalkingCandidate[] = [
        ...places.map(place => ({
            ...place,
            place,
            mapLabel: place.facilityId ? facilityById.get(place.facilityId)?.mapLabel : undefined
        })),
        ...facilities.filter(facility => !routableFacilities.has(facility.id)).map(facility => ({
            ...facility,
            facilityId: facility.id,
            station: stationByLevel.get(facility.level) ?? null
        }))
    ];
    const byId = new Map(candidates.map(candidate => [candidate.id, candidate]));
    const endpointKinds = [...new Set(candidates.flatMap(candidate => candidate.kind ? [facilityCategory(candidate.kind)] : []))];
    let stops: (WalkingCandidate | undefined)[] = restored && restored.ids.length >= 2 && restored.ids.length <= maxWalkingStops + 2
        ? restored.ids.map(id => id ? byId.get(id) : undefined)
        : [undefined, undefined];
    let fields: WalkingField[] = [];
    let drag: StopDrag | undefined;
    let editing: number | undefined;
    let query = '';
    let composing = false;
    let timer: number | undefined;
    let active = -1;
    let visible: WalkingCandidate[] = [];
    let picking = false;
    let mapReady = false;
    gates.checked = restored?.allowPaid ?? true;

    station.replaceChildren(new Option(messageText('ui.filters.allStations'), ''), ...stations.map(item => new Option(item.name, item.id)));
    floor.replaceChildren(new Option(messageText('ui.floors.all'), ''), ...floors.map(item => new Option(item.label, item.id)));
    kind.replaceChildren(new Option(messageText('ui.walking.allKinds'), ''), ...endpointKinds.map(item => new Option(actions.kindLabel(item), item)));

    /** Add floor and gate side, plus the station if it is absent from the authored caption. */
    function context(place: WalkingPlace): string {
        const owner = stations.find(item => item.id === place.station)!.name;
        const level = levels.find(item => item.id === place.level)!.label;
        const access = messageText(place.access === 'inside' ? 'ui.walking.inside' : 'ui.walking.outside');
        return place.facilityId ? `${owner} · ${level} · ${access}` : `${level} · ${access}`;
    }

    /** Identify unconnected facilities alongside the graph destinations. */
    function candidateContext(candidate: WalkingCandidate): string {
        if (candidate.place) {
            return context(candidate.place);
        }
        const owner = stations.find(item => item.id === candidate.station)?.name;
        const level = levels.find(item => item.id === candidate.level)!.label;
        const statusKey = canRoute(candidate) ? 'ui.walking.nearbyApproach' : 'ui.walking.notRoutable';
        return [owner, level, messageText(statusKey)].filter(Boolean).join(' · ');
    }

    /** A graph endpoint or a validated nearby approach can serve as a route destination. */
    function canRoute(candidate: WalkingCandidate | undefined): boolean {
        return !!candidate && (!!candidate.place || approaches?.has(candidate.id) === true);
    }

    /** Apply the optional filters to every facility shown in the search list. */
    function matchingCandidates(): WalkingCandidate[] {
        const members = floors.find(item => item.id === floor.value)?.members;
        return candidates.filter(candidate => (!station.value || candidate.station === station.value) &&
            (!members || members.some(level => level.id === candidate.level)) &&
            (!kind.value || candidate.kind && facilityCategory(candidate.kind) === kind.value));
    }

    /** Create a compact action with an explicit accessible name. */
    function button(text: string, label: string, run: () => void): HTMLButtonElement {
        const result = document.createElement('button');
        result.type = 'button';
        result.textContent = text;
        result.setAttribute('aria-label', label);
        result.addEventListener('click', run);
        return result;
    }

    /** Require a connected endpoint in every slot before allowing route preview. */
    function refreshActions(): void {
        add.disabled = stops.length >= maxWalkingStops + 2;
        preview.disabled = !mapReady || stops.some(stop => !canRoute(stop));
        pick.disabled = !picking && (!mapReady || !matchingCandidates().length);
    }

    /** Identify the first selected facility that still needs a walking graph connection. */
    function showDraftStatus(): void {
        const unconnected = stops.find(stop => stop && !canRoute(stop));
        status.hidden = !unconnected;
        gateAction.hidden = true;
        if (unconnected) {
            status.textContent = messageText('ui.walking.facilityNotRoutable', { name: unconnected.name });
        }
    }

    /** Invalidate the drawn route when the itinerary or gate policy changes. */
    function changed(): void {
        actions.clear();
        showDraftStatus();
        refreshActions();
    }

    /** Offer a direct retry when crossing ticket gates would complete the blocked leg. */
    function runPreview(): void {
        if (preview.disabled) {
            return;
        }
        closeEditor();
        showPreviewResult(actions.preview(stops.filter(stop => stop !== undefined), gates.checked));
    }

    /** Announce the result and any route approaches resolved by the graph. */
    function showPreviewResult(result: WalkingPreview): void {
        status.textContent = result.message;
        status.hidden = false;
        gateAction.hidden = !result.gateRequired;
    }

    /** Update a field to show its confirmed place, rather than any abandoned search text. */
    function showPlace(index: number): void {
        const field = fields[index]!;
        const place = stops[index];
        field.input.value = place?.mapLabel ?? place?.name ?? '';
        field.input.title = place ? `${place.name} · ${candidateContext(place)}` : '';
        field.clear.hidden = !place && (index === 0 || index === stops.length - 1);
        field.grip.setAttribute('aria-disabled', String(!place));
        field.icon.hidden = !place?.kind;
        field.icon.replaceChildren(...(place?.kind ? [createFacilityIcon(place.kind)] : []));
    }

    /** Render only itinerary structure changes; typing never replaces the focused field. */
    function render(): void {
        clearDrag();
        fields = [];
        rows.replaceChildren(...stops.map((_, index) => {
            const row = document.createElement('li');
            const intermediate = index > 0 && index < stops.length - 1;
            const role = intermediate ? messageText('ui.walking.stop', { number: index })
                : messageText(index === 0 ? 'ui.walking.start' : 'ui.walking.end');
            const field = document.createElement('div');
            field.className = 'walking-field';
            const label = document.createElement('label');
            label.className = 'walking-point-role';
            label.textContent = role;
            const icon = document.createElement('span');
            icon.className = 'walking-point-icon';
            icon.setAttribute('aria-hidden', 'true');
            label.append(icon);
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `walking-point-${index}`;
            input.placeholder = messageText('ui.walking.choose');
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.setAttribute('role', 'combobox');
            input.setAttribute('aria-autocomplete', 'list');
            input.setAttribute('aria-controls', results.id);
            input.setAttribute('aria-expanded', 'false');
            label.htmlFor = input.id;
            const clear = button('×', messageText(intermediate ? 'ui.walking.remove' : 'ui.walking.clearPoint', { role }), () => {
                closeEditor();
                if (intermediate) {
                    stops.splice(index, 1);
                    render();
                    fields[Math.min(index, fields.length - 1)]?.input.focus();
                } else {
                    stops[index] = undefined;
                    showPlace(index);
                    input.focus();
                }
                changed();
            });
            clear.className = 'walking-point-clear';
            const grip = document.createElement('span');
            grip.className = 'walking-grip';
            grip.title = messageText('ui.walking.drag', { role });
            grip.addEventListener('pointerdown', event => {
                if (!drag && event.button === 0 && stops[index]) {
                    event.preventDefault();
                    grip.setPointerCapture(event.pointerId);
                    drag = { from: index, pointer: event.pointerId, startY: event.clientY };
                }
            });
            grip.addEventListener('pointermove', updateDrag);
            grip.addEventListener('pointerup', finishDrag);
            for (const type of ['pointercancel', 'lostpointercapture'] as const) {
                grip.addEventListener(type, event => {
                    if (event.pointerId === drag?.pointer) {
                        clearDrag();
                    }
                });
            }
            fields.push({ row, element: field, input, clear, grip, icon });
            showPlace(index);
            input.addEventListener('focus', () => {
                activate(index);
                if (stops[index]) {
                    input.select();
                }
            });
            input.addEventListener('click', () => activate(index));
            input.addEventListener('compositionstart', () => {
                activate(index);
                composing = true;
                window.clearTimeout(timer);
                timer = undefined;
                hideResults();
            });
            input.addEventListener('compositionend', () => {
                composing = false;
                if (editing === index) {
                    searchInput(index);
                }
            });
            input.addEventListener('input', event => {
                if (!composing && !(event as InputEvent).isComposing) {
                    searchInput(index);
                }
            });
            input.addEventListener('keydown', event => navigateResults(event, index));
            field.append(grip, label, input, clear);
            row.append(field);
            return row;
        }));
        refreshActions();
    }

    /** Remove old options so only results for the current query can be accepted. */
    function hideResults(): void {
        visible = [];
        active = -1;
        results.hidden = true;
        results.replaceChildren();
        searchStatus.hidden = true;
        if (editing !== undefined) {
            const input = fields[editing]!.input;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
        }
    }

    /** Populate inline candidates and keep the all-station search scoped by a keyword. */
    function refreshResults(): void {
        hideResults();
        refreshActions();
        if (editing === undefined || composing || picking) {
            return;
        }
        const needsQuery = !station.value && !query.trim();
        visible = needsQuery ? [] : matchingOptions(matchingCandidates().map(candidate => ({
            candidate,
            label: `${candidate.name} · ${candidateContext(candidate)}`
        })), query).map(option => option.candidate);
        if (!visible.length) {
            searchStatus.textContent = messageText(needsQuery ? 'ui.walking.prompt' : 'ui.facilities.searchEmpty');
            searchStatus.hidden = false;
            return;
        }
        for (const [index, candidate] of visible.entries()) {
            const option = document.createElement('div');
            option.id = `${results.id}-${index}`;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            const text = document.createElement('div');
            const name = document.createElement('strong');
            name.textContent = candidate.name;
            const detail = document.createElement('span');
            detail.textContent = candidateContext(candidate);
            text.append(name, detail);
            if (candidate.kind) {
                option.append(createFacilityIcon(candidate.kind));
            }
            option.append(text);
            option.addEventListener('click', () => accept(candidate));
            results.append(option);
        }
        results.hidden = false;
        fields[editing]!.input.setAttribute('aria-expanded', 'true');
    }

    /** Activate a row and give each new location a fresh filter scope. */
    function activate(index: number, keepFilters = false): void {
        if (editing === index) {
            return;
        }
        closeEditor();
        editing = index;
        fields[index]!.element.setAttribute('data-active', '');
        if (!keepFilters) {
            station.value = floor.value = kind.value = '';
        }
        refreshResults();
    }

    /** Choose a target when the shortcut is used before focusing a field. */
    function ensureEditing(): void {
        if (editing === undefined) {
            const empty = stops.findIndex(place => !place);
            activate(empty < 0 ? stops.length - 1 : empty, true);
        }
    }

    /** Search committed input after a short pause, dropping the old confirmed point on edit. */
    function searchInput(index: number): void {
        activate(index);
        stopPicking();
        query = fields[index]!.input.value;
        if (stops[index]) {
            stops[index] = undefined;
            fields[index]!.input.title = '';
            fields[index]!.clear.hidden = index === 0 || index === stops.length - 1;
            fields[index]!.grip.setAttribute('aria-disabled', 'true');
            changed();
        }
        window.clearTimeout(timer);
        timer = undefined;
        if (!query.trim()) {
            refreshResults();
            return;
        }
        hideResults();
        timer = window.setTimeout(() => {
            timer = undefined;
            refreshResults();
        }, searchDelayMs);
    }

    /** Support listbox navigation while leaving native IME keystrokes alone. */
    function navigateResults(event: KeyboardEvent, index: number): void {
        if (composing || event.isComposing || event.keyCode === 229) {
            return;
        }
        if (event.key === 'Enter' && editing === index) {
            event.preventDefault();
            if (timer !== undefined) {
                window.clearTimeout(timer);
                timer = undefined;
                refreshResults();
            } else {
                const place = visible[active] ?? visible[0];
                if (place) {
                    accept(place);
                }
            }
        } else if (visible.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            const next = active < 0 && step === -1 ? visible.length - 1 : active + step;
            if (!visible[next]) {
                return;
            }
            results.children[active]?.setAttribute('aria-selected', 'false');
            active = next;
            const option = results.children[active] as HTMLElement;
            option.setAttribute('aria-selected', 'true');
            fields[index]!.input.setAttribute('aria-activedescendant', option.id);
            results.scrollTop += Math.min(0, option.offsetTop - results.scrollTop) +
                Math.max(0, option.offsetTop + option.offsetHeight - results.scrollTop - results.clientHeight);
        }
    }

    /** Mark the insertion edge on the hovered row, including either endpoint. */
    function updateDrag(event: PointerEvent): void {
        if (event.pointerId !== drag?.pointer) {
            return;
        }
        if (drag.target === undefined) {
            if (Math.abs(event.clientY - drag.startY) < 5) {
                return;
            }
            closeEditor();
            fields[drag.from]!.row.setAttribute('data-dragging', '');
        }
        const index = fields.findIndex(field => event.clientY < field.row.getBoundingClientRect().bottom);
        const target = index < 0 ? fields.length - 1 : index;
        if (target !== drag.target) {
            if (drag.target !== undefined) {
                fields[drag.target]!.row.removeAttribute('data-drop');
            }
            drag.target = target;
            if (target !== drag.from) {
                fields[target]!.row.setAttribute('data-drop', target < drag.from ? 'before' : 'after');
            }
        }
    }

    /** Drop the place into its new slot and invalidate the previous preview. */
    function finishDrag(event: PointerEvent): void {
        if (event.pointerId !== drag?.pointer) {
            return;
        }
        updateDrag(event);
        const { from, target } = drag;
        clearDrag();
        if (target !== undefined && target !== from) {
            const [place] = stops.splice(from, 1);
            stops.splice(target, 0, place);
            render();
            changed();
        }
    }

    /** Clear sorting feedback on drop, cancellation or when rows are rebuilt. */
    function clearDrag(): void {
        if (drag) {
            fields[drag.from]!.row.removeAttribute('data-dragging');
            if (drag.target !== undefined) {
                fields[drag.target]!.row.removeAttribute('data-drop');
            }
            drag = undefined;
        }
    }

    /** Commit a map point to the current field in the same way as a search result. */
    function onMapPoint(id: string): void {
        const place = byId.get(id);
        if (picking && place) {
            accept(place);
        }
    }

    /** Exit map picking without clearing the field being edited. */
    function stopPicking(): void {
        if (picking) {
            picking = false;
            pick.setAttribute('aria-pressed', 'false');
            pick.title = messageText('ui.walking.pick');
            actions.pick(undefined, onMapPoint);
            refreshActions();
        }
    }

    /** End the current edit and discard any unconfirmed search text. */
    function closeEditor(): void {
        window.clearTimeout(timer);
        timer = undefined;
        hideResults();
        stopPicking();
        if (editing !== undefined) {
            fields[editing]!.element.removeAttribute('data-active');
            showPlace(editing);
        }
        editing = undefined;
        composing = false;
        query = '';
    }

    /** Save a result in the active row without moving keyboard focus to another field. */
    function accept(place: WalkingCandidate): void {
        if (editing !== undefined) {
            stops[editing] = place;
            closeEditor();
            changed();
        }
    }

    /** Respond to shortcuts for the current field without reopening a secondary editor. */
    function filtersChanged(): void {
        ensureEditing();
        window.clearTimeout(timer);
        timer = undefined;
        if (picking) {
            actions.pick(matchingCandidates(), onMapPoint);
        }
        refreshResults();
    }

    for (const field of [station, floor, kind]) {
        field.addEventListener('change', filtersChanged);
    }
    results.addEventListener('mousedown', event => event.preventDefault());
    add.addEventListener('click', () => {
        closeEditor();
        const index = stops.length - 1;
        stops.splice(index, 0, undefined);
        changed();
        render();
        fields[index]?.input.focus();
    });
    pick.addEventListener('click', () => {
        if (picking) {
            stopPicking();
            refreshResults();
            return;
        }
        ensureEditing();
        hideResults();
        picking = true;
        pick.setAttribute('aria-pressed', 'true');
        pick.title = messageText('ui.walking.cancel');
        actions.pick(matchingCandidates(), onMapPoint);
    });
    gates.addEventListener('change', changed);
    preview.addEventListener('click', runPreview);
    allowGates.addEventListener('click', () => {
        gates.checked = true;
        runPreview();
        preview.focus();
    });
    reset.addEventListener('click', () => {
        closeEditor();
        stops = [undefined, undefined];
        station.value = floor.value = kind.value = '';
        gates.checked = true;
        changed();
        render();
    });
    render();
    showDraftStatus();

    return {
        closeEditor,
        showPreviewResult,
        /** Dismiss the current interaction on Escape. */
        cancelEditing(): boolean {
            const wasEditing = editing !== undefined;
            closeEditor();
            return wasEditing;
        },
        /** Preserve stable place IDs and access rules across URL and language restoration. */
        snapshot(): WalkingDraft {
            return { ids: stops.map(place => place?.id ?? null), allowPaid: gates.checked };
        },
        /** Enable route previews and map picking once the 3D scene has loaded. */
        enableMap(): void {
            mapReady = true;
            refreshActions();
        },
        /** Import a supported facility as an endpoint or append it before the destination. */
        usePlace(id: string, role: 'start' | 'end' | 'stop'): void {
            const candidate = byId.get(id);
            if (!candidate) {
                return;
            }
            closeEditor();
            if (role === 'stop') {
                if (add.disabled) {
                    return;
                }
                stops.splice(stops.length - 1, 0, candidate);
            } else {
                stops[role === 'start' ? 0 : stops.length - 1] = candidate;
            }
            changed();
            render();
        },
        /** Report whether there is room to add a place to an existing itinerary. */
        canAddStop(): boolean {
            return !add.disabled && stops.some(place => place !== undefined);
        },
        /** Clear the route draft together with the atlas-wide reset. */
        reset(): void {
            reset.click();
        }
    };
}
