import { useEffect, useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MarketExplorer from './pages/MarketExplorer';
import SignalDetail from './pages/SignalDetail';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  const [isDiscovering, setIsDiscovering] = useState(false);

  useEffect(() => {
    // Trigger initial market discovery
    const triggerDiscovery = async () => {
      try {
        setIsDiscovering(true);
        await axios.post(`${API}/markets/discover`);
        // Wait a bit for data to populate
        setTimeout(() => setIsDiscovering(false), 5000);
      } catch (e) {
        console.error('Error triggering discovery:', e);
        setIsDiscovering(false);
      }
    };

    triggerDiscovery();
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard isDiscovering={isDiscovering} />} />
          <Route path="/markets" element={<MarketExplorer />} />
          <Route path="/signal/:signalId" element={<SignalDetail />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;