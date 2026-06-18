// noinspection TypeScriptValidateTypes
//this is a dummy change

import React, {useEffect, useState, useRef} from "react";
import {useMapEvents} from "react-leaflet";
import {MapContainer} from "react-leaflet";
import {TileLayer, GeoJSON, FeatureGroup} from "react-leaflet";
import * as tilebelt from "@mapbox/tilebelt";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {CRS} from 'leaflet'
import "leaflet-draw/dist/leaflet.draw.css";
import {EditControl} from "react-leaflet-draw";

import {FeatureCollection, Feature} from "geojson";

import RangeSlider from 'react-range-slider-input';
import {api} from '@/services/api.service'
import ROUTES from '@/ROUTES'
import {LRUCache} from "lru-cache";


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

    const buildingsRef = useRef<L.Map | null>(null);//Do we need this?

    // Box drawn by user to select multiple buildings.
    // Although, there may be more versatility from building it ourselves.
    const [buildingSelectionAreas, setBuildingSelectionAreas] = useState<Feature[] | []>([]);

    const bounds = mapState.bounds
    const tileCacheRef = useRef(
        new LRUCache<string, FeatureCollection>({max: 100}) // LRU = 'least recently used'.
    );// We are using useRef to avoid changes to the cache triggering re-renders.
    // LRUCache will limit the size of the cache by removing items not recently used.

    async function getBuildingsForTile(
        x: number,
        y: number
    ): Promise<FeatureCollection> {

        const key = `${x}_${y}`;

        if (tileCacheRef.current.has(key)) {
            console.log(`Tile ${key} already in cache.`)
            console.log(tileCacheRef.current.get(key))
            return tileCacheRef.current.get(key);
        }
        console.log(`Obtaining tile ${key} for first time.`)

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
        console.log("Hi!")
        console.log(`Cache size: ${tileCacheRef.current.size}`)

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
        console.log("Figuring out which tiles are visible...")
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
        return tiles;
    }


    /**
     * Getting the required building data for the tiles that are visible.
     * Might need to make this asynchronous somehow?
     */
    useEffect(() => {
        console.log("getting the building data for visible tiles...")
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
    for (const [key, value] of tileCacheRef.current.entries()) {
        // console.log("cache entry:",key, tileCacheRef.current.get(key));
        // console.log(key);
        ;
    }
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

    // ***** Get the building footprint data...*****
    // Old version using bounding box and relying on the buildingService in the backend.
    // New version uses tiles.
    // though this should probably be delayed until we know we need it, or are at the right zoom level.
    // Might also want to add the user permissions checks here.
    // async function getVBuildingData(){
    //   let url = `${ROUTES.app.getVBuildingData1}?bbox=${bbox}`
    //   await api(url)
    //       .then((res) => {
    //         setVBuildingData(res.data);
    //       })
    //       .catch(err => console.error(err));
    //   console.log("Retrieved results for combined data.")
    // }
    //
    // useEffect(() => {
    //     getVBuildingData()
    // }, [bbox])
    // Empty dependencies means this should only run once. Update: now, it will run whenever the bbbox scrolls.
    // One is inclined to wonder whether adding a buffer round the bbox might be helpful, so that newly visible buildings are already there.
    // We can improve this...there shouldn't be any need to refetch data just for a zoom in.

    // Fetching the LSOA data or similar.
    // Fetch GeoJSON whenever dataset changes
    // useEffect(() => {
    //   const url = DATASETS[selectedDataset];
    //   fetch(url)
    //     .then((res) => res.json())
    //     .then((data:FeatureCollection) => {
    //       setGeoData(data);
    //       // Reset slider range to dataset’s min/max
    //       const vals = data.features.map((f: any) => f.properties.value);
    //       const minv = Math.min(...vals);
    //       const maxv = Math.max(...vals);
    //       setValueRange([minv, maxv]);
    //
    //       // Zoom to dataset extent
    //       if (mapRef.current) {
    //         const layer = L.geoJSON(data);
    //         const bounds = layer.getBounds();
    //         if (bounds.isValid()) mapRef.current.fitBounds(bounds);
    //       }
    //     })
    //     .catch((err) => console.error("Failed to fetch GeoJSON:", err));
    // }, [selectedDataset]);

    // console.log("vbuilding data")
    // console.log(vBuildingData)
    // console.log(typeof(vBuildingData))
    // console.log(vBuildingData?.features.length)
    // console.log(vBuildingData?.features[0])
    //
    // console.log("geodata")
    // console.log(geoData)

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

    type selectionState = {
        latestSelection: string | null;
        multiSelection: Set<string>;
    }

    // To enable selection of multiple buildings.
    const [buildingSelection, setBuildingSelection] = useState<selectionState | null>({
        latestSelection: null,
        multiSelection: new Set(),
    })
    const [mouseOverBuilding, setMouseOverBuilding] = useState<string[] | []>([])

    // console.log("building selection on this render:", buildingSelection);

    const onEachBuilding = (feature: any, layer: any) => {
        // To do: select none.
        layer.on({
            click: (e: any) => {
                const id = feature.properties.id

                // Note that you can't access the current state value directly in this scope (it will come back null)
                // but you can access it like this in the 'set' call:
                setBuildingSelection((current) => {
                    if (e.originalEvent.ctrlKey) {
                        if (current.multiSelection.has(id) {
                            // Then the mouseclick *removes* the current building from the selection.
                            return {
                                latestSelection: null,
                                multiSelection: current.multiSelection.delete(id)
                            }
                        } else {
                            // Add the current building to the multiselection.
                            return {
                                latestSelection: id,
                                multiSelection: current.multiSelection.add(id)
                            }
                        }
                    } else {
                        // No multiselect.
                        return {
                            latestSelection: id,
                            multiSelection: new Set([id])
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
                const id = feature.properties.id
                setMouseOverBuilding((current) => [...current, id]);//might want to change to use IDs.
            },
            mouseout: (e: any) => {
                const id = feature.properties.id
                setMouseOverBuilding((current) => current.filter((item) => item !== id))
                // console.log("mouseover buildings: ", mouseOverBuilding)
            },
        });
    };

    const styleBuilding = (
        feature: any,
        // hoveredId: string | null,
        // selectedId: string | null
    ) => {
        const id = feature.properties.id;

        if (buildingSelection.multiSelection.includes(id)) {
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


    // Zoom to filtered polygons (for use with LSOA data etc.)
    // useEffect(() => {
    //   if (!geoData || !mapRef.current) return;
    //   const [minv, maxv] = valueRange;
    //   const filtered = geoData.features.filter(
    //     (f: any) => f.properties.value >= minv && f.properties.value <= maxv
    //   );
    //   const subset = { ...geoData, features: filtered };
    //   const layer = L.geoJSON(subset);
    //   const bounds = layer.getBounds();
    //   if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [20, 20] });
    // }, [geoData, valueRange]);

    // Handler for MUI Slider change
    // const handleSliderChange = (event: Event, newValue: number | number[]) => {
    //   if (Array.isArray(newValue) && newValue.length === 2) {
    //     setValueRange([newValue[0], newValue[1]]);
    //   }
    // };

    useEffect( () => {
            console.log("building selection areas")
            console.log(buildingSelectionAreas)

            // await api(ROUTES.app.getVBuildingDataInPolygon,buildingSelectionAreas)//Sort out the asynchronous aspect at some point.
            api(ROUTES.app.getVBuildingDataInPolygon,buildingSelectionAreas)//I suspect this will currently fail wil multiple polygons.
                .then((res) => {})
                .catch(err => console.error(err));
        }
        , [buildingSelectionAreas])

    const drawingOngoing = useRef<boolean>(false)


    return (
        <div style={{display: "flex"}}>
            {/* Map section */}
            <div style={{flex: 3, height: "100vh"}}>
                <MapContainer
                    crs={CRS.EPSG3857}
                    center={[53.46, -1.29]}
                    zoom={11}
                    style={{height: "100%", width: "100%"}}
                    whenCreated={(mapInstance) => {
                        mapRef.current = mapInstance;
                    }}
                >
                    <MapViewListener
                        onViewChange={(zoom, bounds) => {
                            setMapState({zoom, bounds});
                            console.log(`New zoom : ${zoom}`);
                            console.log(`New bounds: ${[bounds.getWest(), bounds.getEast(), bounds.getSouth(), bounds.getNorth()].join(", ")}`);
                            setVisibleTiles(getVisibleTiles(bounds, zoom));
                        }
                        }
                    />
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />

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
                            ref={buildingsRef}
                            key={`buildings-${mapState.zoom}-${mergedCollection.features.length}`}
                            data={mergedCollection as any}
                            style={styleBuilding}
                            pointerEvents={drawingOngoing.current ? true : "none"} // If polygon drawing is ongoing then individual building mouseover needs to be disabled.
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
                                    setBuildingSelectionAreas((current) => [...current, geojson]);
                                    // Note that we should consider bringing back the data *without* geometry where possible.
                                    // Especially if allowing large selections.
                                }
                            }}
                        />
                    </FeatureGroup>
                </MapContainer>
            </div>

            {/* Controls panel */}
            <div style={{flex: 1, padding: "1rem", borderLeft: "1px solid #ccc"}}>
                <Typography variant="h6">Map Controls</Typography>

                {/* Dataset selector */}
                <FormControl fullWidth sx={{mt: 2}}>
                    <InputLabel>Dataset</InputLabel>
                    <Select
                        value={selectedDataset}
                        label="Dataset"
                        onChange={(e) => setSelectedDataset(e.target.value)}
                    >
                        {Object.keys(DATASETS).map((name) => (
                            <MenuItem key={name} value={name}>
                                {name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Value range slider */}
                <Box sx={{mt: 4}}>
                    <Typography gutterBottom>Filter by value</Typography>
                    <Slider
                        value={valueRange}
                        onChange={(_, val) =>
                            Array.isArray(val) && setValueRange([val[0], val[1]])
                        }
                        valueLabelDisplay="auto"
                        min={
                            geoData ? Math.min(...geoData.features.map((f: any) => f.properties.value)) : 0
                        }
                        max={
                            geoData ? Math.max(...geoData.features.map((f: any) => f.properties.value)) : 100
                        }
                    />
                    <Typography variant="body2">
                        Showing values between <b>{valueRange[0]}</b> and <b>{valueRange[1]}</b>
                    </Typography>
                </Box>

                {/* Selected area info */}
                <Box sx={{mt: 3}}>
                    {selectedArea ? (
                        <>
                            <Typography variant="subtitle1">{selectedArea.name}</Typography>
                            <Typography>Value: {selectedArea.value}</Typography>
                        </>
                    ) : (
                        <Typography variant="body2">Click an area for details</Typography>
                    )}
                </Box>


                <Button onClick={() => {
                    api(ROUTES.app.optimiseDHNlayout, {
                        param1: 5,
                        param2: 8,
                        param3: 4,
                        param4: 0,
                    });
                }}
                >
                    Optimise
                </Button>


            </div>
        </div>
    );
};

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
