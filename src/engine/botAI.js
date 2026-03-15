import { ACTIONS, getAvailableActions, getCallAmount, getMinRaise } from './gameState';
import { evaluateBestHand, HAND_RANKS } from './evaluator';

const PERSONALITIES = {
  aggressive: { bluffFreq: 0.20, raiseFreq: 0.45, foldWeight: 0.7, tightness: 0.30 },
  conservative: { bluffFreq: 0.04, raiseFreq: 0.15, foldWeight: 1.4, tightness: 0.55 },
  balanced: { bluffFreq: 0.10, raiseFreq: 0.30, foldWeight: 1.0, tightness: 0.42 },
  loose: { bluffFreq: 0.15, raiseFreq: 0.35, foldWeight: 0.8, tightness: 0.25 },
};

const PERSONALITY_NAMES = Object.keys(PERSONALITIES);

export function assignPersonality() {
  return PERSONALITY_NAMES[Math.floor(Math.random() * PERSONALITY_NAMES.length)];
}

// ─── Preflop hand ranking ────────────────────────────────────────────
// Uses a lookup inspired by Sklansky-Chubukov style groupings.
// Returns 0.0 (trash) to 1.0 (premium).
function getPreflopStrength(holeCards) {
  const [c1, c2] = holeCards;
  const suited = c1.suit === c2.suit;
  const high = Math.max(c1.value, c2.value);
  const low = Math.min(c1.value, c2.value);
  const gap = high - low;
  const isPair = high === low;

  if (isPair) {
    if (high >= 13) return 0.95;          // AA, KK
    if (high >= 12) return 0.88;          // QQ
    if (high >= 11) return 0.82;          // JJ
    if (high >= 10) return 0.75;          // TT
    if (high >= 7) return 0.55 + (high - 7) * 0.05; // 77-99
    return 0.30 + (high - 2) * 0.04;     // 22-66
  }

  // Premium non-pairs
  if (high === 14 && low === 13) return suited ? 0.90 : 0.85; // AKs / AKo
  if (high === 14 && low === 12) return suited ? 0.82 : 0.76; // AQs / AQo
  if (high === 14 && low === 11) return suited ? 0.75 : 0.68; // AJs / AJo
  if (high === 13 && low === 12) return suited ? 0.74 : 0.67; // KQs / KQo

  // Suited connectors & suited aces
  if (high === 14 && suited) return 0.55 + low * 0.015;       // Axs
  if (high === 14) return 0.38 + low * 0.012;                 // Axo

  let strength = 0.15;
  strength += (high + low) / 56;                               // base value from card ranks
  if (suited) strength += 0.08;
  if (gap === 1) strength += 0.06;                             // connectors
  else if (gap === 2) strength += 0.03;                        // one-gapper
  else if (gap >= 4) strength -= 0.05;                         // big gap penalty

  if (high >= 12) strength += 0.06;
  if (high >= 10 && low >= 10) strength += 0.08;              // broadway

  return Math.min(Math.max(strength, 0.05), 0.90);
}

// ─── Post-flop hand strength ────────────────────────────────────────
// Evaluates the made hand, then adjusts for kicker quality, board texture, and draws.
function getPostflopStrength(holeCards, communityCards) {
  const hand = evaluateBestHand(holeCards, communityCards);

  // Base strength from hand rank (normalized more granularly)
  const rankStrengths = {
    [HAND_RANKS.HIGH_CARD]: 0.08,
    [HAND_RANKS.ONE_PAIR]: 0.28,
    [HAND_RANKS.TWO_PAIR]: 0.52,
    [HAND_RANKS.THREE_OF_A_KIND]: 0.65,
    [HAND_RANKS.STRAIGHT]: 0.75,
    [HAND_RANKS.FLUSH]: 0.82,
    [HAND_RANKS.FULL_HOUSE]: 0.90,
    [HAND_RANKS.FOUR_OF_A_KIND]: 0.96,
    [HAND_RANKS.STRAIGHT_FLUSH]: 0.98,
    [HAND_RANKS.ROYAL_FLUSH]: 1.0,
  };

  let strength = rankStrengths[hand.rank] || 0.08;

  const boardValues = communityCards.map(c => c.value);
  const boardSuits = communityCards.map(c => c.suit);
  const holeValues = holeCards.map(c => c.value);

  // ── Pair quality adjustments ──
  if (hand.rank === HAND_RANKS.ONE_PAIR) {
    const pairValue = hand.kickers[0];
    const boardMax = Math.max(...boardValues);

    // Over-pair (pocket pair above all board cards) is very strong
    if (holeValues[0] === holeValues[1] && holeValues[0] > boardMax) {
      strength += 0.20;
    }
    // Top pair with good kicker
    else if (pairValue === boardMax) {
      const kicker = Math.max(...holeValues.filter(v => v !== pairValue));
      if (kicker >= 12) strength += 0.12;
      else if (kicker >= 10) strength += 0.06;
      else strength += 0.02;
    }
    // Middle / bottom pair: weak
    else if (pairValue < boardMax) {
      strength -= 0.08;
    }
  }

  // ── Two pair / trips kicker quality ──
  if (hand.rank === HAND_RANKS.TWO_PAIR) {
    const topPair = hand.kickers[0];
    if (topPair >= 12) strength += 0.06;
  }

  if (hand.rank === HAND_RANKS.THREE_OF_A_KIND) {
    // Set (pair in hand + one on board) is much stronger than trips (pair on board)
    if (holeValues[0] === holeValues[1]) strength += 0.10;
  }

  // ── Board texture danger ──
  const suitCounts = {};
  boardSuits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
  const maxSuitOnBoard = Math.max(...Object.values(suitCounts));

  const sortedBoard = [...boardValues].sort((a, b) => a - b);
  let maxRunLength = 1;
  let run = 1;
  for (let i = 1; i < sortedBoard.length; i++) {
    if (sortedBoard[i] - sortedBoard[i - 1] <= 2) run++;
    else run = 1;
    maxRunLength = Math.max(maxRunLength, run);
  }

  // Scary board: flush or straight possible — devalue non-nut hands
  if (hand.rank <= HAND_RANKS.TWO_PAIR) {
    if (maxSuitOnBoard >= 3) strength -= 0.08;
    if (maxRunLength >= 3) strength -= 0.06;
  }

  // ── Draw equity (rough) ──
  if (hand.rank <= HAND_RANKS.ONE_PAIR && communityCards.length < 5) {
    const allCards = [...holeCards, ...communityCards];
    const allSuits = allCards.map(c => c.suit);
    const allSuitCounts = {};
    allSuits.forEach(s => { allSuitCounts[s] = (allSuitCounts[s] || 0) + 1; });

    // Flush draw (4 to a flush)
    if (Math.max(...Object.values(allSuitCounts)) === 4) {
      strength += communityCards.length === 3 ? 0.14 : 0.08;
    }

    // Open-ended straight draw
    const allVals = [...new Set(allCards.map(c => c.value))].sort((a, b) => a - b);
    for (let i = 0; i <= allVals.length - 4; i++) {
      if (allVals[i + 3] - allVals[i] === 3) {
        strength += communityCards.length === 3 ? 0.10 : 0.05;
        break;
      }
    }
  }

  return Math.min(Math.max(strength, 0.02), 1.0);
}

function getHandStrength(holeCards, communityCards) {
  if (communityCards.length === 0) {
    return getPreflopStrength(holeCards);
  }
  return getPostflopStrength(holeCards, communityCards);
}

// ─── Decision engine ────────────────────────────────────────────────
export function getBotAction(state, personality = 'balanced') {
  const actions = getAvailableActions(state);
  if (actions.length === 0) return { action: ACTIONS.CHECK, amount: 0 };

  const player = state.players[state.currentPlayerIndex];
  const traits = PERSONALITIES[personality] || PERSONALITIES.balanced;
  const strength = getHandStrength(player.holeCards, state.communityCards);
  const callAmount = getCallAmount(state);
  const potSize = state.pot;
  const potOdds = callAmount > 0 ? callAmount / (potSize + callAmount) : 0;
  const stackRatio = callAmount / Math.max(player.chips, 1);

  const rand = Math.random();
  const phase = state.communityCards.length;

  // ── Premium hand (strength > 0.75) → Value bet / raise ──
  if (strength > 0.75) {
    if (actions.includes(ACTIONS.RAISE)) {
      const minR = getMinRaise(state);
      // Bet sizing: 60-100% pot for value
      const sizingFactor = 0.6 + Math.random() * 0.4;
      const targetRaise = Math.max(
        minR,
        Math.floor(state.currentBet + potSize * sizingFactor)
      );
      const raiseAmt = Math.min(targetRaise, player.chips + player.currentBet);
      return { action: ACTIONS.RAISE, amount: raiseAmt };
    }
    if (actions.includes(ACTIONS.CALL)) return { action: ACTIONS.CALL, amount: 0 };
    return { action: ACTIONS.CHECK, amount: 0 };
  }

  // ── Good hand (0.50 – 0.75) → Raise sometimes, call usually ──
  if (strength > 0.50) {
    if (callAmount === 0) {
      // No bet to face — bet for value or check
      if (rand < traits.raiseFreq && actions.includes(ACTIONS.RAISE)) {
        const minR = getMinRaise(state);
        const targetRaise = Math.max(
          minR,
          Math.floor(state.currentBet + potSize * 0.5)
        );
        return {
          action: ACTIONS.RAISE,
          amount: Math.min(targetRaise, player.chips + player.currentBet),
        };
      }
      if (actions.includes(ACTIONS.CHECK)) return { action: ACTIONS.CHECK, amount: 0 };
    }

    // Facing a bet — call if price is right, sometimes raise
    if (rand < traits.raiseFreq * 0.4 && actions.includes(ACTIONS.RAISE)) {
      const minR = getMinRaise(state);
      return {
        action: ACTIONS.RAISE,
        amount: Math.min(minR, player.chips + player.currentBet),
      };
    }
    if (actions.includes(ACTIONS.CALL)) return { action: ACTIONS.CALL, amount: 0 };
    if (actions.includes(ACTIONS.CHECK)) return { action: ACTIONS.CHECK, amount: 0 };
    return { action: ACTIONS.FOLD, amount: 0 };
  }

  // ── Marginal hand (0.30 – 0.50) → Play cautiously ──
  if (strength > 0.30) {
    if (callAmount === 0) {
      // Bluff sometimes when checked to
      if (rand < traits.bluffFreq && actions.includes(ACTIONS.RAISE)) {
        const minR = getMinRaise(state);
        return { action: ACTIONS.RAISE, amount: minR };
      }
      if (actions.includes(ACTIONS.CHECK)) return { action: ACTIONS.CHECK, amount: 0 };
    }

    // Facing a bet with marginal hand: consider pot odds
    if (potOdds < strength && stackRatio < 0.15) {
      if (actions.includes(ACTIONS.CALL)) return { action: ACTIONS.CALL, amount: 0 };
    }

    // Fold more often on later streets with marginal hands
    const foldChance = traits.foldWeight * (0.4 + phase * 0.1);
    if (rand < foldChance) {
      return { action: ACTIONS.FOLD, amount: 0 };
    }

    if (actions.includes(ACTIONS.CHECK)) return { action: ACTIONS.CHECK, amount: 0 };
    if (potOdds < strength * 0.8 && actions.includes(ACTIONS.CALL)) {
      return { action: ACTIONS.CALL, amount: 0 };
    }
    return { action: ACTIONS.FOLD, amount: 0 };
  }

  // ── Weak hand (< 0.30) → Fold facing any bet, check if free ──
  if (callAmount === 0) {
    // Bluff very rarely
    if (rand < traits.bluffFreq * 0.3 && actions.includes(ACTIONS.RAISE)) {
      const minR = getMinRaise(state);
      return { action: ACTIONS.RAISE, amount: minR };
    }
    if (actions.includes(ACTIONS.CHECK)) return { action: ACTIONS.CHECK, amount: 0 };
  }

  // Facing a bet with garbage: fold almost always
  // Tiny call with amazing pot odds (e.g. min-bet into huge pot)
  if (potOdds < 0.08 && stackRatio < 0.05 && actions.includes(ACTIONS.CALL)) {
    return { action: ACTIONS.CALL, amount: 0 };
  }

  return { action: ACTIONS.FOLD, amount: 0 };
}
