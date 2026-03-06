import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

const SIGNAL_ICONS = {
  geopolitics: '🌍',
  macroeconomics: '📊',
  crypto: '₿',
  tech: '🤖'
};

const SIGNAL_COLORS = {
  geopolitics: '#FF0055',
  macroeconomics: '#00D1FF',
  crypto: '#FFD600',
  tech: '#00FF94'
};

const SignalCard = ({ signal, index }) => {
  const navigate = useNavigate();
  const probability = signal.avg_probability * 100;
  const isPositive = probability >= 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-[#09090B] border border-zinc-800 hover:border-zinc-600 rounded-sm p-6 transition-all duration-200 cursor-pointer group"
      onClick={() => navigate(`/signal/${signal.signal}`)}
      data-testid={`signal-card-${signal.signal}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{SIGNAL_ICONS[signal.signal]}</span>
            <h2 className="font-mono text-xl font-bold uppercase tracking-tight">
              {signal.signal}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <Activity className="w-3 h-3" />
            <span>{signal.market_count} markets</span>
          </div>
        </div>
        <div className="text-right">
          <div
            className="font-mono text-3xl font-bold tracking-tight"
            style={{ color: SIGNAL_COLORS[signal.signal] }}
          >
            {probability.toFixed(1)}%
          </div>
          {signal.momentum !== null && (
            <div
              className={`flex items-center gap-1 text-xs font-mono mt-1 ${
                signal.momentum > 0 ? 'text-[#00FF94]' : 'text-[#FF0055]'
              }`}
            >
              {signal.momentum > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(signal.momentum).toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-zinc-900 rounded-sm overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${probability}%` }}
            transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
            className="h-full"
            style={{
              background: `linear-gradient(90deg, ${SIGNAL_COLORS[signal.signal]}CC, ${SIGNAL_COLORS[signal.signal]})`
            }}
          />
        </div>
      </div>

      {/* Top Markets */}
      <div>
        <div className="text-xs font-mono text-zinc-600 uppercase mb-3">Top Markets</div>
        {signal.top_markets.length > 0 ? (
          <div className="space-y-2">
            {signal.top_markets.slice(0, 3).map((market, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <span className="text-zinc-400 font-sans flex-1 line-clamp-1">
                  {market.question}
                </span>
                <span
                  className="font-mono text-xs font-bold whitespace-nowrap"
                  style={{ color: SIGNAL_COLORS[signal.signal] }}
                >
                  {(market.probability * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-zinc-600 text-sm font-mono">No active markets</div>
        )}
      </div>

      {/* Volume Footer */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-mono text-zinc-600">TOTAL VOLUME</span>
        <span className="text-sm font-mono font-bold text-zinc-400">
          ${(signal.total_volume / 1000).toFixed(0)}K
        </span>
      </div>
    </motion.div>
  );
};

export default SignalCard;