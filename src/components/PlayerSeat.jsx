import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';
import './PlayerSeat.css';

const BOT_AVATARS = ['🐹', '🐼', '🐱', '🦊'];

export default function PlayerSeat({
  player,
  isDealer,
  isCurrentTurn,
  isShowdown,
  wonByFold,
  isWinner,
  position,
  seatIndex,
}) {
  const isHuman = player.isHuman;
  const avatar = isHuman ? '😎' : BOT_AVATARS[seatIndex % BOT_AVATARS.length];

  const revealCards =
    isShowdown && !wonByFold && !player.folded && !player.sittingOut;

  const showFaceUp = isHuman || revealCards;

  return (
    <motion.div
      className={`player-seat player-seat--${position} ${isCurrentTurn ? 'player-seat--active' : ''} ${player.folded ? 'player-seat--folded' : ''} ${player.sittingOut ? 'player-seat--out' : ''} ${isWinner ? 'player-seat--winner' : ''}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: seatIndex * 0.1 }}
    >
      {isDealer && (
        <motion.div
          className="dealer-chip"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          D
        </motion.div>
      )}

      <div className="player-seat__avatar-wrap">
        <div
          className={`player-seat__avatar ${isCurrentTurn ? 'player-seat__avatar--pulse' : ''}`}
        >
          {avatar}
        </div>
        {isCurrentTurn && !player.folded && (
          <motion.div
            className="player-seat__turn-ring"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              repeat: Infinity,
              repeatType: 'reverse',
              duration: 0.8,
            }}
          />
        )}
      </div>

      <div className="player-seat__info">
        <span className="player-seat__name">{player.name}</span>
        <span className="player-seat__chips">${player.chips}</span>
      </div>

      <AnimatePresence>
        {player.lastAction && !isShowdown && (
          <motion.div
            className="player-seat__action"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            key={player.lastAction}
          >
            {player.lastAction}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="player-seat__cards">
        {player.holeCards.map((card, i) => (
          <Card
            key={card.id}
            card={card}
            faceDown={!showFaceUp}
            small={!isHuman && !revealCards}
            delay={revealCards && !isHuman ? i * 0.15 + 0.2 : i * 0.12}
          />
        ))}
      </div>

      <AnimatePresence>
        {isShowdown && !wonByFold && !player.folded && !player.sittingOut && player.evaluatedHand && (
          <motion.div
            className={`player-seat__hand-name ${isWinner ? 'player-seat__hand-name--winner' : ''}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {player.evaluatedHand.name}
          </motion.div>
        )}
      </AnimatePresence>

      {isWinner && isShowdown && (
        <motion.div
          className="player-seat__winner-badge"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
        >
          WINNER
        </motion.div>
      )}
    </motion.div>
  );
}
