import fs from "fs/promises";
import path from "path";
import RBush from "rbush";
import * as turf from "@turf/turf";

import {
    Feature,
    FeatureCollection,
    Polygon,
    MultiPolygon
} from "geojson";
import {ArchetypeSummary} from "../models/caseStudy.model";

interface IndexedFeature {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    feature: Feature<Polygon | MultiPolygon>;
}

let instanceCount = 0;

export class BuildingService {

    private tree = new RBush<IndexedFeature>();

    private buildingCount = 0;

    private readyPromise: Promise<void>;

    constructor() {
        instanceCount += 1;
        console.log("Instance count", instanceCount)
        this.readyPromise = this.loadAllBuildings();
    }

    /**
     * If we
     * await buildingService.ready();
     * during app startup, then we will know the buildings are actually all loaded.
     */
    public async ready(): Promise<void> {
        await this.readyPromise;
    }

    public getBuildingCount(): number {
        return this.buildingCount;
    }

    /**
     * Read and parse a GeoJSON tile.
     */
    private async loadTile(
        filepath: string
    ): Promise<FeatureCollection> {

        const text = await fs.readFile(
            filepath,
            "utf8"
        );

        return JSON.parse(text);
    }

    private x_for_dev = ['16265', '16266', '16267', '16268', '15'] // the 15 is actually for the directory above.
    private y_for_dev = ['10603', '10604', '10605', '10606']

    /**
     * Recursively find all GeoJSON files.
     */
    private async getGeojsonFiles(
        dir: string
    ): Promise<string[]> {

        const entries = await fs.readdir(
            dir,
            {withFileTypes: true}
        );

        const files = await Promise.all(
            entries.map(async (entry) => {

                const fullPath =
                    path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    // For dev, we just keep a few tiles fr the middle of the map:
                    // if (this.x_for_dev.some((s) => s === entry.name)) {
                    //     // if (true) {
                    //     return this.getGeojsonFiles(
                    //         fullPath
                    //     );
                    // }

                    // For production or demos, we want all the tiles:
                    return this.getGeojsonFiles(
                        fullPath
                    );

                    return [];
                }

                // ['16265/10603.geojson', '16265/10604.geojson', '16265_10605', '16265_10606', '16266_10603', '16266_10604', '16266_10605', '16266_10606', '16267_10603', '16267_10604', '16267_10605', '16267_10606', '16268_10603', '16268_10604', '16268_10605', '16268_10606']

                // For dev, we just keep a few tiles from the middle of the map:
                // return this.y_for_dev.some((s) => fullPath.endsWith(s + ".geojson"))
                return fullPath.endsWith(".geojson") // for production.
                    ? [fullPath]
                    : [];


            })
        );

        return files.flat();
    }

    /**
     * Load all building files and build RBush.
     */
    private async loadAllBuildings(): Promise<void> {

        const baseDir = path.join(
            __dirname,
            "..",
            "data",
            "verisk_sy_buildings"
        );

        const geojsonFiles =
            await this.getGeojsonFiles(baseDir);

        console.log(geojsonFiles.slice(0, 10))

        console.log(
            `Found ${geojsonFiles.length} GeoJSON tiles.`
        );

        const collections = await Promise.all(
            geojsonFiles.map(fp =>
                this.loadTile(fp)
            )
        );

        const items: IndexedFeature[] = [];

        for (const collection of collections) {
            for (const feature of collection.features) {
                const bbox =
                    turf.bbox(feature);

                items.push({
                    minX: bbox[0],
                    minY: bbox[1],
                    maxX: bbox[2],
                    maxY: bbox[3],
                    feature:
                        feature as Feature<
                            Polygon | MultiPolygon
                        >
                });
            }
        }

        this.tree.load(items);

        this.buildingCount = items.length;

        console.log(
            `Indexed ${this.buildingCount} buildings`
        );
    }

    /**
     * Find buildings intersecting a polygon.
     */
    public findBuildingsInPolygon(
        polygon:
            Feature<Polygon> |
            Feature<MultiPolygon>
    ) {
        if (!polygon) {
            return [];
        }

        const bbox = turf.bbox(polygon);

        const candidates =
            this.tree.search({
                minX: bbox[0],
                minY: bbox[1],
                maxX: bbox[2],
                maxY: bbox[3]
            });

        return candidates
            .filter(item =>
                turf.booleanIntersects(
                    item.feature,
                    polygon
                )
            )
            .map(item => item.feature);
    }

    public summariseBuildingsInPolygon(
        polygon: Feature<Polygon | MultiPolygon>
    ): Map<string, ArchetypeSummary> {

        console.log(`generating a polygon building summary for:`)
        console.log(polygon)

        if (!polygon) {
            return new Map<string, ArchetypeSummary>();
        }

        const bbox = turf.bbox(polygon);

        const candidates = this.tree.search({
            minX: bbox[0],
            minY: bbox[1],
            maxX: bbox[2],
            maxY: bbox[3]
        });

        const summary = new Map<string, ArchetypeSummary>();

        for (const item of candidates) {

            if (!turf.booleanIntersects(item.feature, polygon))
                continue;
            const props = item.feature.properties ?? {};
            const archetype = props.archetype ?? "Not found";
            const floorArea =
                Number(props.gross_area) || (props.premise_floor_count || 2)*(props.premise_area || 0); // note there are actually a lot of GFAs missing at present.

            let record = summary.get(archetype);

            if (!record) {
                record = {
                    archetype: archetype,
                    numBuildings: 0,
                    totalFloorArea: 0
                };
                summary.set(archetype, record);
            }

            record.numBuildings++;
            record.totalFloorArea += floorArea;
        }

        console.log("buildingService.summariseBuildingsInPolygon() generated this building stock summary:")
        console.log(summary)

        return summary;
        // return [...summary.values()]
        //     .sort((a, b) =>
        //         b.totalFloorArea - a.totalFloorArea
        //     );
    }


    /**
     * Find buildings within a rectangle.
     */
    public findBuildingsInBounds(
        west: number,
        south: number,
        east: number,
        north: number
    ) {

        const candidates =
            this.tree.search({
                minX: west,
                minY: south,
                maxX: east,
                maxY: north
            });

        // Consider NOT sending back the actual geometry from here.
        return candidates.map(
            item => item.feature
        );
    }
}