import { weightedPick, shuffleArray, updateWeight } from './weights.js';
import { saveWeights } from './storage.js';

export const ROUNDS_PER_GAME = 10;

export function createGame(weights, seen) {
  return {
    state: 'start',
    currentRound: 0,
    currentPool: [],
    roundAirports: [],
    browseMode: false,
    hardMode: false,
    infinityMode: false,
    results: [],
    weights,
    seen,
  };
}

export function startGame(game, pool, options) {
  game.browseMode = options.browseMode;
  game.hardMode = options.hardMode;
  game.infinityMode = options.infinityMode;
  game.currentPool = pool;
  const roundCount = options.infinityMode ? pool.length : Math.min(ROUNDS_PER_GAME, pool.length);
  game.roundAirports = options.infinityMode ? shuffleArray(pool) : weightedPick(pool, roundCount, game.weights, game.seen);
  game.currentRound = 0;
  game.results = [];
  game.state = 'playing';
}

export function recordGuess(game, targetAirport, clickedAirport) {
  const correct = clickedAirport.icao === targetAirport.icao;
  game.results.push({ airport: targetAirport, correct });
  updateWeight(game.weights, game.seen, targetAirport.icao, correct);
  saveWeights(game.weights, game.seen);
  game.state = 'feedback';
  return correct;
}

export function advanceRound(game) {
  game.currentRound++;
  if (game.currentRound >= game.roundAirports.length) {
    game.state = 'summary';
  } else {
    game.state = 'playing';
  }
}

export function startPracticeMissed(game) {
  const missed = game.results.filter(r => !r.correct).map(r => r.airport);
  game.roundAirports = shuffleArray(missed);
  game.currentRound = 0;
  game.results = [];
  game.state = 'playing';
}
