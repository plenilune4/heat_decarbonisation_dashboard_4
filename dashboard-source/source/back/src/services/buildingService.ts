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

interface IndexedFeature {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    feature: Feature<Polygon | MultiPolygon>;
}

class BuildingService {

    private tree = new RBush<IndexedFeature>();

    private buildingCount = 0;

    private readyPromise: Promise<void>;

    constructor() {
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

    /**
     * Recursively find all GeoJSON files.
     */
    private async getGeojsonFiles(
        dir: string
    ): Promise<string[]> {

        const entries = await fs.readdir(
            dir,
            { withFileTypes: true }
        );

        const files = await Promise.all(
            entries.map(async (entry) => {

                const fullPath =
                    path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    return this.getGeojsonFiles(
                        fullPath
                    );
                }

                return fullPath.endsWith(".geojson")
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

        return candidates.map(
            item => item.feature
        );
    }
}

export const buildingService = new BuildingService();