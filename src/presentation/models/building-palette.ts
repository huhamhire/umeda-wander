const white = { wall: 0xe4e5df, tower: 0xd5dcda, trim: 0xf0f0e9 };
const hankyu = { wall: 0xeee3e2, tower: 0xddd0d2, trim: 0xf6eeeb };
/** A light operator flavour, independent of paid-area semantics and photographic textures. */
export function buildingPalette(buildingId: string, volumeName: string) {
    if (['hankyu-dept', 'hankyu-grand', 'hankyu-sanbangai'].includes(buildingId)
        || (buildingId === 'yodobashi' && volumeName === 'Hotel Hankyu RESPIRE')) {
        return hankyu;
    }
    return white;
}
