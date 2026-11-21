import * as T from 'three';

// Keep the droplet close to the modeled elevator cabin's height.
const dropletWorldScale = .7;

/** Revolve a smooth droplet around its vertical axis, with the tip at the route point. */
export function createRoutePositionMarker(): T.Group {
    const group = new T.Group();
    group.name = 'route-position-marker';
    const profile = new T.Path();
    profile.moveTo(0, 0);
    profile.bezierCurveTo(.08, .46, .56, 1.13, .96, 1.97);
    profile.bezierCurveTo(1.36, 2.81, 1.10, 3.76, 0, 3.76);
    const geometry = new T.LatheGeometry(profile.getPoints(16), 32);
    geometry.scale(dropletWorldScale, dropletWorldScale, dropletWorldScale);
    const material = new T.MeshPhysicalMaterial({
        color: 0x117dff,
        emissive: 0x0044b5,
        emissiveIntensity: .35,
        roughness: .32,
        clearcoat: .55,
        clearcoatRoughness: .26
    });
    group.add(new T.Mesh(geometry, material));
    group.visible = false;
    return group;
}
