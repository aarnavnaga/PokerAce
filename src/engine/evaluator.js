const HAND_RANKS = {
  ROYAL_FLUSH: 10,
  STRAIGHT_FLUSH: 9,
  FOUR_OF_A_KIND: 8,
  FULL_HOUSE: 7,
  FLUSH: 6,
  STRAIGHT: 5,
  THREE_OF_A_KIND: 4,
  TWO_PAIR: 3,
  ONE_PAIR: 2,
  HIGH_CARD: 1,
};

const HAND_NAMES = {
  10: 'Royal Flush',
  9: 'Straight Flush',
  8: 'Four of a Kind',
  7: 'Full House',
  6: 'Flush',
  5: 'Straight',
  4: 'Three of a Kind',
  3: 'Two Pair',
  2: 'One Pair',
  1: 'High Card',
};

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluateFiveCards(cards) {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  let isStraight = false;
  let straightHigh = 0;

  if (values[0] - values[4] === 4 && new Set(values).size === 5) {
    isStraight = true;
    straightHigh = values[0];
  }
  // Ace-low straight (A-2-3-4-5)
  if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    isStraight = true;
    straightHigh = 5;
  }

  const counts = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  const countEntries = Object.entries(counts)
    .map(([v, c]) => ({ value: parseInt(v), count: c }))
    .sort((a, b) => b.count - a.count || b.value - a.value);

  if (isFlush && isStraight && straightHigh === 14) {
    return { rank: HAND_RANKS.ROYAL_FLUSH, kickers: [14], name: HAND_NAMES[10] };
  }
  if (isFlush && isStraight) {
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, kickers: [straightHigh], name: HAND_NAMES[9] };
  }
  if (countEntries[0].count === 4) {
    const quad = countEntries[0].value;
    const kicker = countEntries[1].value;
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, kickers: [quad, kicker], name: HAND_NAMES[8] };
  }
  if (countEntries[0].count === 3 && countEntries[1].count === 2) {
    return { rank: HAND_RANKS.FULL_HOUSE, kickers: [countEntries[0].value, countEntries[1].value], name: HAND_NAMES[7] };
  }
  if (isFlush) {
    return { rank: HAND_RANKS.FLUSH, kickers: values, name: HAND_NAMES[6] };
  }
  if (isStraight) {
    return { rank: HAND_RANKS.STRAIGHT, kickers: [straightHigh], name: HAND_NAMES[5] };
  }
  if (countEntries[0].count === 3) {
    const trips = countEntries[0].value;
    const kickers = countEntries.filter(e => e.count === 1).map(e => e.value);
    return { rank: HAND_RANKS.THREE_OF_A_KIND, kickers: [trips, ...kickers], name: HAND_NAMES[4] };
  }
  if (countEntries[0].count === 2 && countEntries[1].count === 2) {
    const pairs = [countEntries[0].value, countEntries[1].value].sort((a, b) => b - a);
    const kicker = countEntries[2].value;
    return { rank: HAND_RANKS.TWO_PAIR, kickers: [...pairs, kicker], name: HAND_NAMES[3] };
  }
  if (countEntries[0].count === 2) {
    const pair = countEntries[0].value;
    const kickers = countEntries.filter(e => e.count === 1).map(e => e.value);
    return { rank: HAND_RANKS.ONE_PAIR, kickers: [pair, ...kickers], name: HAND_NAMES[2] };
  }
  return { rank: HAND_RANKS.HIGH_CARD, kickers: values, name: HAND_NAMES[1] };
}

export function evaluateBestHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return evaluateFiveCards([...allCards, ...Array(5 - allCards.length).fill(null)].filter(Boolean).slice(0, 5));
  }

  const combos = getCombinations(allCards, 5);
  let best = null;

  for (const combo of combos) {
    const result = evaluateFiveCards(combo);
    if (!best || compareHands(result, best) > 0) {
      best = result;
    }
  }
  return best;
}

export function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
    if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
  }
  return 0;
}

export { HAND_RANKS, HAND_NAMES };
