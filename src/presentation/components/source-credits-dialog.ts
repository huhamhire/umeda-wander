/** Native showModal supplies top-layer isolation and makes the rest of the document inert. */
export function bindCreditsDialog(dialog: HTMLDialogElement, trigger: HTMLElement, close: HTMLButtonElement, heading: HTMLElement): void {
    trigger.addEventListener(
        'click',
        event => {
            event.preventDefault();
            if (!dialog.open) {
                dialog.showModal();
                heading.focus({ preventScroll: true });
            }
        }
    );
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('cancel', event => {
        event.preventDefault();
        dialog.close();
    });
    dialog.addEventListener('close', () => trigger.focus({ preventScroll: true }));
    dialog.addEventListener(
        'keydown',
        event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                dialog.close();
                return;
            }
            if (event.key !== 'Tab') {
                return;
            }
            const targets = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],select:not([disabled]),[tabindex="0"]')];
            const first = targets[0];
            const last = targets.at(-1);
            const active = dialog.ownerDocument.activeElement;
            if (event.shiftKey && (active === first || active === heading)) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first?.focus();
            }
        }
    );
}
