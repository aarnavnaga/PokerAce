import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ACTIONS, getCallAmount, getMinRaise } from '../engine/gameState';
import './ActionControls.css';

export default function ActionControls({ state, availableActions, onAction }) {
  const callAmount = useMemo(() => getCallAmount(state), [state]);
  const minRaise = useMemo(() => getMinRaise(state), [state]);
  const player = state.players[state.currentPlayerIndex];
  const maxRaise = player.chips + player.currentBet;

  const [raiseValue, setRaiseValue] = useState(minRaise);
  const [showRaiseSlider, setShowRaiseSlider] = useState(false);

  const handleRaise = () => {
    if (!showRaiseSlider) {
      setRaiseValue(minRaise);
      setShowRaiseSlider(true);
      return;
    }
    onAction(ACTIONS.RAISE, raiseValue);
    setShowRaiseSlider(false);
  };

  const presetRaises = useMemo(() => {
    const pot = state.pot;
    return [
      { label: '½ Pot', value: Math.max(minRaise, Math.floor(state.currentBet + pot * 0.5)) },
      { label: 'Pot', value: Math.max(minRaise, Math.floor(state.currentBet + pot)) },
      { label: '2× Pot', value: Math.max(minRaise, Math.floor(state.currentBet + pot * 2)) },
    ].filter(p => p.value <= maxRaise);
  }, [state, minRaise, maxRaise]);

  return (
    <motion.div
      className="action-controls"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
    >
      <div className="action-controls__buttons">
        {availableActions.includes(ACTIONS.FOLD) && (
          <motion.button
            className="action-btn action-btn--fold"
            onClick={() => { onAction(ACTIONS.FOLD); setShowRaiseSlider(false); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Fold
          </motion.button>
        )}

        {availableActions.includes(ACTIONS.CHECK) && (
          <motion.button
            className="action-btn action-btn--check"
            onClick={() => { onAction(ACTIONS.CHECK); setShowRaiseSlider(false); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Check
          </motion.button>
        )}

        {availableActions.includes(ACTIONS.CALL) && (
          <motion.button
            className="action-btn action-btn--call"
            onClick={() => { onAction(ACTIONS.CALL); setShowRaiseSlider(false); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Call ${callAmount}
          </motion.button>
        )}

        {availableActions.includes(ACTIONS.RAISE) && (
          <motion.button
            className={`action-btn action-btn--raise ${showRaiseSlider ? 'action-btn--raise-active' : ''}`}
            onClick={handleRaise}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {showRaiseSlider ? `Raise to $${raiseValue}` : 'Raise'}
          </motion.button>
        )}

        {availableActions.includes(ACTIONS.ALL_IN) && (
          <motion.button
            className="action-btn action-btn--allin"
            onClick={() => { onAction(ACTIONS.ALL_IN); setShowRaiseSlider(false); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            All-In ${player.chips}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showRaiseSlider && (
          <motion.div
            className="raise-slider-area"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="raise-presets">
              {presetRaises.map(p => (
                <button
                  key={p.label}
                  className={`raise-preset ${raiseValue === p.value ? 'raise-preset--active' : ''}`}
                  onClick={() => setRaiseValue(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="raise-slider-row">
              <span className="raise-label">${minRaise}</span>
              <input
                type="range"
                className="raise-slider"
                min={minRaise}
                max={maxRaise}
                step={state.bigBlind || 20}
                value={raiseValue}
                onChange={e => setRaiseValue(parseInt(e.target.value))}
              />
              <span className="raise-label">${maxRaise}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
