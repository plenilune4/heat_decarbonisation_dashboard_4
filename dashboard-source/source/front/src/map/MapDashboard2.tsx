// noinspection TypeScriptValidateTypes
//this is a dummy change

import React, {useEffect, useState, useRef, useMemo} from "react";
import {useResource} from '@/services/resource.service';
import {useAuth} from '@/services/authentication.service'
import {IBuildingSelection} from "@/MODELS/buildingSelection.model";
import BuildingSelectionCard from '@/components/BuildingSelectionCard';
import {SpecifyStrategy, SpecifyStrategies} from '@/components/SpecifyStrategy';
import Results from "@/components/Results";
import {useParams} from 'react-router-dom'
import {useNavigate} from 'react-router-dom'


import Modal from '@/components/Modal'
import {SelectField, TextField} from '@/form-control/fields'
import {ScaleControl, useMap, useMapEvents} from "react-leaflet";
import {MapContainer} from "react-leaflet";
import {TileLayer, GeoJSON, FeatureGroup} from "react-leaflet";
import * as tilebelt from "@mapbox/tilebelt";

import "leaflet/dist/leaflet.css";
import '../app/App.css';
import L from "leaflet";
import {CRS} from 'leaflet'
import "leaflet-draw/dist/leaflet.draw.css";
import {EditControl} from "react-leaflet-draw";

import {FeatureCollection, Feature} from "geojson";

import RangeSlider from 'react-range-slider-input';
import {api} from '@/services/api.service'
import ROUTES from '@/ROUTES'
import {LRUCache} from "lru-cache";
import {Archetype, ArchetypeSummary} from "@/MODELS/caseStudy.model";
import {processArchetypeData} from "@/utils/archetype-utils";
import {cn} from '@/utils/cn'
import MapGlobalTooltip from "@/map/MapToolTip";


import {
    Box,
    Typography,
    Slider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from "@mui/material";
import Button from "@/components/Button.tsx";
import {toast} from "react-toastify";
import {ArchetypesBottomLevel, ICaseStudy} from "@/MODELS/caseStudy.model.ts";
import {json} from "react-router-dom";
import ArchetypePanel from "@/components/ArchetypePanel.tsx";
import {Text, Tooltip} from "recharts";

interface FeatureProperties {
    name: string;
    value: number;
}

interface ZoomListenerProps {
    onZoomChange: (zoom: number) => void;
}

function ZoomListener({onZoomChange}: ZoomListenerProps) {
    useMapEvents({
        zoomend: (event) => {
            onZoomChange(event.target.getZoom());
        }
    });
    return null;
}

function MapViewListener({
                             onViewChange
                         }: {
    onViewChange: (zoom: number, bounds: L.LatLngBounds) => void;
}) {
    useMapEvents({
        moveend: (e) => {
            const map = e.target;

            onViewChange(
                map.getZoom(),
                map.getBounds()
            );
        }
    });

    return null;
}

const DATASETS: { [key: string]: string } = {
    "LSOA": "/data/LSOAs_for_dashboard.geojson",
    "OA": "/data/OAs_for_dashboard.geojson",
    "Secondary substation": "/data/secondaries_for_dashboard.geojson",
};

const testFeature = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [-1.48, 53.381],
                    [-1.470, 53.381],
                    [-1.470, 53.4],
                    [-1.48, 53.4],
                    [-1.48, 53.381]
                ]]
            },
            properties: {}
        }
    ]
};

/**
 * The map zoom above which buildings will be rendered.
 */
const BUILDING_ZOOM_THRESHOLD = 15

/**
 * The zoom level dictating the separation of the buildings into tiles.
 */
const BUILDING_TILE_ZOOM = 15


const MapDashboard: React.FC = () => {

        const {user} = useAuth()
        const navigate = useNavigate()

        // All available building selections:
        const [buildingSelections, BuildingSelectionResource] = useResource<IBuildingSelection[]>(ROUTES.app.buildingSelections,) // ah, that's how you easily get something from the API!!

        const [showBSSaveAsConfirm, setShowBSSaveAsConfirm] = useState(false)
        const [saveBSasLabel, setSaveBSasLabel] = useState('')

        // If buildingSelection needs to be saved first, this will be used.
        const [showCSSaveClarify, setShowCSSaveClarify] = useState(false)

        const [showCSSaveAsConfirm, setShowCSSaveAsConfirm] = useState(false)
        const [saveCSasLabel, setSaveCSasLabel] = useState('')

        const [vBuildingData, setVBuildingData] = useState<FeatureCollection | null>(null);
        const [visibleTiles, setVisibleTiles] = useState<string[]>([]);

        const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
        const [selectedArea, setSelectedArea] = useState<FeatureProperties | null>(null);
        const [valueRange, setValueRange] = useState<[number, number]>([0, 100]);
        const [selectedDataset, setSelectedDataset] = useState<string>("LSOA");

        const mapRef = useRef<L.Map | null>(null);//Do we need this?
        const [mapState, setMapState] = useState({
            zoom: 10,
            bounds: null as L.LatLngBounds | null
        });

        // Bit of stuff for getting hold of archetype definitions:
        const [archetypeDataRaw, setArchetypeDataRaw] = useState<string>("")

        // ########## Getting basic info about the archetypes. ##########
        // It isn't 100% clear that this is needed - at all, or at least in the frontend.
        async function getArchetypes() {
            // to do - presumably the processing of the raw data could also be included in this async function?
            await api(ROUTES.data.getArchetypes)
                //@ts-ignore
                .then(res => res.data.content)
                .then(data => setArchetypeDataRaw(data))
                .catch(err => console.error(err));
            console.log("Retrieved archetypes from backend.")
        }

        useEffect(() => {
            getArchetypes()
        }, []) // Empty dependencies means this should only run once

        const archetypes: Archetype[] = useMemo(() => processArchetypeData(archetypeDataRaw), [archetypeDataRaw])
        const archetypesByName = Object.fromEntries(archetypes.map(atype => [atype.name, atype]));

        // ########## Processing the case study from the url params. ##########
        const params = useParams()
        const caseStudyID = params.id

        if (!caseStudyID) {
            // do something about it
            ;
        }

        // Now, we set up the case study.
        const [caseStudy, setCasestudy, CasestudyResource] = useResource<ICaseStudy>(ROUTES.app.user + `/${user._id}/caseStudies/${caseStudyID}`)
        const [caseStudyState, setCasestudyState] = useState<ICaseStudy>(caseStudy)

        useEffect(() => {
            console.log("####################### case study:")
            console.log(caseStudy)
        }, [caseStudy])

        // The building selection may point to somethimg extant or may not.

        /**
         * The current state of the building selection being used. If one is present on the saved case study we initialise to that.
         */
        const [buildingSelectionState, setBuildingSelectionState] = useState<IBuildingSelection>(caseStudy?.buildingSelection || {
            owner: user,
            text: "Custom selection",
            polygons: [],
            excludedPolygons: [],
            additionalBuildingIDs: [],
            excludedBuildingIDs: [],
        })

        const bounds = mapState.bounds
        const tileCacheRef = useRef(
            new LRUCache<string, FeatureCollection>({max: 100}) // LRU = 'least recently used'.
        );// We are using useRef to avoid changes to the cache triggering re-renders.
        // LRUCache will limit the size of the cache by removing items not recently used.


        async function handleBSSaveAs(buildingSelection: IBuildingSelection,
                                      saveAsLabel: string) {
            const update = {
                ...buildingSelection,
                _id: 'new',
                name: saveAsLabel,
            }
            const response = await api<{ created?: IBuildingSelection }>(
                ROUTES.app.user + '/' + user?._id + '/buildingSelections',
                update
            )
            if (response.data.created) {
                toast.success('Building set saved successfully.')
                return response.data.created._id
            } else {
                toast.error('Error saving new building set.')
                return
            }
            // To do: need to ensure now that the new name appears in the dropdown,
            // and is selected.
            // To do: at the minute it looks tricky to avoid every CaseStudy separately saving the polygons for the geography.
            // Find a way to just store the object ID for the buildingset.
        }

        async function handleCSsave(cs: ICaseStudy, buildingSelectionID = null) {
            // Do we have to unpopulate the objectID in order to save? I don't think we do, I think it should be OK.
            console.log("hello, we're here tryig to save")
            const update = buildingSelectionID ? {
                ...cs,
                buildingSelection: buildingSelectionID,
            } : {
                ...cs,
            }
            const response = await api<{ created?: IBuildingSelection }>(
                ROUTES.app.user + '/' + user?._id + '/caseStudies',
                update
            )
            console.log("hello, we're here still trying to save")

            if (response.data.created) {
                toast.success('Case study saved successfully.')
            } else if (response.data.updated) {
                toast.success('Case study saved.')
            } else {
                toast.error('Error saving changes.')
                console.log("Error with save")
                console.log(response)
            }
        }


        /**
         * Gets building geojson for a specific tile.
         * @param x
         * @param y
         */
        async function getBuildingsForTile(
            x: number,
            y: number
        ): Promise<FeatureCollection> {


            const key = `${x}_${y}`;

            if (tileCacheRef.current.has(key)) {
                // console.log(`Tile ${key} already in cache.`)
                // console.log(tileCacheRef.current.get(key))
                return tileCacheRef.current.get(key);
            }
            // console.log(`Obtaining tile ${key} for first time.`)

            // This version using url params isn't working for some reason.
            let url = `${ROUTES.app.getVBuildingData1}/${BUILDING_TILE_ZOOM}/${x}/${y}`

            let tile: FeatureCollection
            await api(url)
                .then((res) => {
                    //@ts-ignore
                    tile = res.data;
                })
                .catch(err => console.error(err));

            // const response = await fetch(
            //     `/api/buildings/${x}/${y}`
            // );

            // const tile = await response.json();
            tileCacheRef.current.set(key, tile);

            return tile;
            //This is probably ready to test once you have checked the backend part again.
        }


        // Original method of getting buildings, by comparing all of them to the bounding box:
        // let bbox:string
        // let nwTile:number[], seTile:number[]
        // if (bounds && (mapState.zoom >= BUILDING_ZOOM_THRESHOLD))
        // {
        //     let x0 = bounds.getWest()
        //     let x1 = bounds.getEast()
        //     let y0 = bounds.getSouth()
        //     let y1 = bounds.getNorth()
        //     bbox = [
        //     (1.5*x0 - 0.5*x1),
        //     (1.5*y0 - 0.5*y1),
        //     (1.5*x1 - 0.5*x0),
        //     (1.5*y1 - 0.5*y0)
        //     ].join(",");
        // }
        // else
        // {
        //     ;
        //     bbox = "0,0,0,0"
        // }
        // console.log("bbox")
        // console.log(bbox)

        /**
         * Uses the current bounds of the map to check which tiles are visible.
         * @param bounds
         */
        function getVisibleTiles(bounds: L.LatLngBounds, zoom: number) {
            // console.log("Figuring out which tiles are visible...")
            if (zoom < BUILDING_ZOOM_THRESHOLD) {
                return []
            }

            const nw = tilebelt.pointToTile(
                bounds.getWest(),
                bounds.getNorth(),
                BUILDING_TILE_ZOOM
            );
            const se = tilebelt.pointToTile(
                bounds.getEast(),
                bounds.getSouth(),
                BUILDING_TILE_ZOOM
            );
            const tiles: string[] = [];
            for (let x = nw[0]; x <= se[0] + 1; x++) {
                for (let y = nw[1]; y <= se[1] + 1; y++) {
                    tiles.push(`${x}_${y}`);
                }
            }
            // console.log(tiles)
            return tiles;
        }


        /**
         * Getting the required building data for the tiles that are visible.
         * Might need to make this asynchronous somehow?
         */
        useEffect(() => {
            // console.log("getting the building data for visible tiles...")
            visibleTiles.forEach(async tileId => {
                if (tileCacheRef.current.has(tileId))
                    return;

                const [x, y] =
                    tileId.split("_");

                getBuildingsForTile(Number(x), Number(y))

                // setTileVersion(v => v + 1);

            });

        }, [visibleTiles]);

        // for (const [key, value] of tileCacheRef.current.entries()) {
        //         console.log("cache entry:",key, value);
        // }

        // console.log("visible tiles", tileCacheRef.current.get(visibleTiles[0]))

        /**
         * Combine the visible buildings into a single FeatureCollection.
         */
        const visibleBuildings =
            visibleTiles.flatMap(tileId =>
                tileCacheRef.current.get(tileId)?.features ?? []
            );
        const mergedCollection = {
            type: "FeatureCollection",
            features: visibleBuildings
        };


        // const [filterValue, setFilterValue] = useState<number>(0);

        // // Load GeoJSON data from public folder (or API)
        // useEffect(() => {
        //   fetch("/data/secondaries_for_dashboard.geojson")
        //     .then((res) => {
        //       if (!res.ok) throw new Error("Failed to fetch GeoJSON");
        //       return res.json();
        //     })
        //     .then((data) => setGeoData(data))
        //     .catch((err) => console.error(err));
        // }, []);


        // Highlight by range
        const styleFeature = (feature: any) => {
            const v = feature.properties.value;
            const [minv, maxv] = valueRange;
            const inRange = v >= minv && v <= maxv;
            return {
                fillColor: inRange ? "#e41a1c" : "#cccccc",
                weight: 1,
                color: "white",
                fillOpacity: inRange ? 0.7 : 0.3,
            };
        };

        /**
         * Original version for working with LSOA geometries and similar.
         * @param feature
         * @param layer
         */
        const onEachFeature = (feature: any, layer: any) => {
            layer.on({
                click: () => {
                    setSelectedArea(feature.properties);
                    layer
                        .bindPopup(
                            `<b>${feature.properties.name}</b><br/>Value: ${feature.properties.value}`
                        )
                        .openPopup();
                },
            });
        };

        type IncludedBuildingsStatus = {
            latestSelection: string | null;
            multiSelection: Set<string>;
        }

        // To enable selection of multiple buildings.
        const [includedBuildingsStatus, setIncludedBuildingsStatus] = useState<IncludedBuildingsStatus | null>({
            latestSelection: null,
            multiSelection: new Set(),
        })
        const [mouseOverBuilding, setMouseOverBuilding] = useState<string[]>([])

        // console.log("building selection on this render:", buildingSelection);

        // We use the buildingSelectionState (which has polygons AND individual building selections)
        // to update the list of included building indices.
        // console.log("rest and be thankful")
        const polygons = buildingSelectionState.polygons ?? []

        // ########## Checking which buildings are in the polygons. ##########
        // This is needed in order to highlight the relevant ones.
        // To do: we could save time by getting the summary by archetype and the building ids at the same time.
        // It is done asynchronously via the api.
        // The following is (?) the correct way to handle long-running api calls:
        const [buildingIDsInPolygons, setBuildingIDsInPolygons] = useState<Set<string>>(new Set([]))

        //to do - can verticode's useresource hook avoid the need for this structure???
        async function getBuildingDatainPolygons() {
            await api(ROUTES.app.getVBuildingDataInPolygons, polygons.map((p) => p.geometry))
                .then((res) => {
                    // console.log("Response from getVBuildingDataInPolygons:")
                    // console.log(res);
                    let all_ids = (res.data as FeatureCollection).features.map((feature) => feature.properties["dashboard_index"]);
                    //@ts-ignore
                    setBuildingIDsInPolygons(new Set(all_ids))
                })
                .catch(err => console.error(err));
        }

        useEffect(() => {
                getBuildingDatainPolygons();
            }, [polygons]
        )

        // console.log("We've got these building IDs inside the polygon(s):")
        // console.log(buildingIDsInPolygons)

        useEffect(() => {
            if (polygons.length > 0) {
                const layer = L.geoJSON({
                    type: "FeatureCollection",
                    features: polygons,
                });

                console.log("bounds of polygons:")
                console.log(layer.getBounds())


                try {
                    // The try wrapper just ensures we don't crash if the map isn't ready.
                    mapRef.current.fitBounds(layer.getBounds(), {
                        padding: [40, 40],
                        animate: true,
                        duration: 0.75
                    });

                    // mapRef.current.fitBounds(})
                    console.log("fitbounds ran successfully.")
                } catch (error) {
                    console.log("Problem with fitbounds", error)
                    ;
                }
            }
        }, [polygons])

        // ########## Getting the summary of archetype data for the given polygons. ##########
        const [archetypeSummaries, setArchetypeSummaries] = useState<Map<string, ArchetypeSummary>>(new Map<string, ArchetypeSummary>)

        /**
         * Recursive function to get totals to propagate up the archetype taxonomy.
         * @param atype
         * @param prop
         */

        async function getSummaryForPolygons() {
            await api(ROUTES.app.getAggregateDatainPolygons, polygons.map((p) => p.geometry))
                .then((res) => {
                    // console.log(res);
                    let rawdata = res.data;
                    let summaries = new Map(Object.entries(res.data));
                    //@ts-ignore
                    setArchetypeSummaries(summaries)
                })
                .catch(err => console.error(err));
        }

        useEffect(() => {
            getSummaryForPolygons();
        }, [polygons])

        function getArchetypeTotal(atype: Archetype, prop: string) {
            if (atype.bottom_level) {
                if (archetypeSummaries.has(atype.name)) {
                    if (prop === "totalHeatDemand") {
                        let val = archetypeSummaries.get(atype.name)["totalFloorArea"] * atype.kWh_per_GFA / 1000000.0
                        return val
                    } else {
                        let val = archetypeSummaries.get(atype.name)[prop]
                        return val
                    }
                } else {
                    return 0
                }
            } else {
                console.log(atype.name, archetypes.filter((a) => (a.supertype === atype.name)))
                let val = archetypes.filter((a) => (a.supertype === atype.name)).reduce((partialSum, ar) => partialSum + getArchetypeTotal(ar, prop), 0);
                return val
            }
        }


        useEffect(() => {
            // Updates the totals for the archetype 'supertypes'.
            if (archetypeSummaries?.size > 0) {
                archetypes.forEach((a) => {
                    a.totalGFA = getArchetypeTotal(a, "totalFloorArea")
                })
                archetypes.forEach((a) => {
                    a.totalBuildings = getArchetypeTotal(a, "numBuildings")
                })
                archetypes.forEach((a) => {
                    a.totalHeatDemand = getArchetypeTotal(a, "totalHeatDemand")
                })
            }
        }, [archetypeSummaries])

        // console.log("polygons")
        // console.log(polygons)
        console.log("Archetype summaries:")
        console.log(archetypeSummaries)
        console.log("archetypes")
        console.log(archetypes)

        const manuallySelectedBuildingIDs = buildingSelectionState.additionalBuildingIDs
// const manuallyRemovedBuildingIDs = buildingSelectionState.excludedBuildingIDs

        const allSelectedBuildingIDs = useMemo<Set<string>>(() => {
            if (buildingIDsInPolygons?.size > 0) {
                let all_ids_set = (buildingIDsInPolygons || new Set([])).union(new Set(manuallySelectedBuildingIDs || []))
                // .difference(new Set(manuallyRemovedBuildingIDs))
                return all_ids_set
            }
            return new Set(manuallySelectedBuildingIDs)

        }, [buildingIDsInPolygons, manuallySelectedBuildingIDs])

        const onEachBuilding = (feature: any, layer: any) => {
            // To do: select none.
            layer.on({
                click: (e: any) => {
                    const id = feature.properties["dashboard_index"]

                    console.log("CLICKED BUILDING:")
                    console.log(feature.properties)

                    // Note that you can't access the current state value directly in this scope (it will come back null)
                    // but you can access it like this in the 'set' call:
                    setBuildingSelectionState((current) => {
                        if (e.originalEvent.ctrlKey) {
                            try {
                                // Note that, for the time being, you cannot remove a building that is including because it is inside a polygon.
                                // And we are not using excludedBuildingIDs, although that has been built into the mongoose schema for that potential purpose.
                                if (current.additionalBuildingIDs.includes(id)) {
                                    // Then the mouseclick *removes* the current building from the selection.
                                    let newMultiselection: String[] = [...current.additionalBuildingIDs].filter((item) => item !== id)
                                    return {
                                        ...current,
                                        additionalBuildingIDs: newMultiselection
                                    }
                                } else {
                                    // Add the current building to the multiselection.
                                    return {
                                        ...current,
                                        additionalBuildingIDs: [...current.additionalBuildingIDs, id]
                                    }
                                }
                            } catch (E) {
                                console.log(E)
                                console.log(current)
                                return current;
                            }
                        } else {
                            // No multiselect.
                            return {
                                ...current,
                                additionalBuildingIDs: [id]
                            }
                        }
                    })
                    // layer
                    //   .bindPopup(
                    //     `<b>${feature.properties.name}</b><br/>Value: ${feature.properties.value}`
                    //   )
                    //   .openPopup();
                },
                mouseover: (e: any) => {
                    const id = feature.properties["dashboard_index"]
                    setMouseOverBuilding((current) => [...current, id]);//might want to change to use IDs.
                },
                mouseout: (e: any) => {
                    const id = feature.properties["dashboard_index"]
                    setMouseOverBuilding((current) => current.filter((item) => item !== id))
                    // console.log("mouseover buildings: ", mouseOverBuilding)
                },
            });
        };

//Can we compare to sets that are calculated above, or do we have to use sets that are in State???
        const styleBuilding = (
            feature: any,
            // hoveredId: string | null,
            // selectedId: string | null
        ) => {
            const id = feature.properties["dashboard_index"];
            try {
                // if (buildingSelection.multiSelection.has(id)) { // original version
                if (allSelectedBuildingIDs.has(id)) {
                    return {
                        fillColor: "#ff4444",
                        weight: 0,
                        color: "#000",
                        fillOpacity: 1
                    };
                }
            } catch (E) {
                console.log(E)
                return {
                    fillColor: "#ff4444",
                    weight: 0,
                    color: "#000",
                    fillOpacity: 1
                };
            }

            if (mouseOverBuilding.includes(id)) {
                return {
                    fillColor: "#ffaa00",
                    weight: 0,
                    color: "#000",
                    fillOpacity: 0.9
                };
            }

            return {
                fillColor: "#0000FF",
                weight: 1,
                color: "blue",
                fillOpacity: 0.7,
            };
        };

        const [currentTabIndex, setCurrentTabIndex] = useState<number>(0)

        const drawingOngoing = useRef<boolean>(false)


        return (
            <div style={{display: "flex"}}>

                {/* Controls panel */}
                <div style={{flex: 1, padding: "1rem", borderLeft: "1px solid #ccc"}}>
                    {/*<Typography variant="h6">Map Controls</Typography>*/}

                    <div className='flex flex-col items-center m-6 italic space-y-3'>

                        <Button className='w-full text-brand-300 italic' onClick={() => {
                            if (buildingSelectionState?._id) {
                                handleCSsave(caseStudy, buildingSelectionState)
                                // This is incorrect if the buildingSelectionState has changed since it was populated.
                                // but will do for a bit while we test. Sort this by comparing json.stringify of the bs and bsstate.
                                console.log(`Saving case study with extant building selection ID ${buildingSelectionState._id}, name ${buildingSelectionState.name}`)
                            } else {
                                // Need also to save the buildung selection to database first, so we do this
                                console.log("Need new building selection ID in order to save case study.")
                                setShowCSSaveClarify(true)
                            }
                        }}>
                            Save case study
                        </Button>

                        <Button className='w-full text-brand-300 italic' onClick={() => {
                            ;
                        }}>
                            Save case study as...
                        </Button>

                        <Button className='w-full text-brand-300 italic' onClick={() => {
                            navigate('/casestudies')
                        }}>
                            Load case study
                        </Button>
                    </div>

                    <Modal open={showCSSaveClarify} onClose={() => setShowCSSaveClarify(false)}
                           zIndexClass={"z-[1001]"}>
                        <div className='flex flex-col gap-4'>
                            <h3 className='text-lg font-semibold'>Before saving case study...</h3>
                            <Text>This case study uses a new building selection. Save this so it can be reused at any
                                time.</Text>
                            <TextField
                                value={saveBSasLabel}
                                onChange={(text) => setSaveBSasLabel(text)}
                                placeholder='Name for this locality or collection of buildings'
                                autoFocus
                                label=''
                            />
                            <div className='flex flex-row gap-2 justify-end'>
                                <Button onClick={() => setShowCSSaveClarify(false)}>Cancel</Button>
                                <Button.Success
                                    onClickAsync={async () => {
                                        const new_id = await handleBSSaveAs(buildingSelectionState, saveBSasLabel)
                                        setShowBSSaveAsConfirm(false)
                                        handleCSsave(caseStudy, new_id)
                                    }}
                                    disabled={!saveBSasLabel.trim()}
                                >
                                    Proceed to save building selection and case study
                                </Button.Success>
                            </div>
                        </div>
                    </Modal>


                    <Modal open={showBSSaveAsConfirm} onClose={() => setShowBSSaveAsConfirm(false)}
                           zIndexClass={"z-[1001]"}>
                        <div className='flex flex-col gap-4'>
                            <h3 className='text-lg font-semibold'>Save building collection</h3>
                            <TextField
                                value={saveBSasLabel}
                                onChange={(text) => setSaveBSasLabel(text)}
                                placeholder='Name for this locality or collection of buildings'
                                autoFocus
                                label=''
                            />
                            <div className='flex flex-row gap-2 justify-end'>
                                <Button onClick={() => setShowBSSaveAsConfirm(false)}>Cancel</Button>
                                <Button.Success
                                    onClickAsync={async () => {
                                        await handleBSSaveAs(buildingSelectionState, saveBSasLabel)
                                        setShowBSSaveAsConfirm(false)
                                    }}
                                    disabled={!saveBSasLabel.trim()}
                                >
                                    Save
                                </Button.Success>
                            </div>
                        </div>
                    </Modal>

                    {/*<Typography variant="h6">Available building stock subsets:</Typography>*/}

                    {/*{buildingSelections && buildingSelections.map((bs) => (*/}
                    {/*    <BuildingSelectionCard*/}
                    {/*        buildingSelection={bs}*/}
                    {/*    >*/}
                    {/*    </BuildingSelectionCard>))}*/}

                    {buildingSelections && (
                        <SelectField
                            value={buildingSelectionState.name}
                            onChange={(value) => {
                                // To do - what if 'Custom' is clicked on again?
                                let bs: IBuildingSelection = buildingSelections.find((bs) => (bs.name === value));
                                console.log("Changing the building selection to:")
                                console.log(bs)
                                // setBuildingSelection(value);

                                // We set the working building selection state using the already populated bs document.
                                setBuildingSelectionState(bs)
                                // May want to set the id on caseStudyState at the same time???
                            }
                            }
                            options={[buildingSelectionState, ...buildingSelections.filter((bs) => (bs.text !== buildingSelectionState.text))]
                                .map((bs) => ({
                                    text: bs.text,
                                    value: bs.name,
                                }))}
                            label={'Available building stock subsets'}
                        />
                    )}

                    <div className='flex flex-col items-center m-6 italic space-y-3'>
                        <Button className='w-full text-brand-300 italic' onClick={() => {
                            setShowBSSaveAsConfirm(true)
                        }}>
                            Save custom building subset...
                        </Button>
                    </div>


                    {/*/!* Dataset selector *!/*/}
                    {/*<FormControl fullWidth sx={{mt: 2}}>*/}
                    {/*    <InputLabel>Dataset</InputLabel>*/}
                    {/*    <Select*/}
                    {/*        value={selectedDataset}*/}
                    {/*        label="Dataset"*/}
                    {/*        onChange={(e) => setSelectedDataset(e.target.value)}*/}
                    {/*    >*/}
                    {/*        {Object.keys(DATASETS).map((name) => (*/}
                    {/*            <MenuItem key={name} value={name}>*/}
                    {/*                {name}*/}
                    {/*            </MenuItem>*/}
                    {/*        ))}*/}
                    {/*    </Select>*/}
                    {/*</FormControl>*/}

                    {/*/!* Value range slider *!/*/}
                    {/*<Box sx={{mt: 4}}>*/}
                    {/*    <Typography gutterBottom>Filter by value</Typography>*/}
                    {/*    <Slider*/}
                    {/*        value={valueRange}*/}
                    {/*        onChange={(_, val) =>*/}
                    {/*            Array.isArray(val) && setValueRange([val[0], val[1]])*/}
                    {/*        }*/}
                    {/*        valueLabelDisplay="auto"*/}
                    {/*        min={*/}
                    {/*            geoData ? Math.min(...geoData.features.map((f: any) => f.properties.value)) : 0*/}
                    {/*        }*/}
                    {/*        max={*/}
                    {/*            geoData ? Math.max(...geoData.features.map((f: any) => f.properties.value)) : 100*/}
                    {/*        }*/}
                    {/*    />*/}
                    {/*    <Typography variant="body2">*/}
                    {/*        Showing values between <b>{valueRange[0]}</b> and <b>{valueRange[1]}</b>*/}
                    {/*    </Typography>*/}
                    {/*</Box>*/}

                    {/*/!* Selected area info *!/*/}
                    {/*<Box sx={{mt: 3}}>*/}
                    {/*    {selectedArea ? (*/}
                    {/*        <>*/}
                    {/*            <Typography variant="subtitle1">{selectedArea.name}</Typography>*/}
                    {/*            <Typography>Value: {selectedArea.value}</Typography>*/}
                    {/*        </>*/}
                    {/*    ) : (*/}
                    {/*        <Typography variant="body2">Click an area for details</Typography>*/}
                    {/*    )}*/}
                    {/*</Box>*/}


                    {/*<Button onClick={() => {*/}
                    {/*    api(ROUTES.app.optimiseDHNlayout, {*/}
                    {/*        param1: 5,*/}
                    {/*        param2: 8,*/}
                    {/*        param3: 4,*/}
                    {/*        param4: 0,*/}
                    {/*    });*/}
                    {/*}}*/}
                    {/*>*/}
                    {/*    Optimise*/}
                    {/*</Button>*/}


                </div>

                {/* ########## Map section ########## */}
                <div style={{flex: 3, height: "100vh", paddingRight: 50, paddingTop: 30, paddingLeft: 25}}>
                    Select building stock for your case study by clicking on individual buildings,
                    using the polygon tool, or choosing an existing selection from the sidebar.

                    <MapContainer
                        ref={mapRef}
                        crs={CRS.EPSG3857}
                        center={[53.46, -1.29]}
                        zoom={11}
                        style={{height: "100%", width: "100%"}}

                        // whenReady={(mapInstance) => {
                        //     mapRef.current = mapInstance;
                        // }}
                    >
                        <ScaleControl position="topright"/>


                        <MapViewListener
                            onViewChange={(zoom, bounds) => {
                                setMapState({zoom, bounds});
                                // console.log(`New zoom : ${zoom}`);
                                // console.log(`New bounds: ${[bounds.getWest(), bounds.getEast(), bounds.getSouth(), bounds.getNorth()].join(", ")}`);
                                setVisibleTiles(getVisibleTiles(bounds, zoom));
                            }
                            }
                        />
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap contributors">
                        </TileLayer>

                        {/*<MapGlobalTooltip></MapGlobalTooltip>*/}


                        {/*{geoData && (*/}
                        {/*  <GeoJSON*/}
                        {/*    key={`${selectedDataset}-${JSON.stringify(valueRange)}`}*/}
                        {/*    data={geoData as any}*/}
                        {/*    style={styleFeature}*/}
                        {/*    onEachFeature={onEachFeature}*/}
                        {/*  />*/}
                        {/*)}*/}

                        {(mergedCollection.features && mapState.zoom >= BUILDING_ZOOM_THRESHOLD) && (
                            // {true && (
                            <GeoJSON
                                // ref={buildingsRef}
                                key={`buildings-${mapState.zoom}-${mergedCollection.features.length}`}
                                data={mergedCollection as any}
                                style={styleBuilding}
                                // @ts-ignore
                                pointerEvents={drawingOngoing.current ? "none" : true} // If polygon drawing is ongoing then individual building mouseover needs to be disabled. I think I had this the wrong way round before??
                                onEachFeature={onEachBuilding}
                            />

                        )}

                        <FeatureGroup>
                            <EditControl
                                position="topleft"
                                draw={{
                                    polygon: true,
                                    polyline: false,
                                    circle: false,
                                    circlemarker: false,
                                    marker: false,
                                    rectangle: false
                                }}

                                edit={{
                                    edit: false,
                                    remove: true
                                }}

                                onDrawStart={(e) => {
                                    console.log("you're drawing!");
                                    drawingOngoing.current = true;
                                }}
                                onDrawStop={(e) => {
                                    console.log("you've stopped drawing!");
                                    drawingOngoing.current = false;
                                }}

                                onCreated={(e) => {
                                    if (e.layerType === "polygon") {
                                        const layer = e.layer;
                                        const geojson = e.layer.toGeoJSON();
                                        // setBuildingSelectionState((current) => [...current, geojson]);

                                        // The new polygon is added to the selected areas in the state.
                                        const newSelectionState = {
                                            ...buildingSelectionState,
                                            polygons: [buildingSelectionState.polygons, geojson]
                                        }
                                        setBuildingSelectionState(newSelectionState);
                                        // We still need to think about how we *remove* polygons...
                                    }
                                }}
                            />
                        </FeatureGroup>
                    </MapContainer>

                    <ul className='flex gap-2 px-2 mb-4 border-b border-gray-700 pt-5'>
                        {["Building stock report", "Decarbonisation strategies", "Results"].map((tabname, index) => (
                            <li
                                key={index}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-t-md border-b-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                                    index === currentTabIndex
                                        ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                                        : 'bg-gray-800 border-transparent text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer'
                                )}
                                onClick={() => setCurrentTabIndex(index)}
                                tabIndex={0}
                                aria-selected={index === currentTabIndex}
                                aria-controls={`chart-tabpanel-${index}`}
                                role='tab'
                            >
                                <span className='text-base'>{tabname}</span>
                            </li>
                        ))}
                    </ul>

                    {(currentTabIndex == 0) && archetypesByName["Residential"] && (
                        <div className="pt-5 pb-5 text-brand-900">
                            <ArchetypePanel key={"TopA"} archetypeSummaries={archetypeSummaries} archetypes={archetypes}
                                            parentArchetype={archetypesByName["Residential"]} level={1}/>
                            <ArchetypePanel key={"TopB"} archetypeSummaries={archetypeSummaries} archetypes={archetypes}
                                            parentArchetype={archetypesByName["Non-residential"]} level={1}/>
                        </div>
                    )}

                    {(currentTabIndex == 1) && (
                        <div className="pt-5 pb-5 text-brand-900">
                            {/*<SpecifyStrategy*/}
                            {/*    archetypes={archetypes}*/}
                            {/*/>*/}
                            <SpecifyStrategies/>
                        </div>
                    )
                    }

                    {(currentTabIndex == 2) && (
                        <div className="pt-5 pb-5 text-brand-900">
                            {/*<SpecifyStrategy*/}
                            {/*    archetypes={archetypes}*/}
                            {/*/>*/}
                            <Results/>
                        </div>
                    )
                    }

                </div>
            </div>
        );
    }
;


export default MapDashboard;

//   return (
//     <div style={{ display: "flex" }}>
//       {/* Map Section */}
//       <div style={{ flex: 3, height: "100vh" }}>
//         <MapContainer
//           center={map_centre as [number, number]}
//           zoom={10}
//           style={{ height: "100%", width: "100%" }}
//         >
//           <TileLayer
//             url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//             attribution="&copy; OpenStreetMap contributors"
//           />
//           {geoData && (
//             <GeoJSON
//               key={JSON.stringify(valueRange)} // ensures rerender when range changes
//               data={geoData as any}
//               style={styleFeature}
//               onEachFeature={onEachFeature}
//             />
//           )}
//         </MapContainer>
//       </div>
//
//         {/* Control / Info panel */}
//       <div style={{ flex: 1, padding: "1rem", borderLeft: "1px solid #ccc" }}>
//         <Typography variant="h6" gutterBottom>
//           Filter by value
//         </Typography>
//         <Box sx={{ width: "100%", px: 2 }}>
//           <Slider
//             getAriaLabel={() => "Value range"}
//             value={valueRange}
//             onChange={handleSliderChange}
//             valueLabelDisplay="auto"
//             min={geoData ? Math.min(...geoData.features.map((f: any) => f.properties.DHN_annualised_cost)) : 0}
//             max={geoData ? Math.max(...geoData.features.map((f: any) => f.properties.DHN_annualised_cost)) : 200000}
//           />
//         </Box>
//         <Typography>
//           Showing areas with value between{" "}
//           <strong>{valueRange[0]}</strong> and <strong>{valueRange[1]}</strong>
//         </Typography>
//
//         <div style={{ marginTop: "1rem" }}>
//           {selectedArea ? (
//             <div>
//               <Typography variant="subtitle1">{selectedArea.name}</Typography>
//               <Typography>Value: {selectedArea.value}</Typography>
//             </div>
//           ) : (
//             <Typography>Click an area to see details</Typography>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };
//
// export default MapDashboard;
