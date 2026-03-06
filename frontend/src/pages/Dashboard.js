import { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import SignalTicker from '../components/SignalTicker';
import SignalCard from '../components/SignalCard';
import { Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ isDiscovering }) => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchSignals = async () => {
    try {
      const response = await axios.get(`${API}/signals/summary`);
      setSignals(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching signals:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#050505]/80 border-b border-zinc-800">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tight" data-testid="dashboard-title">
                POLYMARKET SIGNALS
              </h1>
              <p className="text-zinc-500 text-xs md:text-sm font-mono mt-1">
                REAL-TIME PREDICTION MARKET INTELLIGENCE
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2" data-testid="live-indicator">
                <div className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse" />
                <span className="text-xs font-mono text-zinc-400">LIVE</span>
              </div>
              <button
                onClick={() => navigate('/markets')}
                className="bg-transparent border border-zinc-700 text-zinc-300 hover:border-zinc-500 rounded-sm font-mono text-xs px-4 py-2 transition-colors"
                data-testid="markets-btn"
              >
                MARKETS
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Ticker Tape */}
      <SignalTicker signals={signals} />

      {/* Main Content */}
      <main className="px-4 md:px-6 py-6">
        {isDiscovering && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-[#09090B] border border-[#00D1FF]/30 rounded-sm flex items-center gap-3"
            data-testid="discovery-banner"
          >
            <Activity className="w-5 h-5 text-[#00D1FF] animate-pulse" />
            <span className="text-sm font-mono text-zinc-300">
              Discovering markets from Polymarket API...
            </span>
          </motion.div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#09090B] border border-zinc-800 p-4 rounded-sm" data-testid="stat-total-markets">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500 uppercase">Total Markets</span>
              <TrendingUp className="w-4 h-4 text-[#00D1FF]" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold">
              {signals.reduce((acc, s) => acc + s.market_count, 0)}
            </div>
          </div>

          <div className="bg-[#09090B] border border-zinc-800 p-4 rounded-sm" data-testid="stat-total-volume">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500 uppercase">Total Volume</span>
              <Activity className="w-4 h-4 text-[#00FF94]" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold">
              ${(signals.reduce((acc, s) => acc + s.total_volume, 0) / 1000000).toFixed(1)}M
            </div>
          </div>

          <div className="bg-[#09090B] border border-zinc-800 p-4 rounded-sm" data-testid="stat-active-signals">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500 uppercase">Active Signals</span>
              <AlertCircle className="w-4 h-4 text-[#FFD600]" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold">
              {signals.filter(s => s.market_count > 0).length}
            </div>
          </div>
        </div>

        {/* Signal Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20" data-testid="loading-spinner">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#00FF94] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="signals-grid">
            {signals.map((signal, idx) => (
              <SignalCard key={signal.signal} signal={signal} index={idx} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-4 md:px-6 py-4 mt-12">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-600">
          <span>POWERED BY POLYMARKET API</span>
          <span>DATA UPDATES EVERY 30S</span>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;