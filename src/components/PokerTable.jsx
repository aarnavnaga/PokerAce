import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import './PokerTable.css';

export default function PokerTable({ communityCards, pot, message }) {
  return (
    <div className="poker-table">
      <div className="poker-table__felt">
        <div className="poker-table__felt-inner">
          {/* Decorative elements */}
          <div className="poker-table__logo">
            POKER<span>ACE</span>
          </div>

          {/* Pot display */}
          <AnimatePresence>
            {pot > 0 && (
              <motion.div
                className="poker-table__pot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={pot}
              >
                <div className="pot-chips">
                  <span className="pot-chip pot-chip--1" />
                  <span className="pot-chip pot-chip--2" />
                  <span className="pot-chip pot-chip--3" />
                </div>
                <span className="pot-amount">Pot: ${pot}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Community cards */}
          <div className="poker-table__community">
            <AnimatePresence>
              {communityCards.map((card, i) => (
                <Card key={card.id} card={card} delay={i * 0.15} />
              ))}
            </AnimatePresence>
          </div>

          {/* Phase message */}
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
