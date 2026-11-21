import { messageText } from '../../infrastructure/i18n/index.ts';

type LoadingStage = 'stations' | 'passages' | 'equipment' | 'ready';

/** Show each actual loading stage before the next block of map setup starts. */
export function bindMapLoading(root: HTMLElement) {
    const label = root.querySelector('[data-loading-status]')!;
    return {
        /** Let the browser paint the status before synchronous work blocks rendering. */
        async show(stage: LoadingStage): Promise<void> {
            const title = messageText(`ui.map.loading.${stage}`);
            if (label.textContent !== title) {
                label.textContent = title;
            }
            await new Promise<void>(resolve => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => resolve());
                });
            });
        },
        /** Dismiss the loading indicator when the first frame or the error screen is ready. */
        hide(): void {
            root.hidden = true;
        }
    };
}
