const white = { wall: 0xe4e5df, tower: 0xd5dcda, trim: 0xf0f0e9 };
const hankyu = { wall: 0xeee3e2, tower: 0xddd0d2, trim: 0xf6eeeb };
const slate = { wall: 0x45575c, tower: 0x394e58, trim: 0x586b72 };
const hankyuNight = { wall: 0x554751, tower: 0x493b49, trim: 0x675561 };

/** Pair model exterior tones with their operator tint across both themes. */
export function buildingPalette(buildingId: string, volumeName: string, dark = false) {
    if (['hankyu-dept', 'hankyu-grand', 'hankyu-sanbangai'].includes(buildingId)
        || (buildingId === 'yodobashi' && volumeName === 'Hotel Hankyu RESPIRE')) {
        return dark ? hankyuNight : hankyu;
    }
    return dark ? slate : white;
}
