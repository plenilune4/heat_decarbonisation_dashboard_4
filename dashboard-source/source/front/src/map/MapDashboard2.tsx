// noinspection TypeScriptValidateTypes
//this is a dummy change

import React, { useEffect, useState, useRef } from "react";
import RangeSlider from 'react-range-slider-input';

import L from "leaflet";

import {MapContainer} from "react-leaflet";
import {TileLayer, GeoJSON } from "react-leaflet";
import { FeatureCollection, Feature } from "geojson";
import "leaflet/dist/leaflet.css";

import {
  Box,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";

interface FeatureProperties {
  name: string;
  value: number;
}

const DATASETS:{[key:string]:string} = {
  "LSOA": "/data/LSOAs_for_dashboard.geojson",
  "OA": "/data/OAs_for_dashboard.geojson",
  "Secondary substation": "/data/secondaries_for_dashboard.geojson",
};

const MapDashboard: React.FC = () => {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [selectedArea, setSelectedArea] = useState<FeatureProperties | null>(null);
  const [valueRange, setValueRange] = useState<[number, number]>([0, 100]);
  const [selectedDataset, setSelectedDataset] = useState<string>("LSOA");
  const mapRef = useRef<L.Map | null>(null);

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

  // Fetch GeoJSON whenever dataset changes
  useEffect(() => {
    const url = DATASETS[selectedDataset];
    fetch(url)
      .then((res) => res.json())
      .then((data:FeatureCollection) => {
        setGeoData(data);
        // Reset slider range to dataset’s min/max
        const vals = data.features.map((f: any) => f.properties.value);
        const minv = Math.min(...vals);
        const maxv = Math.max(...vals);
        setValueRange([minv, maxv]);

        // Zoom to dataset extent
        if (mapRef.current) {
          const layer = L.geoJSON(data);
          const bounds = layer.getBounds();
          if (bounds.isValid()) mapRef.current.fitBounds(bounds);
        }
      })
      .catch((err) => console.error("Failed to fetch GeoJSON:", err));
  }, [selectedDataset]);

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

  // Zoom to filtered polygons
  useEffect(() => {
    if (!geoData || !mapRef.current) return;
    const [minv, maxv] = valueRange;
    const filtered = geoData.features.filter(
      (f: any) => f.properties.value >= minv && f.properties.value <= maxv
    );
    const subset = { ...geoData, features: filtered };
    const layer = L.geoJSON(subset);
    const bounds = layer.getBounds();
    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [20, 20] });
  }, [geoData, valueRange]);

  // Handler for MUI Slider change
  // const handleSliderChange = (event: Event, newValue: number | number[]) => {
  //   if (Array.isArray(newValue) && newValue.length === 2) {
  //     setValueRange([newValue[0], newValue[1]]);
  //   }
  // };

  const map_centre = [54.95, -1.5]

  return (
    <div style={{ display: "flex" }}>
      {/* Map section */}
      <div style={{ flex: 3, height: "100vh" }}>
        <MapContainer
          center={[54.95, -1.5]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          // whenCreated={(mapInstance) => {
          //   mapRef.current = mapInstance;
          // }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {geoData && (
            <GeoJSON
              key={`${selectedDataset}-${JSON.stringify(valueRange)}`}
              data={geoData as any}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>
      </div>

      {/* Controls panel */}
      <div style={{ flex: 1, padding: "1rem", borderLeft: "1px solid #ccc" }}>
        <Typography variant="h6">Map Controls</Typography>

        {/* Dataset selector */}
        <FormControl fullWidth sx={{ mt: 2 }}>
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
        <Box sx={{ mt: 4 }}>
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
        <Box sx={{ mt: 3 }}>
          {selectedArea ? (
            <>
              <Typography variant="subtitle1">{selectedArea.name}</Typography>
              <Typography>Value: {selectedArea.value}</Typography>
            </>
          ) : (
            <Typography variant="body2">Click an area for details</Typography>
          )}
        </Box>
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
