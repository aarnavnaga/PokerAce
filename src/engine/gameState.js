import { createDeck, shuffleDeck } from './deck';
import { evaluateBestHand, compareHands } from './evaluator';

export const PHASES = {
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  GAME_OVER: 'game_over',
};

export const ACTIONS = {
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  RAISE: 'raise',
  ALL_IN: 'all_in',
};

const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

export function createPlayer(id, name, isHuman = false) {
  return {
    id,
    name,
    chips: STARTING_CHIPS,
    holeCards: [],
    currentBet: 0,
    totalBetThisRound: 0,
    folded: false,
    allIn: false,
    isHuman,
    lastAction: null,
    sittingOut: false,
    hasActedThisPhase: false,
  };
}

export function createInitialState(players) {
  return {
    players,
    deck: [],
    communityCards: [],
    pot: 0,
    sidePots: [],
    phase: PHASES.PREFLOP,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    currentBet: 0,
    minRaise: BIG_BLIND,
    roundNumber: 0,
    winners: null,
    wonByFold: false,
    message: '',
    lastRaiserIndex: -1,
  };
}

export function startNewHand(state) {
  const activePlayers = state.players.filter(p => p.chips > 0);
  if (activePlayers.length < 2) {
    return {
      ...state,
      phase: PHASES.GAME_OVER,
      message: `${activePlayers[0]?.name || 'Unknown'} wins the game!`,
    };
  }

  let deck = shuffleDeck(createDeck());

  if (deck.length !== 52 || new Set(deck.map(c => c.id)).size !== 52) {
    throw new Error('Deck integrity check failed');
  }

  const players = state.players.map(p => ({
    ...p,
    holeCards: [],
    currentBet: 0,
    totalBetThisRound: 0,
    folded: p.chips <= 0,
    allIn: false,
    lastAction: null,
    sittingOut: p.chips <= 0,
    hasActedThisPhase: false,
    evaluatedHand: null,
  }));

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < players.length; j++) {
      if (!players[j].sittingOut) {
        players[j].holeCards.push(deck.pop());
      }
    }
  }

  let dealerIndex = state.dealerIndex;
  do {
    dealerIndex = (dealerIndex + 1) % players.length;
  } while (players[dealerIndex].sittingOut);

  const sbIndex = getNextActiveIndex(players, dealerIndex);
  const bbIndex = getNextActiveIndex(players, sbIndex);

  const sbAmount = Math.min(SMALL_BLIND, players[sbIndex].chips);
  players[sbIndex].chips -= sbAmount;
  players[sbIndex].currentBet = sbAmount;
  players[sbIndex].totalBetThisRound = sbAmount;
  if (players[sbIndex].chips === 0) players[sbIndex].allIn = true;

  const bbAmount = Math.min(BIG_BLIND, players[bbIndex].chips);
  players[bbIndex].chips -= bbAmount;
  players[bbIndex].currentBet = bbAmount;
  players[bbIndex].totalBetThisRound = bbAmount;
  if (players[bbIndex].chips === 0) players[bbIndex].allIn = true;

  const pot = sbAmount + bbAmount;
  const firstToAct = getNextActiveIndex(players, bbIndex);

  return {
    ...state,
    players,
    deck,
    communityCards: [],
    pot,
    sidePots: [],
    phase: PHASES.PREFLOP,
    dealerIndex,
    currentPlayerIndex: firstToAct,
    currentBet: BIG_BLIND,
    minRaise: BIG_BLIND,
    roundNumber: state.roundNumber + 1,
    winners: null,
    wonByFold: false,
    message: `Round ${state.roundNumber + 1} — ${players[dealerIndex].name} is the dealer`,
    lastRaiserIndex: bbIndex,
  };
}

function getNextActiveIndex(players, fromIndex) {
  let idx = (fromIndex + 1) % players.length;
  let safety = 0;
  while (players[idx].folded || players[idx].sittingOut || players[idx].allIn) {
    idx = (idx + 1) % players.length;
    safety++;
    if (safety > players.length) return -1;
  }
  return idx;
}

function countActivePlayers(players) {
  return players.filter(p => !p.folded && !p.sittingOut).length;
}

function countPlayersWhoCanAct(players) {
  return players.filter(p => !p.folded && !p.sittingOut && !p.allIn).length;
}

export function getAvailableActions(state) {
  const player = state.players[state.currentPlayerIndex];
  if (!player || player.folded || player.sittingOut || player.allIn) return [];

  const actions = [ACTIONS.FOLD];
  const callAmount = state.currentBet - player.currentBet;

  if (callAmount <= 0) {
    actions.push(ACTIONS.CHECK);
  } else {
    if (callAmount >= player.chips) {
      actions.push(ACTIONS.ALL_IN);
    } else {
      actions.push(ACTIONS.CALL);
    }
  }

  if (player.chips > callAmount) {
    actions.push(ACTIONS.RAISE);
  }

  if (player.chips > 0 && !actions.includes(ACTIONS.ALL_IN)) {
    actions.push(ACTIONS.ALL_IN);
  }

  return actions;
}

export function getCallAmount(state) {
  const player = state.players[state.currentPlayerIndex];
  return Math.min(state.currentBet - player.currentBet, player.chips);
}

export function getMinRaise(state) {
  const player = state.players[state.currentPlayerIndex];
  const callAmount = state.currentBet - player.currentBet;
  return Math.min(callAmount + state.minRaise, player.chips);
}

export function performAction(state, action, raiseAmount = 0) {
  let newState = {
    ...state,
    players: state.players.map(p => ({ ...p })),
  };
  const player = newState.players[newState.currentPlayerIndex];

  switch (action) {
    case ACTIONS.FOLD:
      player.folded = true;
      player.lastAction = 'Fold';
      break;

    case ACTIONS.CHECK:
      player.lastAction = 'Check';
      break;

    case ACTIONS.CALL: {
      const callAmount = Math.min(
        newState.currentBet - player.currentBet,
        player.chips
      );
      player.chips -= callAmount;
      player.currentBet += callAmount;
      player.totalBetThisRound += callAmount;
      newState.pot += callAmount;
      if (player.chips === 0) player.allIn = true;
      player.lastAction = `Call $${callAmount}`;
      break;
    }

    case ACTIONS.RAISE: {
      const totalBet = raiseAmount;
      const additional = totalBet - player.currentBet;
      if (additional > player.chips) {
        newState.pot += player.chips;
        player.totalBetThisRound += player.chips;
        player.currentBet += player.chips;
        player.chips = 0;
        player.allIn = true;
        player.lastAction = `All-In $${player.currentBet}`;
      } else {
        player.chips -= additional;
        newState.pot += additional;
        player.totalBetThisRound += additional;
        player.currentBet = totalBet;
        player.lastAction = `Raise to $${totalBet}`;
      }
      newState.minRaise = Math.max(
        newState.minRaise,
        player.currentBet - newState.currentBet
      );
      newState.currentBet = player.currentBet;
      newState.lastRaiserIndex = newState.currentPlayerIndex;
      // Everyone else needs to act again after a raise
      newState.players.forEach((p, i) => {
        if (i !== newState.currentPlayerIndex) {
          p.hasActedThisPhase = false;
        }
      });
      break;
    }

    case ACTIONS.ALL_IN: {
      const allInAmount = player.chips;
      player.totalBetThisRound += allInAmount;
      player.currentBet += allInAmount;
      newState.pot += allInAmount;
      player.chips = 0;
      player.allIn = true;
      if (player.currentBet > newState.currentBet) {
        newState.minRaise = Math.max(
          newState.minRaise,
          player.currentBet - newState.currentBet
        );
        newState.currentBet = player.currentBet;
        newState.lastRaiserIndex = newState.currentPlayerIndex;
        newState.players.forEach((p, i) => {
          if (i !== newState.currentPlayerIndex) {
            p.hasActedThisPhase = false;
          }
        });
      }
      player.lastAction = `All-In $${player.currentBet}`;
      break;
    }
  }

  player.hasActedThisPhase = true;

  // Single remaining player wins immediately
  if (countActivePlayers(newState.players) === 1) {
    const winner = newState.players.find(p => !p.folded && !p.sittingOut);
    winner.chips += newState.pot;
    return {
      ...newState,
      pot: 0,
      phase: PHASES.SHOWDOWN,
      wonByFold: true,
      winners: [{ player: winner, amount: newState.pot, hand: null }],
      message: `${winner.name} wins $${newState.pot}!`,
    };
  }

  if (isBettingRoundComplete(newState)) {
    return advancePhase(newState);
  }

  const nextIdx = getNextActiveIndex(
    newState.players,
    newState.currentPlayerIndex
  );
  if (nextIdx === -1) {
    return advancePhase(newState);
  }
  newState.currentPlayerIndex = nextIdx;
  return newState;
}

function isBettingRoundComplete(state) {
  const canAct = state.players.filter(
    p => !p.folded && !p.sittingOut && !p.allIn
  );

  if (canAct.length === 0) return true;

  const allMatched = canAct.every(p => p.currentBet === state.currentBet);
  const allActed = canAct.every(p => p.hasActedThisPhase);

  return allMatched && allActed;
}

function advancePhase(state) {
  let newState = {
    ...state,
    players: state.players.map(p => ({
      ...p,
      currentBet: 0,
      hasActedThisPhase: false,
    })),
    currentBet: 0,
    minRaise: BIG_BLIND,
    lastRaiserIndex: -1,
  };

  const deck = [...newState.deck];
  let communityCards = [...newState.communityCards];

  switch (state.phase) {
    case PHASES.PREFLOP:
      deck.pop();
      communityCards.push(deck.pop(), deck.pop(), deck.pop());
      newState.phase = PHASES.FLOP;
      newState.message = 'The Flop';
      break;
    case PHASES.FLOP:
      deck.pop();
      communityCards.push(deck.pop());
      newState.phase = PHASES.TURN;
      newState.message = 'The Turn';
      break;
    case PHASES.TURN:
      deck.pop();
      communityCards.push(deck.pop());
      newState.phase = PHASES.RIVER;
      newState.message = 'The River';
      break;
    case PHASES.RIVER:
      return resolveShowdown(newState);
  }

  newState.deck = deck;
  newState.communityCards = communityCards;

  if (countPlayersWhoCanAct(newState.players) <= 1) {
    if (newState.phase === PHASES.RIVER) return resolveShowdown(newState);
    return advancePhase(newState);
  }

  const firstToAct = getNextActiveIndex(
    newState.players,
    newState.dealerIndex
  );
  if (firstToAct === -1) {
    return advancePhase(newState);
  }
  newState.currentPlayerIndex = firstToAct;
  return newState;
}

function resolveShowdown(state) {
  const activePlayers = state.players.filter(p => !p.folded && !p.sittingOut);
  const communityCards = state.communityCards;

  const handMap = {};
  for (const p of activePlayers) {
    handMap[p.id] = evaluateBestHand(p.holeCards, communityCards);
  }

  const evaluated = activePlayers.map(p => ({
    player: p,
    hand: handMap[p.id],
  }));

  evaluated.sort((a, b) => compareHands(b.hand, a.hand));

  const bestHand = evaluated[0].hand;
  const winners = evaluated.filter(
    e => compareHands(e.hand, bestHand) === 0
  );
  const share = Math.floor(state.pot / winners.length);

  const winnerIds = new Set(winners.map(w => w.player.id));
  const newPlayers = state.players.map(p => ({
    ...p,
    chips: winnerIds.has(p.id) ? p.chips + share : p.chips,
    evaluatedHand: handMap[p.id] || null,
  }));

  const winnerNames = winners.map(w => w.player.name).join(' & ');
  const handName = bestHand.name;

  return {
    ...state,
    players: newPlayers,
    pot: 0,
    phase: PHASES.SHOWDOWN,
    wonByFold: false,
    winners: winners.map(w => ({
      player: w.player,
      amount: share,
      hand: w.hand,
    })),
    message: `${winnerNames} wins $${state.pot} with ${handName}!`,
  };
}

export { STARTING_CHIPS, SMALL_BLIND, BIG_BLIND };
