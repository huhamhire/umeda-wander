interface SelectOption {
    value: string;
    label: string;
    code?: string;
    icon?: () => SVGSVGElement;
    notifyOnReselect?: boolean;
}

interface SelectSearch {
    label: string;
    empty: string;
}

/** Delay filtering until text entry pauses or the IME commits its composition. */
export const searchDelayMs = 200;

/** Bind a panel-width DOM list to a field, with optional live search for longer lists. */
export function bindPanelSelect(trigger: HTMLButtonElement, panel: HTMLElement, search?: SelectSearch) {
    const menu = document.createElement('div');
    const list = document.createElement('div');
    const valueLabel = trigger.querySelector('span')!;
    const input = search ? document.createElement('input') : undefined;
    const status = document.createElement('p');
    let options: SelectOption[] = [];
    let visible: SelectOption[] = [];
    let value = '';
    let placeholder = valueLabel.textContent;
    let searchPrompt: string | undefined;
    let active = -1;
    let composing = false;
    let pendingSearch: number | undefined;

    menu.id = trigger.id + '-menu';
    menu.className = 'panel-select-menu';
    menu.popover = 'auto';
    list.id = trigger.id + '-options';
    list.className = 'panel-select-options';
    list.setAttribute('role', 'listbox');
    const label = trigger.getAttribute('aria-label')!;
    list.setAttribute('aria-label', label);
    if (input && search) {
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-label', label);
        input.type = 'search';
        input.className = 'panel-select-search';
        input.placeholder = search.label;
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-label', search.label);
        input.setAttribute('aria-controls', list.id);
        input.setAttribute('aria-expanded', 'true');
        input.setAttribute('aria-autocomplete', 'list');
        input.autocomplete = 'off';
        menu.append(input);
    } else {
        trigger.setAttribute('role', 'combobox');
    }
    status.className = 'panel-select-empty';
    status.setAttribute('role', 'status');
    status.hidden = true;
    menu.append(list, status);
    panel.append(menu);
    trigger.setAttribute('popovertarget', menu.id);
    trigger.setAttribute('aria-haspopup', input ? 'dialog' : 'listbox');
    trigger.setAttribute('aria-controls', input ? menu.id : list.id);
    trigger.setAttribute('aria-expanded', 'false');
    const keyTarget: HTMLElement = input ?? trigger;

    /** Align with the panel's content box and stay clear of the mobile keyboard. */
    function placeMenu(): void {
        const field = trigger.getBoundingClientRect();
        const bounds = panel.getBoundingClientRect();
        const style = window.getComputedStyle(panel);
        const leftInset = Number.parseFloat(style.paddingLeft) || 0;
        const rightInset = Number.parseFloat(style.paddingRight) || 0;
        const viewport = window.visualViewport;
        const layoutHeight = document.documentElement.clientHeight;
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportBottom = viewportTop + (viewport?.height ?? layoutHeight);
        const gap = 6;
        const upperEdge = Math.min(field.top - gap, viewportBottom - gap);
        const lowerEdge = Math.max(field.bottom + gap, viewportTop + gap);
        const above = upperEdge - viewportTop - gap;
        const below = viewportBottom - lowerEdge - gap;
        const opensAbove = below < 240 && above > below;
        menu.style.left = `${bounds.left + panel.clientLeft + leftInset}px`;
        menu.style.width = `${Math.max(0, panel.clientWidth - leftInset - rightInset)}px`;
        menu.style.top = opensAbove ? 'auto' : `${lowerEdge}px`;
        menu.style.bottom = opensAbove ? `${layoutHeight - upperEdge}px` : 'auto';
        menu.style.maxHeight = `${Math.max(0, Math.min(336, opensAbove ? above : below))}px`;
    }

    /** Keep assistive focus on the active option and scroll within the list only. */
    function highlight(index: number): void {
        list.children[active]?.classList.remove('active');
        active = Math.max(-1, Math.min(index, visible.length - 1));
        const item = list.children[active] as HTMLElement | undefined;
        if (!item) {
            keyTarget.removeAttribute('aria-activedescendant');
            return;
        }
        item.classList.add('active');
        keyTarget.setAttribute('aria-activedescendant', item.id);
        const row = item.getBoundingClientRect();
        const bounds = list.getBoundingClientRect();
        list.scrollTop += Math.min(0, row.top - bounds.top) + Math.max(0, row.bottom - bounds.bottom);
    }

    /** Render matching labels in their supplied order without interpreting them as markup. */
    function renderOptions(): void {
        const query = input?.value ?? '';
        const needsQuery = searchPrompt !== undefined && !query.trim();
        visible = needsQuery ? [] : matchingOptions(options, query);
        list.replaceChildren(...visible.map((option, index) => {
            const item = document.createElement('div');
            item.id = `${list.id}-${index}`;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(option.value === value));
            writeLabel(item, option.label, option.icon);
            if (option.code) {
                item.dataset.code = option.code;
            }
            item.addEventListener('click', () => choose(option));
            return item;
        }));
        status.hidden = visible.length > 0;
        status.textContent = needsQuery ? searchPrompt! : search?.empty ?? '';
        list.scrollTop = 0;
        highlight(Math.max(0, visible.findIndex(option => option.value === value)));
    }

    /** Cancel a pending search when its input or menu lifecycle changes. */
    function cancelSearch(): void {
        window.clearTimeout(pendingSearch);
        pendingSearch = undefined;
    }

    /** Remove stale results so neither the keyboard nor a pointer can commit them. */
    function clearResults(): void {
        if (visible.length) {
            visible = [];
            list.replaceChildren();
            highlight(-1);
        }
        status.hidden = true;
    }

    /** Search committed text only, with whitespace-only input restoring the initial menu state. */
    function queueSearch(): void {
        cancelSearch();
        if (!input || !menu.matches(':popover-open')) {
            return;
        }
        if (!input.value.trim()) {
            renderOptions();
            return;
        }
        clearResults();
        pendingSearch = window.setTimeout(() => {
            pendingSearch = undefined;
            if (menu.matches(':popover-open')) {
                renderOptions();
            }
        }, searchDelayMs);
    }

    /** Keep the field caption in sync with the chosen option or empty-state message. */
    function setValue(next: string): void {
        const option = options.find(item => item.value === next);
        value = option?.value ?? '';
        writeLabel(valueLabel, option?.label ?? placeholder, option?.icon);
        trigger.setAttribute('aria-label', `${label} · ${valueLabel.textContent}`);
    }

    /** Keep optional decoration together with text so the selection tick stays at the edge. */
    function writeLabel(container: HTMLElement, text: string, icon?: SelectOption['icon']): void {
        if (!icon) {
            container.textContent = text;
            return;
        }
        const row = document.createElement('span');
        row.className = 'panel-select-label';
        const name = document.createElement('span');
        name.textContent = text;
        row.append(icon(), name);
        container.replaceChildren(row);
    }

    /** Close the transient list and give keyboard focus back to its field when requested. */
    function close(restoreFocus = false): void {
        cancelSearch();
        composing = false;
        if (menu.matches(':popover-open')) {
            menu.hidePopover();
        }
        trigger.setAttribute('aria-expanded', 'false');
        keyTarget.removeAttribute('aria-activedescendant');
        if (restoreFocus) {
            trigger.focus({ preventScroll: true });
        }
    }

    /** Commit an explicit choice, then notify existing filter or facility handlers. */
    function choose(option: SelectOption): void {
        close(true);
        if (option.value !== value || option.notifyOnReselect) {
            setValue(option.value);
            trigger.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    /** Open the list at the selected option and focus search when provided. */
    function open(): void {
        cancelSearch();
        composing = false;
        if (input) {
            input.value = '';
        }
        placeMenu();
        menu.showPopover();
        trigger.setAttribute('aria-expanded', 'true');
        renderOptions();
        keyTarget.focus({ preventScroll: true });
    }

    trigger.addEventListener('click', event => {
        event.preventDefault();
        if (menu.matches(':popover-open')) {
            close();
        } else {
            open();
        }
    });
    trigger.addEventListener('keydown', event => {
        if (input && !menu.matches(':popover-open') && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            open();
        }
    });
    keyTarget.addEventListener('keydown', (event: KeyboardEvent) => {
        if (composing || event.isComposing || event.keyCode === 229) {
            return;
        }
        if (!menu.matches(':popover-open')) {
            if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
                event.preventDefault();
                open();
            }
            return;
        }
        if (event.key === 'Tab' || event.key === 'Escape') {
            if (event.key === 'Escape') {
                event.preventDefault();
            }
            close(true);
        } else if (event.key === 'Enter' || (!input && event.key === ' ')) {
            event.preventDefault();
            if (pendingSearch !== undefined) {
                cancelSearch();
                renderOptions();
                return;
            }
            const option = visible[active];
            if (option) {
                choose(option);
            }
        } else if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            highlight(Math.max(0, active + (event.key === 'ArrowDown' ? 1 : -1)));
        } else if (!input && ['Home', 'End'].includes(event.key)) {
            event.preventDefault();
            highlight(event.key === 'Home' ? 0 : visible.length - 1);
        }
    });
    input?.addEventListener('compositionstart', () => {
        composing = true;
        cancelSearch();
        clearResults();
    });
    input?.addEventListener('compositionend', () => {
        composing = false;
        queueSearch();
    });
    input?.addEventListener('input', event => {
        if (!composing && !(event as InputEvent).isComposing) {
            queueSearch();
        }
    });
    list.addEventListener('mousedown', event => event.preventDefault());
    menu.addEventListener('toggle', () => {
        if (!menu.matches(':popover-open')) {
            close();
        }
    });
    const reposition = () => {
        if (menu.matches(':popover-open')) {
            const field = trigger.getBoundingClientRect();
            const bounds = panel.getBoundingClientRect();
            if (trigger.getClientRects().length && field.bottom > bounds.top && field.top < bounds.bottom) {
                placeMenu();
            } else {
                close();
            }
        }
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', event => {
        if (event.target !== list) {
            reposition();
        }
    }, { capture: true, passive: true });
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);

    return {
        /** Read the committed field value. */
        get value(): string {
            return value;
        },
        /** Restore a previously committed value that still exists in the filtered choices. */
        set value(next: string) {
            setValue(next);
        },
        /** Refresh the available choices without firing a change event. */
        setOptions(next: SelectOption[], selected: string, field: { placeholder?: string; searchPrompt?: string } = {}): void {
            close();
            options = next;
            placeholder = field.placeholder ?? placeholder;
            searchPrompt = field.searchPrompt;
            trigger.disabled = next.length === 0;
            setValue(selected);
        },
        close,
    };
}

/** Match all search words against the localized facility name, including full-width forms. */
export function matchingOptions<T extends Pick<SelectOption, 'label'>>(options: readonly T[], query: string): T[] {
    const words = query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
        return [...options];
    }
    return options.filter(option => {
        const label = option.label.normalize('NFKC').toLowerCase();
        return words.every(word => label.includes(word));
    });
}
