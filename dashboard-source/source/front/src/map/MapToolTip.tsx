import React, {useState} from 'react';
import {MapContainer, TileLayer, useMapEvents} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// 1. Create a custom component to listen to Map events
export default function MapGlobalTooltip() {
    const [tooltip, setTooltip] = useState({visible: false, x: 0, y: 0, content: ''});

    useMapEvents({
        mousemove: (e) => {
            // e.originalEvent contains the mouse coordinates relative to the screen/container
            const {clientX, clientY} = e.originalEvent;

            // Update coordinates and text dynamically based on the geographic location (e.latlng)
            setTooltip({
                visible: true,
                x: clientX + 15, // Offset to avoid overlapping the cursor
                y: clientY + 15,
                content: `Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)}`
            });
        },
        mouseout: () => {
            // Hide the tooltip when the mouse leaves the map container
            setTooltip((prev) => ({...prev, visible: false}));
        }
    });

    if (!tooltip.visible) return null;

    // Render a fixed element matching the cursor location
    return (
        <div
            style={{
                position: 'fixed',
                left: tooltip.x,
                top: tooltip.y,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                pointerEvents: 'none', // Prevents the tooltip from breaking mouse events
                zIndex: 1000,          // Ensures it floats above the map tiles
            }}
        >
            {/*{tooltip.content}*/}
            Select building stock for your case study by clicking on individual buildings,
            using the polygon tool, or choosing an existing selection from the sidebar.
        </div>
    );
}