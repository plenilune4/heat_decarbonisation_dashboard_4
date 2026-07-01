import React from 'react';
import logo from '../../logo.svg';
import './App.css';
import 'leaflet/dist/leaflet.css';
import MapDashboard from '@/map/MapDashboard2';
import Greeting from "@/experimenting/test_bits";
function App() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
        {/*<Greeting name={"Theophilus"}></Greeting>*/}
      <MapDashboard />
    </div>);
}

export default App;
