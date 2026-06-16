// import fs from "fs";
// import path from "path";
// import * as turf from "@turf/turf";
//
// import { bboxOverlaps } from "../utils/spatial";
//
// interface IndexedFeature {
//     feature: any;
//     bbox: number[];
// }
//
// class BuildingService {
//     private indexedBuildings: IndexedFeature[] = [];
//
//     constructor() {
//         this.loadBuildings();
//     }
//
//     private loadBuildings() {
//         console.log("Starting building service...")
//         const filePath = path.join(
//             __dirname,
//             "..",
//             "data",
//             "verisk_sy_buildings.geojson"
//         );
//
//         const collection = JSON.parse(
//             fs.readFileSync(filePath, "utf8")
//         );
//
//         this.indexedBuildings =
//             collection.features.map((feature: any) => ({
//                 feature,
//                 bbox: turf.bbox(feature)
//             }));
//
//         console.log(
//             `Loaded ${this.indexedBuildings.length} buildings`
//         );
//     }
//
//     getBuildingsInBBox(queryBBox: number[]) {
//         console.log(`Total index buildings: ${this.indexedBuildings.length}`)
//         let filteredBuildings = this.indexedBuildings
//             .filter(item =>
//                 bboxOverlaps(item.bbox, queryBBox)
//             )
//
//         // console.log(queryBBox)
//         // this.indexedBuildings.slice(0,3).map((thing) => console.log(thing.bbox))
//
//         console.log(`Total filtered buildings: ${filteredBuildings.length}`)
//         return filteredBuildings
//             .map(item => item.feature);
//     }
// }
//
// export const buildingService =
//     new BuildingService();