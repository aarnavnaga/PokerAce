import { AnimatePresence, motion } from 'framer-motion';
import PokerTable from './components/PokerTable';
import PlayerSeat from './components/PlayerSeat';
import ActionControls from './components/ActionControls';
import AceHelper from './components/AceHelper';
import usePokerGame from './hooks/usePokerGame';
import { PHASES } from './engine/gameState';
import './App.css';

const SEAT_POSITIONS = ['bottom', 'left', 'top-left', 'top-right', 'right'];

function ShowdownBar({ gameState, onNextHand }) {
  const { winners, wonByFold, message } = gameState;
  if (!winners || winners.length === 0) return null;

  const winAmount = winners[0].amount;
  const winnerNames = winners.map(w => w.player.name).join(' & ');
  const handName = wonByFold
    ? 'Everyone else folded'
    : winners[0].hand?.name || '';

  return (
    <motion.div
      className="showdown-bar"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
    >
      <div className="showdown-bar__result">
        <span className="showdown-bar__crown">👑</span>
        <div className="showdown-bar__text">
          <span className="showdown-bar__winner">{winnerNames}</span>
          <span className="showdown-bar__detail">
            {handName} &mdash; wins <strong>${winAmount}</strong>
          </span>
        </div>
      </div>
      <motion.button
        className="showdown-bar__btn"
        onClick={onNextHand}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Next Hand
      </motion.button>
    </motion.div>
  );
}

function StartScreen({ onStart }) {
  return (
    <motion.div
      className="start-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="start-screen__content">
        <motion.div
          className="start-screen__logo"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="start-screen__suits">♠ ♥ ♦ ♣</div>
          <h1>
            POKER<span>ACE</span>
          </h1>
          <p className="start-screen__subtitle">Texas Hold&apos;em</p>
        </motion.div>

        <motion.div
          className="start-screen__info"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="start-screen__feature">
            <span>🤖</span> Play against 4 AI opponents
          </div>
          <div className="start-screen__feature">
            <span>🃏</span> Full Texas Hold&apos;em rules
          </div>
          <div className="start-screen__feature">
            <span>🪙</span> $1,000 starting chips
          </div>
        </motion.div>

        <motion.button
          className="start-btn"
          onClick={onStart}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{
            scale: 1.05,
            boxShadow: '0 8px 30px rgba(201, 168, 76, 0.4)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          Deal Me In
        </motion.button>
      </div>
    </motion.div>
  );
}

function GameOverScreen({ gameState, onRestart }) {
  const winner = gameState.players.find(p => p.chips > 0);
  return (
    <motion.div
      className="winner-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="winner-card"
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
      >
        <div className="winner-card__crown">🏆</div>
        <h2 className="winner-card__title">Game Over!</h2>
        <p className="winner-card__hand">
          {winner ? `${winner.name} wins the tournament!` : 'Game Over'}
        </p>
        <motion.button
          className="winner-card__btn"
          onClick={onRestart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Play Again
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const {
    gameState,
    startGame,
    nextHand,
    handlePlayerAction,
    availableActions,
    isPlayerTurn,
    isProcessing,
    showdownReveal,
  } = usePokerGame();

  if (!gameState) {
    return (
      <div className="app">
        <AnimatePresence>
          <StartScreen onStart={startGame} />
        </AnimatePresence>
      </div>
    );
  }

  const isShowdown = gameState.phase === PHASES.SHOWDOWN;
  const isGameOver = gameState.phase === PHASES.GAME_OVER;
  const winnerIds = new Set(
    (gameState.winners || []).map(w => w.player.id)
  );

  return (
    <div className="app">
      <div className="game-hud">
        <div className="hud-left">
          <span className="hud-label">Round</span>
          <span className="hud-value">{gameState.roundNumber}</span>
        </div>
        <div className="hud-center">
          <span className="hud-phase">{gameState.phase.toUpperCase()}</span>
        </div>
        <div className="hud-right">
          <span className="hud-label">Blinds</span>
          <span className="hud-value">
            ${gameState.smallBlind}/${gameState.bigBlind}
          </span>
        </div>
      </div>

      <div className="game-area">
        <PokerTable
          communityCards={gameState.communityCards}
          pot={gameState.pot}
          message={gameState.message}
        />

        {gameState.players.map((player, i) => (
          <PlayerSeat
            key={player.id}
            player={player}
            isDealer={i === gameState.dealerIndex}
            isCurrentTurn={
              i === gameState.currentPlayerIndex &&
              !isShowdown &&
              !isGameOver
            }
            isShowdown={isShowdown && showdownReveal}
            wonByFold={gameState.wonByFold}
            isWinner={winnerIds.has(player.id)}
            position={SEAT_POSITIONS[i]}
            seatIndex={i}
          />
        ))}
      </div>

      <AnimatePresence>
        {isPlayerTurn && !isProcessing && (
          <ActionControls
            state={gameState}
            availableActions={availableActions}
            onAction={handlePlayerAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShowdown && showdownReveal && gameState.winners && (
          <ShowdownBar gameState={gameState} onNextHand={nextHand} />
        )}
      </AnimatePresence>

      {isGameOver && (
        <GameOverScreen gameState={gameState} onRestart={startGame} />
      )}

      {isProcessing && (
        <div className="thinking-indicator">
          <div className="thinking-dot" />
          <div className="thinking-dot" />
          <div className="thinking-dot" />
        </div>
      )}

      <AceHelper gameState={gameState} isPlayerTurn={isPlayerTurn} />
    </div>
  );
}
