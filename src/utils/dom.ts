/**
 * Find a required DOM element and fail with an explicit error when the template is missing it.
 */
export function element<T extends HTMLElement = HTMLElement>(selector: string): T {
    const result = document.querySelector<T>(selector);
    if (!result) {
        throw new Error(`Missing element: ${selector}`);
    }
    return result;
}
