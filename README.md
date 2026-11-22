# Umeda Wander

English · [简体中文](./README.zh-CN.md) · [日本語](./README.ja.md)

Umeda Wander is an interactive 3D map of Osaka’s Umeda station district. Explore station levels, platforms, and ticket gates on one map, and see how underground passages and second-floor pedestrian decks connect the stations to nearby buildings.

The map covers seven stations: JR Osaka, Hankyu Osaka-Umeda, Umeda on the Midosuji Line, Hanshin Osaka-Umeda, Higashi-Umeda on the Tanimachi Line, Nishi-Umeda on the Yotsubashi Line, and JR Kitashinchi.

**The geometry, facility locations, and routes are illustrative and should not be used for on-site navigation.**

## Project background

The project began after the author spent several days in Umeda. Stations run by different railway operators connect through underground shopping arcades, street-level entrances, and pedestrian decks. This network is often called the “Umeda Dungeon.” The project explores how AI can help organize public station plans and geographic data, model the district, and build an interactive map.

> **Station history and sources**
>
> - The first Osaka Station opened in 1874. The subway section between Umeda and Shinsaibashi, now part of the Midosuji Line, opened in 1933. Hanshin relocated its Umeda station underground in 1939. The Umeda Underground Center, now Whity Umeda, opened in 1963 and connected subway ticket gates with nearby department stores and offices. Hankyu completed its expanded Umeda station at its present site in 1973. [Osaka Station City history](https://www.osakastationcity.com/about/gallery/develop.php) · [Osaka Municipal Library](https://www.oml.city.osaka.lg.jp/page/1147.html) · [Hankyu Hanshin group history](https://www.hankyu-hanshin.co.jp/docs/5a3dc356c73b5a393bd52202f6320606d60a6fe2.pdf) · [Hankyu Osaka-Umeda Station history](https://www.hankyu-hanshin.co.jp/release/docs/dbc36f2ba7c005e19e021aab9cf0b947c4bf3802.pdf) · [Osaka Chikagai history](https://www.osaka-chikagai.jp/70th/history)
> - The second-floor pedestrian network continued to expand after Osaka Station City opened in 2011. In 2023, the new Umekita underground platforms joined the existing JR Osaka Station via a passage inside the ticket gates. A pedestrian deck linking the Osaka Station area with Umekita opened in 2024. [Osaka Station City history](https://www.osakastationcity.com/about/gallery/develop.php) · [Umekita underground platforms](https://www.westjr.co.jp/company/info/issue/bsignal/23_vol_199/rail/) · [Osaka Station west-side development](https://www.westjr.co.jp/railroad/project/project22/)
> - Osaka Station City’s area guide calls the district the “Umeda Dungeon.” Osaka/Umeda placed first among seven candidates in J Town Net’s 2019 reader poll about Japan’s most maze-like station. [Osaka Station City area guide](https://media.osakastationcity.com/25942/) · [J Town Net poll](https://j-town.net/2019/03/22277320.html?p=all)

## Map features

- Separate floors to see platforms, ticket gates, escalators, stairs, and elevators. Filter facilities by station, floor, and type, or select them directly on the map.
- Preview walking routes within stations and between JR Osaka Station and Hanshin Osaka-Umeda, Nishi-Umeda, and JR Kitashinchi via Crost outside the ticket gates. A route to Hankyu uses the northern second-floor pedestrian deck. Search for stops or select them on the map, with up to three waypoints. [Walking route design](./docs/design/walking-routes.md)
- Start an automatic tour from the **Free exploration** button in the upper-right corner. The interface supports Chinese, Japanese, and English, with light and dark themes and a mute control.
- Once the view settles, copy the URL to share the camera position, rotation, tilt, zoom, floor, selected facility, and previewed route. The receiving device’s aspect ratio determines how much of the map is visible horizontally.

## Repository structure

```text
umeda-wander/
├── src/          # Map and interface source code
├── data/         # Derived data and geographic configuration
├── references/   # Original reference materials and their catalog
├── scripts/      # Development server, build tools, and offline checks
├── tests/        # Regression tests grouped by domain
└── docs/         # Design, development, and data-source documentation
```

Source layers and assembly entry points are described in the [architecture guide](./docs/development/architecture.md#项目结构).

## Documentation

The design, development, and data-source documents under `docs/` are primarily written in Simplified Chinese.

- [Local development and deployment](./docs/development/run-and-deploy.md) covers startup, VS Code, builds, and static hosting under a URL subpath.
- [Development guides](./docs/development/README.md) cover architecture, coding style, localization, and verification.
- [Documentation index](./docs/README.md) organizes station, public-space, building, and data-source documents.
- [Changelog](./CHANGELOG.md) records changes that affect use and deployment.
- [Roadmap](./docs/roadmap.md) lists planned improvements.

## License and attribution

The project’s original code and documentation are licensed under the [MIT License](./LICENSE). Retain the original copyright and license notices when copying or distributing all or a substantial portion of the software.

If you use the project in your work, crediting “Umeda Wander” and linking to this repository is welcome and optional.

Third-party dependencies, map data, reference materials, and other third-party works retain their respective terms. OpenStreetMap data is used under ODbL 1.0, and the PLATEAU data selected for this project is used under CC BY 4.0. The [source and copyright audit](./docs/data/source-credits-audit.md) documents the publication scope for mixed-source geometry and adapted materials.
