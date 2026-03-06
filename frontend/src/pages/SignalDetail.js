import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { ArrowLeft, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const SignalDetail = () => {
  const { signalId } = useParams();
  const navigate = useNavigate();
  const [timeseries, setTimeseries] = useState([]);
  const [explanation, setExplanation] = useState(null);
  const [loadingChart, setLoadingChart] = useState(true);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  useEffect(() => {
    const fetchTimeseries = async () => {
      try {
        const response = await axios.get(`${API}/signals/${signalId}/timeseries?hours=48`);
        const data = response.data.map(d => ({
          ...d,
          timestamp: new Date(d.timestamp).getTime(),
          probability: d.probability * 100
        }));
        setTimeseries(data);
        setLoadingChart(false);
      } catch (error) {
        console.error('Error fetching timeseries:', error);
        setLoadingChart(false);
      }
    };

    fetchTimeseries();
  }, [signalId]);

  const generateExplanation = async () => {
    setLoadingExplanation(true);
    try {
      const response = await axios.post(`${API}/signals/${signalId}/explain`);
      setExplanation(response.data);
    } catch (error) {
      console.error('Error generating explanation:', error);
    }
    setLoadingExplanation(false);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#09090B] border border-zinc-700 p-3 rounded-sm">
          <p className="text-xs font-mono text-zinc-400 mb-1">
            {new Date(payload[0].payload.timestamp).toLocaleString()}
          </p>
          <p className="text-sm font-mono font-bold text-[#00FF94]">
            {payload[0].value.toFixed(2)}%
          </p>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            {payload[0].payload.market_count} markets
          </p>
        </div>
      );
    }
    return null;
  };

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
              <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tight uppercase" data-testid="signal-title">
                {signalId}
              </h1>
              <p className="text-zinc-500 text-xs md:text-sm font-mono mt-1">
                SIGNAL ANALYTICS
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 md:px-6 py-6">
        {/* AI Explanation Section */}
        <div className="mb-6">
          <div className="bg-[#09090B] border border-zinc-800 rounded-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00D1FF]" />
                <h2 className="font-mono text-lg font-bold">AI ANALYSIS</h2>
              </div>
              <button
                onClick={generateExplanation}
                disabled={loadingExplanation}
                className="bg-white text-black hover:bg-zinc-200 rounded-sm font-mono uppercase text-xs tracking-wider px-4 py-2 disabled:opacity-50 transition-colors"
                data-testid="generate-explanation-btn"
              >
                {loadingExplanation ? 'GENERATING...' : 'GENERATE'}
              </button>
            </div>

            {explanation ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-testid="explanation-text"
              >
                <p className="text-zinc-300 font-sans text-sm leading-relaxed mb-4">
                  {explanation.explanation}
                </p>
                <div className="pt-4 border-t border-zinc-800">
                  <p className="text-xs font-mono text-zinc-600 mb-2">KEY MARKETS:</p>
                  <div className="space-y-1">
                    {explanation.key_markets.map((market, idx) => (
                      <p key={idx} className="text-xs font-sans text-zinc-400">
                        • {market}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-8" data-testid="no-explanation">
                <AlertCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-sm font-mono text-zinc-600">
                  Click generate to get AI-powered analysis
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="bg-[#09090B] border border-zinc-800 rounded-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-[#00FF94]" />
            <h2 className="font-mono text-lg font-bold">PROBABILITY OVER TIME</h2>
          </div>

          {loadingChart ? (
            <div className="flex items-center justify-center py-20" data-testid="chart-loading">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#00FF94] rounded-full animate-spin" />
            </div>
          ) : timeseries.length === 0 ? (
            <div className="text-center py-20" data-testid="no-data">
              <p className="text-zinc-500 font-mono text-sm">No time series data available</p>
            </div>
          ) : (
            <div className="w-full h-80" data-testid="timeseries-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" opacity={0.1} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                    stroke="#52525B"
                    style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    stroke="#52525B"
                    style={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="probability"
                    stroke="#00FF94"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#00FF94' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SignalDetail;