import type { FacilityKind, Level, StationId } from '../../domain/map/model.ts';
import type { WalkingPlace } from '../../application/navigation/walking-route.ts';
import { maxWalkingStops } from '../../application/navigation/walking-route.ts';
import { facilityCategory } from '../../application/exploration/facility-filter.ts';
import { messageText } from '../../infrastructure/i18n/index.ts';
import { matchingOptions, searchDelayMs } from './panel-select.ts';
import { floorOptions } from './floor-options.ts';
import { createFacilityIcon } from './facility-icon.ts';

interface WalkingActions {
    preview(places: WalkingPlace[], allowPaid: boolean): string;
    clear(): void;
    pick(places: WalkingPlace[] | undefined, onPick: (id: string) => void): void;
    kindLabel(kind: FacilityKind): string;
}

interface WalkingField {
    element: HTMLElement;
    input: HTMLInputElement;
    clear: HTMLButtonElement;
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
    actions: WalkingActions,
    restored?: WalkingDraft
) {
    const rows = panel.querySelector<HTMLOListElement>('#walking-places')!;
    const add = panel.querySelector<HTMLButtonElement>('#walking-add')!;
    const station = panel.querySelector<HTMLSelectElement>('#walking-station')!;
    const floor = panel.querySelector<HTMLSelectElement>('#walking-floor')!;
    const kind = panel.querySelector<HTMLSelectElement>('#walking-kind')!;
    const pick = panel.querySelector<HTMLButtonElement>('#walking-pick')!;
    const mapChoice = panel.querySelector<HTMLElement>('#walking-map-choice')!;
    const confirm = panel.querySelector<HTMLButtonElement>('#walking-confirm')!;
    const cancel = panel.querySelector<HTMLButtonElement>('#walking-cancel')!;
    const pickStatus = panel.querySelector<HTMLElement>('#walking-pick-status')!;
    const results = panel.querySelector<HTMLElement>('#walking-results')!;
    const searchStatus = panel.querySelector<HTMLElement>('#walking-search-status')!;
    const gates = panel.querySelector<HTMLInputElement>('#walking-gates')!;
    const preview = panel.querySelector<HTMLButtonElement>('#walking-preview')!;
    const reset = panel.querySelector<HTMLButtonElement>('#walking-clear')!;
    const status = panel.querySelector<HTMLElement>('#walking-status')!;
    const floors = floorOptions(levels);
    const byId = new Map(places.map(place => [place.id, place]));
    const endpointKinds = [...new Set(places.flatMap(place => place.kind ? [facilityCategory(place.kind)] : []))];
    let stops: (WalkingPlace | undefined)[] = restored && restored.ids.length >= 2 && restored.ids.length <= maxWalkingStops + 2
        ? restored.ids.map(id => id ? byId.get(id) : undefined)
        : [undefined, undefined];
    let fields: WalkingField[] = [];
    let editing: number | undefined;
    let query = '';
    let composing = false;
    let timer: number | undefined;
    let active = -1;
    let visible: WalkingPlace[] = [];
    let candidate: WalkingPlace | undefined;
    let picking = false;
    let mapReady = false;
    gates.checked = restored?.allowPaid ?? false;

    station.replaceChildren(new Option(messageText('ui.filters.allStations'), ''), ...stations.map(item => new Option(item.name, item.id)));
    floor.replaceChildren(new Option(messageText('ui.floors.all'), ''), ...floors.map(item => new Option(item.label, item.id)));
    kind.replaceChildren(new Option(messageText('ui.walking.allKinds'), ''), ...endpointKinds.map(item => new Option(actions.kindLabel(item), item)));

    /** Disambiguate nearby points by station, floor and gate side. */
    function context(place: WalkingPlace): string {
        const owner = stations.find(item => item.id === place.station)!.name;
        const level = levels.find(item => item.id === place.level)!.label;
        const access = messageText(place.access === 'inside' ? 'ui.walking.inside' : 'ui.walking.outside');
        return `${owner} · ${level} · ${access}`;
    }

    /** Apply the optional filters to the endpoints available for this edit. */
    function matchingPlaces(): WalkingPlace[] {
        const members = floors.find(item => item.id === floor.value)?.members;
        return places.filter(place => (!station.value || place.station === station.value) &&
            (!members || members.some(level => level.id === place.level)) &&
            (!kind.value || place.kind && facilityCategory(place.kind) === kind.value));
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

    /** Keep the route button disabled until all displayed slots hold real endpoints. */
    function refreshActions(): void {
        add.disabled = stops.length >= maxWalkingStops + 2;
        preview.disabled = !mapReady || stops.some(stop => !stop);
        pick.disabled = !mapReady || !matchingPlaces().length;
    }

    /** Invalidate the drawn route when the itinerary or gate policy changes. */
    function changed(): void {
        actions.clear();
        status.hidden = true;
        refreshActions();
    }

    /** Update a field to show its confirmed place, rather than any abandoned search text. */
    function showPlace(index: number): void {
        const field = fields[index]!;
        const place = stops[index];
        field.input.value = place?.name ?? '';
        field.input.title = place ? `${place.name} · ${context(place)}` : '';
        field.clear.hidden = !place && (index === 0 || index === stops.length - 1);
    }

    /** Render only itinerary structure changes; typing never replaces the focused field. */
    function render(): void {
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
            fields.push({ element: field, input, clear });
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
            field.append(label, input, clear);
            row.append(field);
            if (intermediate && stops.length > 3) {
                const order = document.createElement('div');
                order.className = 'walking-order';
                if (index > 1) {
                    order.append(button('↑', messageText('ui.walking.up', { role }), () => move(index, -1)));
                }
                if (index < stops.length - 2) {
                    order.append(button('↓', messageText('ui.walking.down', { role }), () => move(index, 1)));
                }
                row.append(order);
            }
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
        visible = needsQuery ? [] : matchingOptions(matchingPlaces().map(place => ({
            place,
            label: `${place.name} · ${context(place)}`
        })), query).map(option => option.place);
        if (!visible.length) {
            searchStatus.textContent = messageText(needsQuery ? 'ui.walking.prompt' : 'ui.facilities.searchEmpty');
            searchStatus.hidden = false;
            return;
        }
        for (const [index, place] of visible.entries()) {
            const option = document.createElement('div');
            option.id = `${results.id}-${index}`;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            const text = document.createElement('div');
            const name = document.createElement('strong');
            name.textContent = place.name;
            const detail = document.createElement('span');
            detail.textContent = context(place);
            text.append(name, detail);
            if (place.kind) {
                option.append(createFacilityIcon(place.kind));
            }
            option.append(text);
            option.addEventListener('click', () => accept(place));
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
            } else if (visible[active] ?? visible[0]) {
                accept((visible[active] ?? visible[0])!);
            }
        } else if (visible.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            results.children[active]?.setAttribute('aria-selected', 'false');
            active = Math.min(visible.length - 1, Math.max(0, active + (event.key === 'ArrowDown' ? 1 : -1)));
            const option = results.children[active] as HTMLElement;
            option.setAttribute('aria-selected', 'true');
            fields[index]!.input.setAttribute('aria-activedescendant', option.id);
            results.scrollTop += Math.min(0, option.offsetTop - results.scrollTop) +
                Math.max(0, option.offsetTop + option.offsetHeight - results.scrollTop - results.clientHeight);
        }
    }

    /** Change the order of intermediate stops without moving either endpoint. */
    function move(index: number, by: -1 | 1): void {
        closeEditor();
        [stops[index], stops[index + by]] = [stops[index + by], stops[index]];
        render();
        changed();
        fields[index + by]?.input.focus();
    }

    /** Show the map-picked location before it becomes a confirmed stop. */
    function onMapPoint(id?: string): void {
        candidate = id ? byId.get(id) : undefined;
        confirm.hidden = !candidate;
        pickStatus.textContent = candidate
            ? messageText('ui.walking.picked', { name: `${candidate.name} · ${context(candidate)}` })
            : messageText('ui.walking.pickHint');
    }

    /** Exit map picking without clearing the field being edited. */
    function stopPicking(): void {
        if (picking) {
            picking = false;
            actions.pick(undefined, onMapPoint);
        }
        mapChoice.hidden = true;
        onMapPoint();
    }

    /** End the current edit and discard any unconfirmed text or map position. */
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
    function accept(place: WalkingPlace): void {
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
            actions.pick(matchingPlaces(), onMapPoint);
            onMapPoint();
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
        ensureEditing();
        hideResults();
        picking = true;
        mapChoice.hidden = false;
        actions.pick(matchingPlaces(), onMapPoint);
        onMapPoint();
    });
    confirm.addEventListener('click', () => {
        if (candidate) {
            accept(candidate);
            pick.focus();
        }
    });
    cancel.addEventListener('click', () => {
        stopPicking();
        refreshResults();
        pick.focus();
    });
    gates.addEventListener('change', changed);
    preview.addEventListener('click', () => {
        closeEditor();
        status.textContent = actions.preview(stops.filter(place => place !== undefined), gates.checked);
        status.hidden = false;
    });
    reset.addEventListener('click', () => {
        closeEditor();
        stops = [undefined, undefined];
        station.value = floor.value = kind.value = '';
        gates.checked = false;
        changed();
        render();
    });
    render();

    return {
        closeEditor,
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
        usePlace(place: WalkingPlace, role: 'start' | 'end' | 'stop'): void {
            closeEditor();
            if (role === 'stop') {
                if (add.disabled) {
                    return;
                }
                stops.splice(stops.length - 1, 0, place);
            } else {
                stops[role === 'start' ? 0 : stops.length - 1] = place;
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
