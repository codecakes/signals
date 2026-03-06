import { motion } from 'framer-motion';

const SignalTicker = ({ signals }) => {
  if (!signals || signals.length === 0) return null;

  // Duplicate signals for seamless loop
  const tickerItems = [...signals, ...signals];

  return (
    <div className="border-b border-zinc-800 bg-[#09090B] overflow-hidden" data-testid="signal-ticker">
      <div className="relative flex">
        <motion.div
          className="flex gap-8 py-3 px-4"
          animate={{
            x: [0, -50 + '%'],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 30,
              ease: 'linear',
            },
          }}
        >
          {tickerItems.map((signal, idx) => (
            <div
              key={`${signal.signal}-${idx}`}
              className="flex items-center gap-3 whitespace-nowrap"
            >
              <span className="font-mono text-xs uppercase text-zinc-500">
                {signal.signal}
              </span>
              <span
                className={`font-mono text-sm font-bold ${
                  signal.avg_probability > 0.5 ? 'text-[#00FF94]' : 'text-[#FF0055]'
                }`}
              >
                {(signal.avg_probability * 100).toFixed(1)}%
              </span>
              <span className="text-zinc-700">|</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default SignalTicker;