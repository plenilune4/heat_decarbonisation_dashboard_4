import fs from "fs/promises";
import path from "path";
import RBushType from "rbush";
import * as turf from "@turf/turf";

import {
    Feature,
    FeatureCollection,
    Polygon,
    MultiPolygon
} from "geojson";
import {ArchetypeSummary, BuildingStockSummary} from "../models/caseStudy.model";
import {IBuildingSelection} from "../models/buildingSelection.model";

interface IndexedFeature {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    feature: Feature<Polygon | MultiPolygon>;
}

let instanceCount = 0;

export class BuildingService {
    private buildingCount = 0;

    private tree: RBushType<IndexedFeature> | null = null;
    private buildingById = new Map<string, Feature>();
    private readyPromise: Promise<void>;

    constructor() {
        this.readyPromise = this.initialise();
    }

    public async ready(): Promise<void> {
        await this.readyPromise;
    }

    /**
     * If we
     * await buildingService.ready();
     * during app startup, then we will know the buildings are actually all loaded.
     */
    private async initialise(): Promise<void> {

        // Dynamic import avoids CommonJS -> ESM problem
        const {default: RBush} = await import("rbush");

        this.tree = new RBush<IndexedFeature>();

        await this.loadAllBuildings();
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

                const indexedFeature: IndexedFeature = {
                    minX: bbox[0],
                    minY: bbox[1],
                    maxX: bbox[2],
                    maxY: bbox[3],
                    feature: feature as Feature<Polygon | MultiPolygon>
                };

                items.push(indexedFeature);

                // remember that the definitive index to use is dashboard_index.
                const id = feature.properties['dashboard_index']

                if (id !== undefined && id !== null) {
                    this.buildingById.set(String(id), feature);
                }
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

    public combineBuildingStockSummaries(
        BSsummaries: BuildingStockSummary[]
    ): BuildingStockSummary {

        const aggregated_bs_summary: BuildingStockSummary = new Map<string, ArchetypeSummary>();

        BSsummaries.forEach((bss) => {
            bss.forEach((as, atype) => {
                let record = aggregated_bs_summary.get(atype);
                if (!record) {
                    record = {
                        archetype: atype,
                        numBuildings: 0,
                        totalFloorArea: 0
                    };
                    aggregated_bs_summary.set(atype, record);
                }
                record.numBuildings += as.numBuildings;
                record.totalFloorArea += as.totalFloorArea;
            })
        })

        return aggregated_bs_summary
    }


    public summariseBuildingsByIDs(
        ids: string[]
    ): BuildingStockSummary {

        const summary = new Map<string, ArchetypeSummary>();

        for (const id of ids) {
            const feature = this.getBuildingById(id)
            console.log(Array.from(this.buildingById).slice(0,10))
            console.log("found this feature")
            console.log(feature)

            if (!feature) {
                // may also need to alert frontend that the building is not found.
                continue
            }
            const props = feature.properties ?? {};
            const archetype = props.archetype.replaceAll(",","") ?? "Not found";
            const floorArea =
                Number(props.gross_area) || (props.premise_floor_count || 2) * (props.premise_area || 0); // note there are actually a lot of GFAs missing at present.

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

        console.log("buildingService.summariseBuildingsByIDs() generated this building stock summary:")
        console.log(summary)

        return summary;
    }


    public summariseBuildingsInPolygon(
        polygon: Feature<Polygon | MultiPolygon>
    ): BuildingStockSummary {

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

        const building_stock_summary:BuildingStockSummary = new Map<string, ArchetypeSummary>();

        for (const item of candidates) {

            if (!turf.booleanIntersects(item.feature, polygon))
                continue;
            const props = item.feature.properties ?? {};
            const archetype = props.archetype.replaceAll(",","") ?? "Not found";
            const floorArea =
                Number(props.gross_area) || (props.premise_floor_count || 2) * (props.premise_area || 0); // note there are actually a lot of GFAs missing at present.

            let record = building_stock_summary.get(archetype);

            if (!record) {
                record = {
                    archetype: archetype,
                    numBuildings: 0,
                    totalFloorArea: 0
                };
                building_stock_summary.set(archetype, record);
            }

            record.numBuildings++;
            record.totalFloorArea += floorArea;
        }

        console.log("buildingService.summariseBuildingsInPolygon() generated this building stock summary:")
        console.log(building_stock_summary)

        return building_stock_summary;
        // return [...summary.values()]
        //     .sort((a, b) =>
        //         b.totalFloorArea - a.totalFloorArea
        //     );
    }

    public getBuildingById(id: string): Feature | undefined {
        const building = this.buildingById.get("" + id);
        console.log(`ID: ${id}. Building: ${building}`)
        return building
    }

    public summariseBuildingSelection(
        bs: IBuildingSelection
    ): BuildingStockSummary {
        // Handle case with no polygons.
        const polygon_summaries = bs?.polygons? bs.polygons.map((polygon) => this.summariseBuildingsInPolygon(polygon.geojson)) : new Map<string, ArchetypeSummary>()
        const aggregate_polygon_summary = this.combineBuildingStockSummaries(polygon_summaries)
        const additional_buildings_summary = this.summariseBuildingsByIDs(bs.additionalBuildingIDs)
        const overall_summary = this.combineBuildingStockSummaries([aggregate_polygon_summary, additional_buildings_summary])

        return overall_summary
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