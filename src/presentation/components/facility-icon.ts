import type { FacilityKind } from '../../domain/map/model.ts';

// Original silhouettes use familiar station-sign motifs without embedding source artwork.
const glyphs: Record<FacilityKind | 'all', string> = {
    all: '<path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"/>',
    entrance: '<path d="M4 3h12v6h-2V5H6v14h8v-4h2v6H4z"/><path d="m16 7 5 5-5 5-1.4-1.4 2.6-2.6H9v-2h8.2l-2.6-2.6z"/>',
    platform: '<path fill-rule="evenodd" d="M5 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zm2 1v5h10V7zm1 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/><path d="m7 17 2 1-3 4H3zm10 0 4 5h-3l-3-4z"/>',
    gate: '<path d="M3 9h5v12H3zm13 0h5v12h-5zM3 6h5v2H3zm13 0h5v2h-5z"/><path d="m12 3 4 4-1.4 1.4-1.6-1.6V16h-2V6.8L9.4 8.4 8 7z"/>',
    ticket: '<path fill-rule="evenodd" d="M3 6h18v4a2 2 0 1 0 0 4v4H3v-4a2 2 0 1 0 0-4zm5 4v1.5h8V10zm0 3v1.5h6V13z"/>',
    'ticket-machine': '<path fill-rule="evenodd" d="M3 3h9v18H3zm2 2v6h5V5zm1 9v2h3v-2z"/><circle cx="17.5" cy="7" r="2.1"/><path d="M15 11h5l1 3v7h-6v-6l-2 1-2-3 1.5-1 1 1.5z"/>',
    escalator: '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" d="M4.5 15h3l7-8h5a2 2 0 1 1 0 4h-3l-7 8h-5a2 2 0 1 1 0-4Z"/><circle cx="9" cy="4" r="1.6"/><path d="M7.5 6.4h3v5.2l-3 2.5z"/>',
    elevator: '<path fill-rule="evenodd" d="M4 9h16v13H4zm2 2v9h12v-9z"/><path d="M7 2h1.5v4.2l1.7-1.7 1 1-3.4 3.4-3.4-3.4 1-1L7 6.2zm9 0 3.4 3.4-1 1-1.7-1.7V9h-1.5V4.7l-1.7 1.7-1-1z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M8 14.5h2V19H8zm6 0h2V19h-2z"/>',
    stairs: '<path fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" d="M2 20h5v-4h5v-4h5V8h5"/><circle cx="11" cy="3.8" r="1.6"/><path d="m10 6 2 1 1.4 2.1-1.3 1-1.7-1.7-1.1 2.3 1.3 2.7-1.5.7-1.8-3.4-1.4 2-1.5-.8 2.1-3.1L8 6z"/>',
    information: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m-3.9 6.5a4.1 4.1 0 0 1 7.9 1.3c0 1.7-1 2.6-2.1 3.3-.8.5-1.1.7-1.1 1.5h-2c0-1.7.8-2.3 1.8-3 .7-.5 1.3-.9 1.3-1.8a2 2 0 0 0-3.9-.5zm3.8 7.3a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2"/>',
    'convenience-store': '<path fill-rule="evenodd" d="M3 9h18v12H3zm3 3v6h6v-6zm9 0v9h3v-9z"/><path d="M5 3h14l3 5H2z"/>',
    police: '<path d="M4 6 12 2l8 4-3 3H7zM7 10h10a5 5 0 0 1-10 0zm-3 9c0-2 2.6-3.4 5.3-3.8L12 19l2.7-3.8c2.7.4 5.3 1.8 5.3 3.8v3H4z"/>',
    'luggage-storage': '<path d="M2 19h20v2H2z"/><path fill-rule="evenodd" d="M5 8h4V5h6v3h4v9H5zm6-1v1h2V7zM8 10v5h1.5v-5zm6.5 0v5H16v-5z"/>',
    locker: '<path fill-rule="evenodd" d="M3 8h18v14H3zm2 2v10h14V10z"/><path d="M7 12h10v6H7zm3-1h4v2h-4z"/><path fill-rule="evenodd" d="M7 2a2.5 2.5 0 1 0 2.2 3.7H15V4.5h2v-2H9.2A2.5 2.5 0 0 0 7 2m0 1.4a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/>'
};

/** Create a decorative SVG next to an already translated accessible facility name. */
export function createFacilityIcon(kind: FacilityKind | 'all'): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'facility-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = glyphs[kind];
    return svg;
}
