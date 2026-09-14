import {model, Schema} from "mongoose";
import {IUser} from "./user.model";
import {IBuildingSelection} from "./buildingSelection.model";
import {Feature, MultiPolygon, Polygon} from "geojson";

// I'm not sure now how much of this stuff needs to use types.

export type TerracedArchetypeNames = | "TerraceGeorgian" | "TerraceVictorian" | "TerraceOther" // may need to attend to mid/end.
export type SemidetachedArchetypeNames = | "SemidetachedVictorian" | "SemidetachedInterwar" | "SemidetachedOther"
export type DetachedArchetypeNames = | "DetachedVictorian" | "DetachedCottageLook" | "DetachedOther"
export type BungalowArchetypeNames = | "BungalowDetached" | "BungalowSemidetached"
export type OtherResidentialArchetypeNames = | "ApartmentBlock"
export type ResidentialArchetypeNames = OtherResidentialArchetypeNames | TerracedArchetypeNames | SemidetachedArchetypeNames | DetachedArchetypeNames | BungalowArchetypeNames
export type ArchetypeNames = ResidentialArchetypeNames | NonResidentialArchetypeNames | null | ""
export type Category = "Residential" | "Non-residential"

type NonResidentialArchetypeNames = | 'ArtsCommunityLeisure' | 'Education' | 'EmergencyServices'
    | 'Factory'
    | 'Health'
    | 'Hospitality'
    | 'Offices'
    | 'Shop'
    | 'Other'
    | 'CareHome'
    | 'UniversityBuilding'
    | 'SwimmingPool'
    | 'DryLeisureCentre'
    | 'PlaceOfWorship'
    | 'Derelict'


//May want to think about mid- and end- terraces again.
// export type ResidentialArchetype =
//     // Top level archetypes:
//     {
//         supertype: "Residential"
//         archetype: "Terraced"
//     } |
//     {
//         supertype: "Residential"
//         archetype: "Semidetached"
//     } |
//     {
//         supertype: "Residential"
//         archetype: "Detached"
//     } |
//     {
//         supertype: "Residential"
//         archetype: "Bungalow"
//     } |
//     {
//         supertype: "Residential"
//         archetype: "OtherResidential"
//     } |
//
//     // Next level:
//     {
//         supertype: "Terraced"
//         archetype: TerracedArchetypes
//     } |
//     {
//         supertype: "Semidetached"
//         archetype: SemidetachedArchetypes
//     } |
//     {
//         supertype: "Detached"
//         archetype: DetachedArchetypes
//     } |
//     {
//         supertype: "Bungalow"
//         archetype: BungalowArchetypes
//     } |
//     {
//         supertype: "OtherResidential"
//         archetype: "ApartmentBlock"
//     }
//
// export type NonResidentialArchetype =
//     | {
//     supertype: "NonResidential"
//     archetype: 'ArtsCommunityLeisure'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'Education'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'EmergencyServices'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'Factory'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'Health'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'Hospitality'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'Offices'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'Shop'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'Warehouse'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'Other'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'CareHome'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'UniversityBuilding'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'SwimmingPool'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'DryLeisureCentre'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'PlaceOfWorship'
// }
//     | {
//     supertype: "NonResidential"
//     archetype: 'Derelict'
// }

export type HeatingSystemType = "NG" | "ASHP" | "DHN"
export type RetrofitLevel =
    "None"
    | "Roofs"
    | "RoofsWindows"
    | "RoofsWindowsWalls"
    | "RoofsWindowsWallsFloorsDraughtproofing"

/**
 * Type including archetypes at any level of the hierarchy.
 * The retrofit stages may benefit from abstracting out a bit, in case we ever want to change them.
 */
export type Archetype = {
    name: string
    display_name: string
    supertype: string
    image?: string
    bottom_level?: string
    kWh_per_GFA: number
    kWh_per_GFA_stage_1?: number
    kWh_per_GFA_stage_2?: number
    kWh_per_GFA_stage_3?: number
    kWh_per_GFA_stage_4?: number
    totalBuildings?: number
    totalGFA?: number
    totalHeatDemand?: number
}


export type ArchetypeSummary = {
    archetype: string
    numBuildings: number
    totalFloorArea: number
    totalHeatDemandMWh?: number
    peakHeatDemandMW?: number
}

export type BuildingStockSummary = Map<string, ArchetypeSummary>

/*
Defines a single strategy to be taken for one subset of buildings.
 */
export type SingleStrategy =
    {
        changeSystemTo: HeatingSystemType | false
        retrofitLevel: RetrofitLevel
        retrofitFirst: boolean
        retrofitByYear: number
        systemChangeByYear: number
    }

/**
 * Defines a full case study strategy by assigning different strategies
 */
export type OverallStrategy = {
    name?: string
    strategies?: Map<string, SingleStrategy>
}

export interface ICaseStudy {
    _id?: string
    owner: IUser
    name?: string
    buildingSelection?: IBuildingSelection
    strategies?: OverallStrategy[]
    createdAt?: Date
    updatedAt?: Date
}

const CaseStudySchema = new Schema<ICaseStudy>(
    {
        owner: {type: Schema.Types.ObjectId, ref: 'User', required: true},//uses ObjectID so needs to use ref and populate.
        name: {type: String, required: true},
        buildingSelection: {type: Schema.Types.ObjectId, ref: 'BuildingSelections', required: false},
        strategies: {type: [Object], required: false},
    },
    {
        timestamps: true,
    }
)

/**
 * Model for a saved case study, consisting of a building selection and one or more saved strategies for decarbonisation.
 * Ultimately DHN layout could also be saved here, or it could be saved on BuildingSelection.
 */
const CaseStudy = model<ICaseStudy>('CaseStudies', CaseStudySchema)
export default CaseStudy