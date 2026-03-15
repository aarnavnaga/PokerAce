import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createPlayer,
  createInitialState,
  startNewHand,
  performAction,
  getAvailableActions,
  PHASES,
} from '../engine/gameState';
import { getBotAction, assignPersonality } from '../engine/botAI';

const BOT_NAMES = ['Ace Bot', 'Bluff King', 'Card Shark', 'Poker Pro'];
const BOT_DELAY = 800;

export default function usePokerGame() {
  const [gameState, setGameState] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showdownReveal, setShowdownReveal] = useState(false);
  const botPersonalities = useRef({});
  const botTimerRef = useRef(null);

  const clearBotTimer = () => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  };

  const isTerminal = (phase) =>
    phase === PHASES.SHOWDOWN || phase === PHASES.GAME_OVER;

  const scheduleBotAction = useCallback((state) => {
    clearBotTimer();

    if (!state || isTerminal(state.phase)) {
      setIsProcessing(false);
      if (state?.phase === PHASES.SHOWDOWN) {
        setShowdownReveal(true);
      }
      return;
    }

    const current = state.players[state.currentPlayerIndex];
    if (!current || current.isHuman || current.folded || current.sittingOut) {
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    botTimerRef.current = setTimeout(() => {
      const personality = botPersonalities.current[current.id] || 'balanced';
      const { action, amount } = getBotAction(state, personality);
      const nextState = performAction(state, action, amount);

      setGameState(nextState);

      if (isTerminal(nextState.phase)) {
        setIsProcessing(false);
        if (nextState.phase === PHASES.SHOWDOWN) {
          setShowdownReveal(true);
        }
        return;
      }

      const nextPlayer = nextState.players[nextState.currentPlayerIndex];
      if (nextPlayer && !nextPlayer.isHuman && !nextPlayer.folded && !nextPlayer.sittingOut) {
        scheduleBotAction(nextState);
      } else {
        setIsProcessing(false);
      }
    }, BOT_DELAY);
  }, []);

  const startGame = useCallback(() => {
    clearBotTimer();
    const human = createPlayer(0, 'You', true);
    const bots = BOT_NAMES.map((name, i) => {
      const player = createPlayer(i + 1, name, false);
      botPersonalities.current[i + 1] = assignPersonality();
      return player;
    });

    const players = [human, ...bots];
    let state = createInitialState(players);
    state = startNewHand(state);
    setGameState(state);
    setShowdownReveal(false);
    setIsProcessing(false);
  }, []);

  const nextHand = useCallback(() => {
    clearBotTimer();
    setGameState(prev => {
      if (!prev) return prev;
      setShowdownReveal(false);
      setIsProcessing(false);
      return startNewHand(prev);
    });
  }, []);

  const handlePlayerAction = useCallback((action, amount = 0) => {
    clearBotTimer();

    setGameState(prev => {
      if (!prev) return prev;
      const nextState = performAction(prev, action, amount);

      if (isTerminal(nextState.phase)) {
        setShowdownReveal(true);
        return nextState;
      }

      const nextPlayer = nextState.players[nextState.currentPlayerIndex];
      if (nextPlayer && !nextPlayer.isHuman && !nextPlayer.folded && !nextPlayer.sittingOut) {
        setTimeout(() => scheduleBotAction(nextState), 200);
      }

      return nextState;
    });
  }, [scheduleBotAction]);

  // Single effect: kick off bots when it's their turn and we're not already processing.
  // This handles the initial deal and phase transitions where control lands on a bot.
  useEffect(() => {
    if (!gameState || isProcessing) return;
    if (isTerminal(gameState.phase)) return;

    const current = gameState.players[gameState.currentPlayerIndex];
    if (current && !current.isHuman && !current.folded && !current.sittingOut) {
      scheduleBotAction(gameState);
    }
  }, [gameState, isProcessing, scheduleBotAction]);

  // Cleanup timers on unmount
  useEffect(() => clearBotTimer, []);

  const availableActions = gameState ? getAvailableActions(gameState) : [];
  const isPlayerTurn =
    gameState &&
    gameState.players[gameState.currentPlayerIndex]?.isHuman &&
    !isTerminal(gameState.phase);

  return {
    gameState,
    startGame,
    nextHand,
    handlePlayerAction,
    availableActions,
    isPlayerTurn,
    isProcessing,
    showdownReveal,
  };
}
