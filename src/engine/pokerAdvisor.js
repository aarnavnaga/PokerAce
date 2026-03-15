import { evaluateBestHand, HAND_RANKS } from './evaluator';

// ═══════════════════════════════════════════════════════════════════════
// Starting Hand Chart — encoded from the Texas Hold'em Starting Hands
// chart (Pairs & Suited Cards).
//
// Tier 1 (Blue)   = Premium — always playable
// Tier 2 (Green)  = Playable to an extent
// Tier 3 (Yellow) = Playable until the first raise
// Tier 4 (Red)    = Unplayable (check/fold only)
//
// For offsuit non-pair hands, tiers shift one level worse.
// ═══════════════════════════════════════════════════════════════════════

const TIER = { PREMIUM: 1, PLAYABLE: 2, MARGINAL: 3, TRASH: 4 };

const TIER_NAMES = {
  [TIER.PREMIUM]: 'Premium',
  [TIER.PLAYABLE]: 'Playable',
  [TIER.MARGINAL]: 'Marginal',
  [TIER.TRASH]: 'Trash',
};

const TIER_COLORS = {
  [TIER.PREMIUM]: '#3b82f6',
  [TIER.PLAYABLE]: '#22c55e',
  [TIER.MARGINAL]: '#eab308',
  [TIER.TRASH]: '#ef4444',
};

// Suited hand tiers — key is "HiLo" where Hi >= Lo by rank value
// (e.g., "AK" means Ace-King suited)
const SUITED_TIERS = {
  // Connectors (gap 0)
  AK: 1, KQ: 1, QJ: 1, JT: 1, T9: 2, '98': 2, '87': 3, '76': 3, '65': 3, '54': 3, '43': 4, '32': 4,
  // One-gappers
  AQ: 1, KJ: 1, QT: 1, J9: 1, T8: 2, '97': 2, '86': 3, '75': 3, '64': 3, '53': 3, '42': 4,
  // Two-gappers
  AJ: 1, KT: 1, Q9: 2, J8: 2, T7: 2, '96': 3, '85': 3, '74': 3, '63': 3, '52': 4,
  // Three-gappers
  AT: 1, K9: 1, Q8: 2, J7: 2, T6: 2, '95': 3, '84': 3, '73': 3, '62': 4,
  // Four-gappers
  A9: 1, K8: 2, Q7: 2, J6: 2, T5: 2, '94': 3, '83': 3, '72': 4,
  // Five-gappers
  A8: 1, K7: 2, Q6: 2, J5: 2, T4: 2, '93': 3, '82': 4,
  // Six-gappers
  A7: 1, K6: 2, Q5: 2, J4: 2, T3: 2, '92': 3,
  // Seven-gappers
  A6: 1, K5: 2, Q4: 2, J3: 2, T2: 2,
  // Eight-gappers
  A5: 1, K4: 2, Q3: 2, J2: 2,
  // Nine-gappers
  A4: 1, K3: 2, Q2: 2,
  // Ten-gappers
  A3: 1, K2: 2,
  // Eleven-gappers
  A2: 1,
};

const RANK_CHAR = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T' };

function rankToChar(value) {
  return RANK_CHAR[value] || String(value);
}

function getStartingHandTier(holeCards) {
  const [c1, c2] = holeCards;
  const hi = Math.max(c1.value, c2.value);
  const lo = Math.min(c1.value, c2.value);
  const suited = c1.suit === c2.suit;
  const isPair = hi === lo;

  if (isPair) return TIER.PREMIUM; // All pairs are Tier 1 on the chart

  const key = rankToChar(hi) + rankToChar(lo);
  const suitedTier = SUITED_TIERS[key];

  if (suited) {
    return suitedTier || TIER.TRASH;
  }
  // Offsuit: shift one tier worse than suited equivalent
  if (suitedTier) {
    return Math.min(suitedTier + 1, TIER.TRASH);
  }
  return TIER.TRASH;
}

function getStartingHandName(holeCards) {
  const [c1, c2] = holeCards;
  const hi = Math.max(c1.value, c2.value);
  const lo = Math.min(c1.value, c2.value);
  const suited = c1.suit === c2.suit;
  const isPair = hi === lo;

  let name = rankToChar(hi) + rankToChar(lo);
  if (isPair) return name + ' (Pair)';
  return name + (suited ? 's' : 'o');
}

// ═══════════════════════════════════════════════════════════════════════
// Position analysis
// ═══════════════════════════════════════════════════════════════════════

function getPosition(playerIndex, dealerIndex, numPlayers) {
  const seatsFromDealer = (playerIndex - dealerIndex + numPlayers) % numPlayers;
  if (seatsFromDealer === 0) return 'dealer';
  if (seatsFromDealer === 1) return 'small_blind';
  if (seatsFromDealer === 2) return 'big_blind';
  if (seatsFromDealer <= Math.ceil(numPlayers / 3)) return 'early';
  if (seatsFromDealer <= Math.ceil((numPlayers * 2) / 3)) return 'middle';
  return 'late';
}

const POSITION_NAMES = {
  dealer: 'Dealer (Button)',
  small_blind: 'Small Blind',
  big_blind: 'Big Blind',
  early: 'Early Position',
  middle: 'Middle Position',
  late: 'Late Position',
};

// ═══════════════════════════════════════════════════════════════════════
// Outs calculation
// ═══════════════════════════════════════════════════════════════════════

function countOuts(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  const outs = [];
  let totalOuts = 0;

  const currentHand = evaluateBestHand(holeCards, communityCards);

  // Check for flush draw
  const flushOuts = countFlushOuts(allCards);
  if (flushOuts > 0) {
    outs.push({ type: 'Flush draw', count: flushOuts });
    totalOuts += flushOuts;
  }

  // Check for straight draws
  const straightInfo = countStraightOuts(allCards, communityCards);
  if (straightInfo.outs > 0 && currentHand.rank < HAND_RANKS.STRAIGHT) {
    outs.push({ type: straightInfo.type, count: straightInfo.outs });
    // Avoid double-counting cards that complete both flush and straight
    if (flushOuts > 0) {
      totalOuts += Math.max(0, straightInfo.outs - 2);
    } else {
      totalOuts += straightInfo.outs;
    }
  }

  // Overcards (only if we have less than a pair)
  if (currentHand.rank <= HAND_RANKS.HIGH_CARD) {
    const boardMax = communityCards.length > 0 ? Math.max(...communityCards.map(c => c.value)) : 0;
    const overcards = holeCards.filter(c => c.value > boardMax).length;
    if (overcards > 0) {
      outs.push({ type: `${overcards} overcard${overcards > 1 ? 's' : ''}`, count: overcards * 3 });
      totalOuts += overcards * 3;
    }
  }

  // Set seeking improvement to full house / quads
  if (currentHand.rank === HAND_RANKS.THREE_OF_A_KIND) {
    outs.push({ type: 'Full house / quads', count: 7 });
    totalOuts += 7;
  }

  // Two pair seeking full house
  if (currentHand.rank === HAND_RANKS.TWO_PAIR) {
    outs.push({ type: 'Full house', count: 4 });
    totalOuts += 4;
  }

  return { outs, totalOuts, currentHand };
}

function countFlushOuts(allCards) {
  const suitCounts = {};
  allCards.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
  for (const count of Object.values(suitCounts)) {
    if (count === 4) return 9;  // 13 - 4 = 9 remaining of that suit
    if (count === 3) return 10; // Backdoor flush draw (needs 2 cards)
  }
  return 0;
}

function countStraightOuts(allCards, communityCards) {
  const values = [...new Set(allCards.map(c => c.value))].sort((a, b) => a - b);
  // Add low-ace for wheel draws
  if (values.includes(14)) values.unshift(1);

  // Check for open-ended straight draw (4 consecutive)
  for (let i = 0; i <= values.length - 4; i++) {
    const segment = values.slice(i, i + 4);
    if (segment[3] - segment[0] === 3) {
      const lo = segment[0];
      const hi = segment[3];
      // Open-ended: can complete on either end
      const canCompleteLow = lo > 1; // can add card below (unless it's Ace-low)
      const canCompleteHigh = hi < 14; // can add card above
      if (canCompleteLow && canCompleteHigh) {
        return { type: 'Open-ended straight draw', outs: 8 };
      }
      return { type: 'Gutshot straight draw', outs: 4 };
    }
  }

  // Check for gutshot (4 out of 5 consecutive with one gap)
  for (let i = 0; i <= values.length - 4; i++) {
    const segment = values.slice(i, i + 4);
    if (segment[3] - segment[0] === 4) {
      // There's exactly one gap in a span of 5
      const gaps = [];
      for (let v = segment[0]; v <= segment[3]; v++) {
        if (!values.includes(v)) gaps.push(v);
      }
      if (gaps.length === 1) {
        return { type: 'Gutshot straight draw', outs: 4 };
      }
    }
  }

  return { type: '', outs: 0 };
}

// ═══════════════════════════════════════════════════════════════════════
// Pot odds & equity
// ═══════════════════════════════════════════════════════════════════════

function calculatePotOdds(callAmount, potSize) {
  if (callAmount <= 0) return 0;
  return callAmount / (potSize + callAmount);
}

function outsToEquity(outs, cardsTocome) {
  // Rule of 4 (flop, 2 cards to come) or Rule of 2 (turn, 1 card)
  if (cardsTocome === 2) return Math.min(outs * 4, 100);
  return Math.min(outs * 2, 100);
}

// ═══════════════════════════════════════════════════════════════════════
// Board texture analysis
// ═══════════════════════════════════════════════════════════════════════

function analyzeBoardTexture(communityCards) {
  if (communityCards.length === 0) return null;

  const values = communityCards.map(c => c.value);
  const suits = communityCards.map(c => c.suit);

  // Flush danger
  const suitCounts = {};
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
  const maxSuit = Math.max(...Object.values(suitCounts));
  const flushDanger = maxSuit >= 3 ? 'high' : maxSuit >= 2 ? 'moderate' : 'low';

  // Straight danger
  const sortedVals = [...new Set(values)].sort((a, b) => a - b);
  let maxRun = 1, run = 1;
  for (let i = 1; i < sortedVals.length; i++) {
    if (sortedVals[i] - sortedVals[i - 1] <= 2) { run++; maxRun = Math.max(maxRun, run); }
    else run = 1;
  }
  const straightDanger = maxRun >= 4 ? 'high' : maxRun >= 3 ? 'moderate' : 'low';

  // Pairing
  const valCounts = {};
  values.forEach(v => { valCounts[v] = (valCounts[v] || 0) + 1; });
  const paired = Object.values(valCounts).some(c => c >= 2);

  // High card presence
  const highCards = values.filter(v => v >= 11).length;
  const boardType = highCards >= 2 ? 'wet' : sortedVals[sortedVals.length - 1] - sortedVals[0] <= 4 ? 'connected' : 'dry';

  const warnings = [];
  if (maxSuit >= 3) warnings.push('Flush possible on board');
  if (maxSuit >= 4) warnings.push('Four to a flush on board — be cautious');
  if (maxRun >= 4) warnings.push('Straight very likely on board');
  if (paired) warnings.push('Paired board — full house possible');
  if (highCards >= 3) warnings.push('Very high board — top pair less valuable');

  return { flushDanger, straightDanger, paired, boardType, highCards, warnings };
}

// ═══════════════════════════════════════════════════════════════════════
// Main advisor — generates contextual advice
// ═══════════════════════════════════════════════════════════════════════

export function getAdvice(gameState) {
  if (!gameState) return null;

  const player = gameState.players[0]; // Human is always index 0
  if (!player || player.holeCards.length < 2) return null;
  if (player.folded || player.sittingOut) {
    return { summary: "You've folded this hand. Watch and learn from the bots!", lines: [], emoji: '👀' };
  }

  const { holeCards } = player;
  const { communityCards, phase, pot, currentBet, dealerIndex, players } = gameState;

  const handName = getStartingHandName(holeCards);
  const tier = getStartingHandTier(holeCards);
  const tierName = TIER_NAMES[tier];
  const tierColor = TIER_COLORS[tier];
  const position = getPosition(0, dealerIndex, players.filter(p => !p.sittingOut).length);
  const posName = POSITION_NAMES[position];
  const callAmount = Math.max(0, currentBet - player.currentBet);
  const potOdds = calculatePotOdds(callAmount, pot);
  const activePlayers = players.filter(p => !p.folded && !p.sittingOut).length;
  const facingRaise = currentBet > gameState.bigBlind && phase === 'preflop';

  const lines = [];
  let action = '';
  let confidence = '';
  let emoji = '🤔';

  if (phase === 'preflop') {
    // ── PREFLOP ADVICE ──
    lines.push(`Your hand: **${handName}** — rated **${tierName}**`);
    lines.push(`Position: **${posName}**`);

    if (tier === TIER.PREMIUM) {
      if (facingRaise) {
        action = 'Raise / Re-raise';
        confidence = 'Very high confidence';
        emoji = '🔥';
        lines.push(`This is a premium hand. ${facingRaise ? "Re-raise to build the pot and isolate." : "Open with a raise — 2.5-3x the big blind."}`);
        if (holeCards[0].value === holeCards[1].value && holeCards[0].value >= 12) {
          lines.push(`Pocket ${rankToChar(holeCards[0].value)}s are a monster. Consider 3-betting.`);
        }
      } else {
        action = 'Raise';
        confidence = 'Very high confidence';
        emoji = '🔥';
        lines.push('Open with a raise — 2.5-3x the big blind to build value.');
        if (position === 'late' || position === 'dealer') {
          lines.push('Great position too! You act last post-flop.');
        }
      }
    } else if (tier === TIER.PLAYABLE) {
      if (facingRaise) {
        action = 'Call';
        confidence = 'Moderate confidence';
        emoji = '🤔';
        lines.push('Decent suited hand. Calling a raise is reasonable — you have flush potential.');
        if (position === 'early') {
          lines.push('But be careful in early position — you might face a re-raise behind you.');
        }
      } else {
        action = position === 'late' || position === 'dealer' ? 'Raise' : 'Call / Limp';
        confidence = 'Moderate confidence';
        emoji = '👍';
        lines.push(`Playable hand with ${holeCards[0].suit === holeCards[1].suit ? 'flush potential' : 'some value'}.`);
        if (position === 'late' || position === 'dealer') {
          lines.push('In late position, a raise can steal the blinds.');
        }
      }
    } else if (tier === TIER.MARGINAL) {
      if (facingRaise) {
        action = 'Fold';
        confidence = 'High confidence';
        emoji = '🚫';
        lines.push('Marginal hand facing a raise — the chart says fold. Not worth the risk.');
        lines.push('Save your chips for a better spot.');
      } else {
        action = callAmount === 0 ? 'Check' : 'Fold';
        confidence = 'Moderate confidence';
        emoji = '⚠️';
        lines.push('Marginal hand. Only play if you can see the flop cheaply.');
        if (position === 'dealer' && activePlayers <= 3) {
          lines.push('On the button with few players, a small raise might work as a steal.');
          action = 'Raise (steal attempt)';
        }
      }
    } else {
      action = callAmount === 0 ? 'Check' : 'Fold';
      confidence = 'Very high confidence';
      emoji = '🗑️';
      lines.push('This hand is in the red zone — unplayable. Check if free, fold to any bet.');
      lines.push('Discipline is the key to winning poker. Wait for better cards.');
    }
  } else {
    // ── POST-FLOP ADVICE (Flop, Turn, River) ──
    const hand = evaluateBestHand(holeCards, communityCards);
    const { outs, totalOuts, currentHand } = countOuts(holeCards, communityCards);
    const cardsTocome = phase === 'flop' ? 2 : phase === 'turn' ? 1 : 0;
    const equity = outsToEquity(totalOuts, cardsTocome);
    const boardTexture = analyzeBoardTexture(communityCards);

    lines.push(`Your hand: **${hand.name}**`);

    // Hand-specific commentary
    if (hand.rank >= HAND_RANKS.STRAIGHT) {
      action = 'Raise for value';
      confidence = 'Very high confidence';
      emoji = '🔥';
      lines.push(`Very strong made hand! Bet/raise to build the pot.`);
      if (hand.rank >= HAND_RANKS.FULL_HOUSE) {
        lines.push('Monster hand — consider slow-playing to trap opponents.');
      }
      if (boardTexture && boardTexture.warnings.length > 0) {
        const relevant = boardTexture.warnings.filter(w =>
          (hand.rank === HAND_RANKS.STRAIGHT && w.includes('Flush')) ||
          (hand.rank === HAND_RANKS.FLUSH && w.includes('Paired'))
        );
        if (relevant.length > 0) {
          lines.push(`Watch out: ${relevant[0]}. A better hand could be out there.`);
        }
      }
    } else if (hand.rank === HAND_RANKS.THREE_OF_A_KIND) {
      action = 'Raise';
      confidence = 'High confidence';
      emoji = '💪';
      lines.push('Trips/Set is a strong hand. Bet for value — you can still improve to a full house.');
      const isSet = holeCards[0].value === holeCards[1].value;
      if (isSet) {
        lines.push('You have a **set** (pocket pair hit the board) — this is hidden strength!');
      }
    } else if (hand.rank === HAND_RANKS.TWO_PAIR) {
      action = callAmount === 0 ? 'Bet' : 'Call';
      confidence = 'Moderate-high confidence';
      emoji = '👍';
      lines.push('Two pair is solid but vulnerable to straights and flushes.');
      if (boardTexture?.flushDanger === 'high') {
        lines.push('⚠️ Flush draw is present — bet to deny cheap cards.');
        action = 'Bet / Raise';
      }
    } else if (hand.rank === HAND_RANKS.ONE_PAIR) {
      const pairValue = hand.kickers[0];
      const boardMax = Math.max(...communityCards.map(c => c.value));
      const isOverpair = holeCards[0].value === holeCards[1].value && holeCards[0].value > boardMax;
      const isTopPair = pairValue === boardMax && holeCards.some(c => c.value === pairValue);

      if (isOverpair) {
        action = 'Bet / Raise';
        confidence = 'High confidence';
        emoji = '💪';
        lines.push(`Over-pair (${rankToChar(pairValue)}s above the board) — strong! Bet for value and protection.`);
      } else if (isTopPair) {
        const kicker = Math.max(...holeCards.filter(c => c.value !== pairValue).map(c => c.value));
        if (kicker >= 11) {
          action = 'Bet';
          confidence = 'Moderate-high confidence';
          emoji = '👍';
          lines.push(`Top pair with a ${rankToChar(kicker)} kicker — good hand. Bet for value.`);
        } else {
          action = callAmount > 0 ? 'Call (cautiously)' : 'Bet small';
          confidence = 'Moderate confidence';
          emoji = '🤔';
          lines.push(`Top pair but weak kicker. Bet small or check to control the pot.`);
        }
      } else {
        // Middle or bottom pair
        action = callAmount === 0 ? 'Check' : (potOdds < 0.2 ? 'Call' : 'Fold');
        confidence = 'Low-moderate confidence';
        emoji = '⚠️';
        lines.push('Middle/bottom pair is a weak holding. Don\'t invest heavily.');
        if (callAmount > 0 && potOdds >= 0.2) {
          lines.push(`The bet is too large relative to the pot. Consider folding.`);
        }
      }
    } else {
      // High card only — need draws to continue
      if (totalOuts > 0 && cardsTocome > 0) {
        const equityPct = equity.toFixed(0);
        const potOddsPct = (potOdds * 100).toFixed(0);
        lines.push(`No made hand yet, but you have **${totalOuts} outs** (~${equityPct}% to improve).`);
        outs.forEach(o => lines.push(`  • ${o.type}: ${o.count} outs`));

        if (callAmount > 0) {
          lines.push(`Pot odds: you need ${potOddsPct}% equity to call. You have ~${equityPct}%.`);
          if (equity > potOdds * 100) {
            action = 'Call';
            confidence = 'Math says call';
            emoji = '🧮';
            lines.push('The pot odds justify calling — your draw is profitable long-term.');
          } else {
            action = 'Fold';
            confidence = 'Math says fold';
            emoji = '📉';
            lines.push('The price is too high for your draw. Fold unless you expect more money going in later (implied odds).');
          }
        } else {
          action = 'Check';
          confidence = 'Moderate confidence';
          emoji = '🤔';
          lines.push('Check to see the next card for free. Your draw could hit!');
          if (totalOuts >= 12) {
            lines.push('With this many outs, a semi-bluff raise could also work.');
            action = 'Check or Semi-bluff raise';
          }
        }
      } else if (cardsTocome === 0) {
        action = callAmount === 0 ? 'Check' : 'Fold';
        confidence = 'High confidence';
        emoji = '🚫';
        lines.push('River with no made hand and nothing to draw to. Give it up.');
      } else {
        action = callAmount === 0 ? 'Check' : 'Fold';
        confidence = 'High confidence';
        emoji = '🗑️';
        lines.push('No made hand, no significant draws. Don\'t throw chips away.');
      }
    }

    // Board texture warnings
    if (boardTexture && boardTexture.warnings.length > 0 && hand.rank <= HAND_RANKS.TWO_PAIR) {
      lines.push('');
      lines.push('**Board texture warnings:**');
      boardTexture.warnings.forEach(w => lines.push(`  ⚠️ ${w}`));
    }

    // Pot odds summary if facing a bet
    if (callAmount > 0) {
      const potOddsPct = (potOdds * 100).toFixed(1);
      lines.push('');
      lines.push(`💰 Pot: $${pot} | Call: $${callAmount} | Pot odds: ${potOddsPct}%`);
    }
  }

  return {
    summary: `${action}`,
    confidence,
    lines,
    emoji,
    tierName: phase === 'preflop' ? tierName : undefined,
    tierColor: phase === 'preflop' ? tierColor : undefined,
    handName: phase === 'preflop' ? handName : undefined,
  };
}
