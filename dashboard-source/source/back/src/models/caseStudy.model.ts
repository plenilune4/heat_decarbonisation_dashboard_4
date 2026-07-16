import {model, Schema} from "mongoose";
import {IUser} from "./user.model";
import {IBuildingSelection} from "./buildingSelection.model";
import {Feature, MultiPolygon, Polygon} from "geojson";

type TerracedArchetypes = | "TerraceGeorgian" | "TerraceVictorian" | "TerraceOther"
type SemidetachedArchetypes = | "SemidetachedVictorian" | "SemidetachedInterwar" | "SemidetachedOther"
type DetachedArchetypes = | "DetachedVictorian" | "DetachedCottageLook" | "DetachedOther"
type BungalowArchetypes = | "BungalowDetached" | "BungalowSemidetached"

export type ResidentialArchetype = {
    supertype: "Terraced"
    archetype: TerracedArchetypes
} |
    {
        supertype: "Semidetached"
        archetype: SemidetachedArchetypes
    } |
    {
        supertype: "Detached"
        archetype: DetachedArchetypes
    } |
    {
        supertypw: "Bungalow"
        archetype: BungalowArchetypes
    } |
    {
        supertype: "OtherResidential"
        archetype: "ApartmentBlock"
    }

export type NonResidentialArchetype =
    | {supertype: "NonResidential"
    archetype: 'ArtsCommunityLeisure'}
    | {supertype: "NonResidential"
    archetype: 'Education'}
    | {supertype: "NonResidential"
    archetype: 'EmergencyServices'}
    | {supertype: "NonResidential"
    archetype: 'Factory'}
    | {supertype: "NonResidential"
    archetype: 'Health'}
    | {supertype: "NonResidential"
    archetype: 'Hospitality'}
    | {supertype: "NonResidential"
    archetype: 'Offices'}
    | {supertype: "NonResidential"
    archetype: 'Shop'}
    | {supertype: "NonResidential"
    archetype: 'Warehouse'}
    | {supertype: "NonResidential"
    archetype: 'Other'}
    | {supertype: "NonResidential"
    archetype: 'CareHome'}
    | {supertype: "NonResidential"
    archetype: 'UniversityBuilding'}
    | {supertype: "NonResidential"
    archetype: 'SwimmingPool'}
    | {supertype: "NonResidential"
    archetype: 'DryLeisureCentre'}
    | {supertype: "NonResidential"
    archetype: 'PlaceOfWorship'}
    | {supertype: "NonResidential"
    archetype: 'Derelict'}

export type Strategy
{

}

export interface ICaseStudy {
    _id?: string
    owner: IUser
    name?: string
    buildingSelection?: IBuildingSelection
    strategy?: Strategy
    createdAt?: Date
    updatedAt?: Date
}
