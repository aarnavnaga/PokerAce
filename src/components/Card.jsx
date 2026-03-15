import { motion } from 'framer-motion';
import './Card.css';

export default function Card({ card, faceDown = false, small = false, delay = 0 }) {
  const isRed = card && (card.suit === 'hearts' || card.suit === 'diamonds');

  return (
    <motion.div
      className={`card ${small ? 'card--small' : ''} ${faceDown ? 'card--facedown' : ''} ${!faceDown && isRed ? 'card--red' : ''} ${!faceDown ? 'card--black' : ''}`}
      style={{ perspective: 800 }}
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0, rotateY: faceDown ? 180 : 0 }}
      transition={{
        opacity: { duration: 0.3, delay },
        y: { duration: 0.4, delay, type: 'spring', stiffness: 200, damping: 20 },
        rotateY: { duration: 0.5, delay: delay + 0.1, type: 'spring', stiffness: 150, damping: 20 },
      }}
      whileHover={!small ? { y: -8, scale: 1.05 } : {}}
    >
      <div className="card__inner">
        {/* Front face */}
        {card && (
          <div className={`card__face ${isRed ? 'card__face--red' : 'card__face--black'}`}>
            <div className="card__corner card__corner--top">
              <span className="card__rank">{card.rank}</span>
              <span className="card__suit-symbol">{card.symbol}</span>
            </div>
            <div className="card__center">
              <span className="card__center-symbol">{card.symbol}</span>
            </div>
            <div className="card__corner card__corner--bottom">
              <span className="card__rank">{card.rank}</span>
              <span className="card__suit-symbol">{card.symbol}</span>
            </div>
          </div>
        )}

        {/* Back face */}
        <div className="card__back">
          <div className="card__back-pattern">
            <div className="card__back-inner">
              <span className="card__back-icon">♠♥</span>
              <span className="card__back-icon">♦♣</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
