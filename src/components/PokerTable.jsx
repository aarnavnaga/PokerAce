import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import ChipStack from './ChipStack';
import './PokerTable.css';

export default function PokerTable({ communityCards, pot, message }) {
  return (
    <div className="poker-table">
      <div className="poker-table__felt">
        <div className="poker-table__felt-inner">
          <div className="poker-table__logo">
            POKER<span>ACE</span>
          </div>

          <AnimatePresence>
            {pot > 0 && (
              <motion.div
                className="poker-table__pot"
                key={pot}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <ChipStack amount={pot} maxChips={14} size="lg" animate />
                <span className="pot-amount">${pot}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="poker-table__community">
            <AnimatePresence>
              {communityCards.map((card, i) => (
                <Card key={card.id} card={card} delay={i * 0.15} />
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                className="poker-table__message"
                key={message}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
