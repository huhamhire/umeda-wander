interface TabControl extends EventTarget {
    tabIndex: number;
    setAttribute(name: string, value: string): void;
    focus(): void;
}
type TabPanel = Pick<HTMLElement, 'hidden'>;

/** Clicks and keyboard navigation share the same selected tab and visible panel. */
export function bindSidebarTabs(buttons: TabControl[], panels: TabPanel[], onSelect?: () => void): (index: number) => void {
    const select = (index: number) => {
        buttons.forEach((button, i) => {
            button.setAttribute('aria-selected', String(index === i));
            button.tabIndex = index === i ? 0 : -1;
            panels[i]!.hidden = index !== i;
        });
        onSelect?.();
    };
    buttons.forEach((button, i) => {
        button.addEventListener('click', () => select(i));
        button.addEventListener(
            'keydown',
            event => {
                const e = event as KeyboardEvent;
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                    return;
                }
                e.preventDefault();
                const target = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
                select(target);
                buttons[target]!.focus();
            }
        );
    });
    select(0);
    return select;
}
