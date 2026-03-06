import { useEffect, useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, TrendingUp, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

const MarketExplorer = () => {
  const [markets, setMarkets] = useState([]);
  const [filteredMarkets, setFilteredMarkets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSignal, setSelectedSignal] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const signals = ['all', 'geopolitics', 'macroeconomics', 'crypto', 'tech'];

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await axios.get(`${API}/markets?limit=100`);
        setMarkets(response.data);
        setFilteredMarkets(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching markets:', error);
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  useEffect(() => {
    let filtered = markets;

    // Filter by signal
    if (selectedSignal !== 'all') {
      filtered = filtered.filter(m => m.signals.includes(selectedSignal));
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.question.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredMarkets(filtered);
  }, [searchQuery, selectedSignal, markets]);

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#050505]/80 border-b border-zinc-800">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-zinc-400 hover:text-white transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tight" data-testid="explorer-title">
                MARKET EXPLORER
              </h1>
              <p className="text-zinc-500 text-xs md:text-sm font-mono mt-1">
                {filteredMarkets.length} MARKETS
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-6 py-6">
        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative" data-testid="search-container">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:ring-1 focus:ring-zinc-500 rounded-sm font-mono text-sm placeholder:text-zinc-600 pl-10 pr-4 py-3 outline-none"
              data-testid="search-input"
            />
          </div>

          {/* Signal Filter */}
          <div className="flex gap-2 flex-wrap" data-testid="signal-filters">
            {signals.map(signal => (
              <button
                key={signal}
                onClick={() => setSelectedSignal(signal)}
                className={`px-4 py-2 rounded-sm font-mono text-xs uppercase transition-colors ${
                  selectedSignal === signal
                    ? 'bg-white text-black'
                    : 'bg-transparent border border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
                data-testid={`filter-${signal}`}
              >
                {signal}
              </button>
            ))}
          </div>
        </div>

        {/* Markets List */}
        {loading ? (
          <div className="flex items-center justify-center py-20" data-testid="loading-spinner">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#00FF94] rounded-full animate-spin" />
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-20" data-testid="no-markets">
            <p className="text-zinc-500 font-mono">No markets found</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="markets-list">
            {filteredMarkets.map((market, idx) => (
              <motion.div
                key={market.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="bg-[#09090B] border border-zinc-800 hover:border-zinc-600 rounded-sm p-4 transition-colors cursor-pointer"
                data-testid={`market-${idx}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-sans text-base font-medium mb-2">
                      {market.question}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {market.signals.map(sig => (
                        <span
                          key={sig}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-xs font-mono text-zinc-400"
                        >
                          {sig}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono mb-1">
                      <DollarSign className="w-3 h-3" />
                      ${(market.volume / 1000).toFixed(0)}K
                    </div>
                    {market.category && (
                      <div className="text-xs font-mono text-zinc-600">
                        {market.category}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MarketExplorer;