import type { FacilityKind, Level, StationId } from '../../domain/map/model.ts';
import type { WalkingPlace } from '../../application/navigation/walking-route.ts';
import { maxWalkingStops } from '../../application/navigation/walking-route.ts';
import { facilityCategory } from '../../application/exploration/facility-filter.ts';
import { messageText } from '../../infrastructure/i18n/index.ts';
import { bindPanelSelect } from './panel-select.ts';
import { floorOptions } from './floor-options.ts';
import { createFacilityIcon } from './facility-icon.ts';

interface WalkingActions {
    preview(places: WalkingPlace[], allowPaid: boolean): string;
    clear(): void;
    pick(places: WalkingPlace[] | undefined, onPick: (id: string) => void): void;
    kindLabel(kind: FacilityKind): string;
}

export interface WalkingDraft {
    ids: (string | null)[];
    allowPaid: boolean;
}

/** Edit an ordered itinerary using the same IME-aware search control as the facility panel. */
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
    const editor = panel.querySelector<HTMLElement>('#walking-editor')!;
    const station = panel.querySelector<HTMLSelectElement>('#walking-station')!;
    const floor = panel.querySelector<HTMLSelectElement>('#walking-floor')!;
    const kind = panel.querySelector<HTMLSelectElement>('#walking-kind')!;
    const choice = panel.querySelector<HTMLButtonElement>('#walking-place')!;
    const pick = panel.querySelector<HTMLButtonElement>('#walking-pick')!;
    const confirm = panel.querySelector<HTMLButtonElement>('#walking-confirm')!;
    const cancel = panel.querySelector<HTMLButtonElement>('#walking-cancel')!;
    const pickStatus = panel.querySelector<HTMLElement>('#walking-pick-status')!;
    const gates = panel.querySelector<HTMLInputElement>('#walking-gates')!;
    const preview = panel.querySelector<HTMLButtonElement>('#walking-preview')!;
    const clear = panel.querySelector<HTMLButtonElement>('#walking-clear')!;
    const status = panel.querySelector<HTMLElement>('#walking-status')!;
    const picker = bindPanelSelect(choice, panel, { label: messageText('ui.facilities.search'), empty: messageText('ui.facilities.searchEmpty') });
    const floors = floorOptions(levels);
    const byId = new Map(places.map(place => [place.id, place]));
    const endpointKinds = [...new Set(places.flatMap(place => place.kind ? [facilityCategory(place.kind)] : []))];
    let stops: (WalkingPlace | undefined)[] = restored && restored.ids.length >= 2 && restored.ids.length <= maxWalkingStops + 2
        ? restored.ids.map(id => id ? byId.get(id) : undefined)
        : [undefined, undefined];
    let editing: number | undefined;
    let candidate: WalkingPlace | undefined;
    let picking = false;
    let mapReady = false;
    gates.checked = restored?.allowPaid ?? false;

    station.replaceChildren(new Option(messageText('ui.filters.allStations'), ''), ...stations.map(item => new Option(item.name, item.id)));
    floor.replaceChildren(new Option(messageText('ui.floors.all'), ''), ...floors.map(item => new Option(item.label, item.id)));
    kind.replaceChildren(new Option(messageText('ui.walking.allKinds'), ''), ...endpointKinds.map(item => new Option(actions.kindLabel(item), item)));

    /** Include the operator, floor and gate side so similarly named stops remain distinguishable. */
    function caption(place: WalkingPlace): string {
        const owner = stations.find(item => item.id === place.station)!.name;
        const level = levels.find(item => item.id === place.level)!.label;
        const access = messageText(place.access === 'inside' ? 'ui.walking.inside' : 'ui.walking.outside');
        return `${place.name} · ${owner} · ${level} · ${access}`;
    }

    /** Apply only this editor's filters to the authored set of route endpoints. */
    function matchingPlaces(): WalkingPlace[] {
        const members = floors.find(item => item.id === floor.value)?.members;
        return places.filter(place => (!station.value || place.station === station.value) &&
            (!members || members.some(level => level.id === place.level)) &&
            (!kind.value || place.kind && facilityCategory(place.kind) === kind.value));
    }

    /** Update the picker and cancel an unconfirmed map point when filters change. */
    function refreshChoices(): void {
        const matching = matchingPlaces();
        if (picking) {
            actions.pick(matching, onMapPoint);
            onMapPoint();
        }
        picker.setOptions(matching.map(place => ({
            value: place.id,
            label: caption(place),
            icon: place.kind && (() => createFacilityIcon(place.kind!))
        })), '', {
            placeholder: messageText(matching.length ? 'ui.walking.choose' : 'ui.facilities.empty'),
            searchPrompt: station.value ? undefined : messageText('ui.walking.prompt')
        });
        pick.disabled = !mapReady || matching.length === 0;
    }

    /** Create an action with a visible symbol or label and an explicit accessible name. */
    function button(text: string, label: string, run: () => void): HTMLButtonElement {
        const result = document.createElement('button');
        result.type = 'button';
        result.textContent = text;
        result.setAttribute('aria-label', label);
        result.addEventListener('click', run);
        return result;
    }

    /** Render the fixed endpoints and ordered, removable intermediate stops. */
    function render(): void {
        rows.replaceChildren(...stops.map((place, index) => {
            const row = document.createElement('li');
            const role = index === 0 ? messageText('ui.walking.start') : index === stops.length - 1
                ? messageText('ui.walking.end') : messageText('ui.walking.stop', { number: index });
            const label = document.createElement('span');
            label.textContent = role;
            const summary = place ? caption(place) : messageText('ui.walking.choose');
            row.append(label, button(summary, `${messageText('ui.walking.change', { role })} · ${summary}`, () => edit(index)));
            if (index > 0 && index < stops.length - 1) {
                const controls = document.createElement('div');
                controls.className = 'walking-actions';
                if (index > 1) {
                    controls.append(button('↑', messageText('ui.walking.up', { role }), () => move(index, -1)));
                }
                if (index < stops.length - 2) {
                    controls.append(button('↓', messageText('ui.walking.down', { role }), () => move(index, 1)));
                }
                controls.append(button('×', messageText('ui.walking.remove', { role }), () => {
                    closeEditor();
                    stops.splice(index, 1);
                    changed();
                    add.focus();
                }));
                row.append(controls);
            }
            return row;
        }));
        add.disabled = stops.length >= maxWalkingStops + 2;
        preview.disabled = !mapReady || stops.some(stop => !stop);
    }

    /** Invalidate the drawn route when its stops or access rules change. */
    function changed(): void {
        actions.clear();
        status.hidden = true;
        render();
    }

    /** Reorder intermediate stops only. */
    function move(index: number, by: -1 | 1): void {
        closeEditor();
        [stops[index], stops[index + by]] = [stops[index + by], stops[index]];
        changed();
        (rows.children[index + by]?.querySelector('button') as HTMLButtonElement | null)?.focus();
    }

    /** Open the location chooser with independent filters for this stop. */
    function edit(index: number): void {
        closeEditor();
        editing = index;
        station.value = floor.value = kind.value = '';
        editor.hidden = false;
        refreshChoices();
        choice.focus();
    }

    /** Accept a map point only after a separate confirmation. */
    function onMapPoint(id?: string): void {
        candidate = id ? byId.get(id) : undefined;
        confirm.hidden = !candidate;
        pickStatus.hidden = !picking;
        pickStatus.textContent = candidate ? messageText('ui.walking.picked', { name: caption(candidate) }) : messageText('ui.walking.pickHint');
    }

    /** Return to the itinerary and release the map's temporary picking mode. */
    function closeEditor(): void {
        picker.close();
        if (picking) {
            picking = false;
            actions.pick(undefined, onMapPoint);
        }
        onMapPoint();
        editor.hidden = true;
        editing = undefined;
    }

    /** Save the chosen place to its slot and put focus back on that row. */
    function accept(place: WalkingPlace): void {
        if (editing === undefined) {
            return;
        }
        const index = editing;
        stops[index] = place;
        closeEditor();
        changed();
        rows.children[index]?.querySelector('button')?.focus();
    }

    for (const field of [station, floor, kind]) {
        field.addEventListener('change', refreshChoices);
    }
    choice.addEventListener('change', () => {
        const place = byId.get(picker.value);
        if (place) {
            accept(place);
        }
    });
    add.addEventListener('click', () => {
        const index = stops.length - 1;
        stops.splice(index, 0, undefined);
        changed();
        edit(index);
    });
    pick.addEventListener('click', () => {
        picker.close();
        picking = true;
        actions.pick(matchingPlaces(), onMapPoint);
        onMapPoint();
    });
    confirm.addEventListener('click', () => {
        if (candidate) {
            accept(candidate);
        }
    });
    /** Return focus to the open stop when the editor is dismissed explicitly. */
    function cancelEditing(): boolean {
        const index = editing;
        if (index === undefined) {
            return false;
        }
        closeEditor();
        rows.children[index]?.querySelector('button')?.focus();
        return true;
    }

    cancel.addEventListener('click', cancelEditing);
    gates.addEventListener('change', changed);
    preview.addEventListener('click', () => {
        closeEditor();
        status.textContent = actions.preview(stops.filter(place => place !== undefined), gates.checked);
        status.hidden = false;
    });
    clear.addEventListener('click', () => {
        closeEditor();
        stops = [undefined, undefined];
        gates.checked = false;
        changed();
    });
    render();

    return {
        closeEditor,
        cancelEditing,
        /** Preserve stable place IDs and access rules across translation reloads. */
        snapshot(): WalkingDraft {
            return { ids: stops.map(place => place?.id ?? null), allowPaid: gates.checked };
        },
        /** Enable route previews and map picking once the 3D scene has loaded. */
        enableMap(): void {
            mapReady = true;
            refreshChoices();
            render();
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
        },
        /** Expose whether a facility can be added to an existing itinerary. */
        canAddStop(): boolean {
            return !add.disabled && stops.some(place => place !== undefined);
        },
        /** Clear the route draft together with the atlas-wide reset. */
        reset(): void {
            clear.click();
        }
    };
}
