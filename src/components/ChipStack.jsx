import { motion } from 'framer-motion';
import './ChipStack.css';

const DENOMINATIONS = [
  { value: 500, bg: '#8b5cf6', edge: '#7c3aed' },
  { value: 100, bg: '#1e1b3a', edge: '#13112a' },
  { value: 50, bg: '#c9a84c', edge: '#a08636' },
  { value: 25, bg: '#22c55e', edge: '#16a34a' },
  { value: 10, bg: '#3b82f6', edge: '#2563eb' },
  { value: 5, bg: '#ef4444', edge: '#dc2626' },
];

export default function ChipStack({ amount, maxChips = 8, animate = false, size = 'md' }) {
  if (amount <= 0) return null;

  const chips = [];
  let remaining = amount;
  for (const d of DENOMINATIONS) {
    while (remaining >= d.value && chips.length < maxChips) {
      chips.push(d);
      remaining -= d.value;
    }
  }
  if (chips.length === 0 && amount > 0) {
    chips.push(DENOMINATIONS[DENOMINATIONS.length - 1]);
  }

  const gapMap = { sm: 3, md: 4, lg: 5, xl: 6 };
  const discMap = { sm: 7, md: 9, lg: 11, xl: 13 };
  const gap = gapMap[size] || 4;
  const discH = discMap[size] || 9;
  const h = chips.length > 0 ? (chips.length - 1) * gap + discH : 0;

  return (
    <div className={`chip-stack chip-stack--${size}`} style={{ height: `${h}px` }}>
      {chips.map((chip, i) => (
        <motion.div
          key={`${i}-${chip.value}`}
          className="chip-disc"
          style={{
            '--chip-bg': chip.bg,
            '--chip-edge': chip.edge,
            bottom: `${i * gap}px`,
            zIndex: i,
          }}
          initial={animate ? { y: -20, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={animate ? {
            delay: i * 0.04,
            type: 'spring',
            stiffness: 400,
            damping: 20,
          } : { duration: 0 }}
        />
      ))}
    </div>
  );
}
