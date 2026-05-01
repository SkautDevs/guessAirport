import { weightedPick, shuffleArray, updateWeight } from './weights.js';
import { saveWeights } from './storage.js';

const ROUNDS_PER_GAME = 10;

export class Game {
  constructor(weights, seen) {
    this.state = 'start';
    this.currentRound = 0;
    this.currentPool = [];
    this.roundAirports = [];
    this.browseMode = false;
    this.hardMode = false;
    this.infinityMode = false;
    this.results = [];
    this.weights = weights;
    this.seen = seen;
  }

  start(pool, options) {
    this.browseMode = options.browseMode;
    this.hardMode = options.hardMode;
    this.infinityMode = options.infinityMode;
    this.currentPool = pool;
    const roundCount = options.infinityMode ? pool.length : Math.min(ROUNDS_PER_GAME, pool.length);
    this.roundAirports = options.infinityMode
      ? shuffleArray(pool)
      : weightedPick(pool, roundCount, this.weights, this.seen);
    this.currentRound = 0;
    this.results = [];
    this.state = 'playing';
  }

  recordGuess(targetAirport, clickedAirport) {
    if (this.state !== 'playing') return null;
    const correct = clickedAirport.icao === targetAirport.icao;
    this.results.push({ airport: targetAirport, correct });
    updateWeight(this.weights, this.seen, targetAirport.icao, correct);
    saveWeights(this.weights, this.seen);
    this.state = 'feedback';
    return correct;
  }

  advance() {
    if (this.state !== 'feedback') return;
    this.currentRound++;
    this.state = this.currentRound >= this.roundAirports.length ? 'summary' : 'playing';
  }

  startPracticeMissed() {
    const missed = this.results.filter(r => !r.correct).map(r => r.airport);
    this.roundAirports = shuffleArray(missed);
    this.currentRound = 0;
    this.results = [];
    this.state = 'playing';
  }

  resetProgress() {
    this.weights = {};
    this.seen = new Set();
  }

  get currentTarget() {
    return this.roundAirports[this.currentRound];
  }

  get correctCount() {
    return this.results.filter(r => r.correct).length;
  }
}
