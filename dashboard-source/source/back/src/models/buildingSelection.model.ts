import {model, Schema} from "mongoose";
import {
    Feature,
    FeatureCollection,
    Polygon,
    MultiPolygon
} from "geojson";
import {IUser} from "./user.model";

export type StoredPolygon = {
    id: string,
    geojson: Feature<Polygon> | Feature<MultiPolygon>
}

// This is for the benefit of Typescript...it will closely match the actual schema.
export interface IBuildingSelection {
    _id?: string
    owner: IUser
    name?: string
    text?:string
    polygons?: StoredPolygon[]
    excludedPolygons?: StoredPolygon[]
    additionalBuildingIDs?: string[]
    excludedBuildingIDs?: string[]
    manuallyAddedFeatures?: Feature[]
    createdAt?: Date
    updatedAt?: Date
}

const BuildingSelectionSchema = new Schema<IBuildingSelection>(
    {
        owner: { type: Schema.Types.ObjectId, ref:'User', required: true },//uses ObjectID so needs to use ref and populate.
        name: {type: String, required: true},
        text: {type: String, required: true},
        polygons: { type: [Object], required: false },// or might be [{ type: Object }]
        excludedPolygons: { type: [Object], required: false },
        additionalBuildingIDs: { type: [String], required: false },
        excludedBuildingIDs: { type: [String], required: false },
        manuallyAddedFeatures: {type: [Object], required:false},
    },
    {
        timestamps: true,
    }
)

/**
 * Model for a selection of some buildings, defined by polygon boundaries and/or addition and subtraction of individual buildings.
 */
const BuildingSelection = model<IBuildingSelection>('BuildingSelections', BuildingSelectionSchema)
export default BuildingSelection