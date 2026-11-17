import * as T from 'three';
import { viewBasis } from './view-orientation.ts';
interface ScreenRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** At maximum zoom-out the map occupies 80% of the unobscured vertical space. */
export function minimumMapZoom(baseSpan: number, verticalExtent: number, canvasHeight: number, usableHeight: number): number {
    const maximumSpan = Math.max(1, verticalExtent) * Math.max(1, canvasHeight) / (Math.max(1, usableHeight) * 0.8);
    return baseSpan / maximumSpan;
}

/** Canvas-local rectangle left clear by the floating navigation. */
export function facilityFocusRect(viewport: ScreenRect, sidebar: ScreenRect | undefined, mobile: boolean): ScreenRect {
    let left = 0;
    let bottom = viewport.height;
    if (sidebar && sidebar.left < viewport.left + viewport.width && sidebar.left + sidebar.width > viewport.left &&
        sidebar.top < viewport.top + viewport.height && sidebar.top + sidebar.height > viewport.top) {
        if (mobile) {
            bottom = Math.max(1, Math.min(bottom, sidebar.top - viewport.top - 12));
        }
        else {
            left = Math.max(0, Math.min(viewport.width - 1, sidebar.left + sidebar.width - viewport.left + 16));
        }
    }
    return {
        left,
        top: 0,
        width: viewport.width - left,
        height: bottom
    };
}

/** Position the orthographic look-at target so the anchor projects to the usable center. */
export function facilityCameraCenter(anchor: T.Vector3, span: number, width: number, height: number, usable: ScreenRect): T.Vector3 {
    const { right, up } = viewBasis();
    const scale = span / Math.max(1, height);
    const dx = usable.left + usable.width / 2 - width / 2;
    const dy = usable.top + usable.height / 2 - height / 2;
    return anchor.clone().addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale);
}
