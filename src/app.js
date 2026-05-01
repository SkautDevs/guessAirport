import { loadJSON, loadWeights } from './storage.js';
import { renderBorder, renderAirports } from './render.js';
import { enrichAirports } from './projection.js';
import { createGame } from './game.js';
import { cacheDOM, DOM, wireListeners, restoreCheckboxState, showCategoryCounts } from './ui.js';

async function init() {
  cacheDOM();

  let borderData, airportData;
  try {
    borderData = await loadJSON('data/border.json');
    airportData = await loadJSON('data/airports.json');
  } catch (err) {
    DOM['start-screen'].innerHTML =
      '<h1>Nepodařilo se načíst data</h1><p>Spusťte přes lokální HTTP server (např. python3 -m http.server)</p>';
    return;
  }

  enrichAirports(airportData);

  const { weights, seen } = loadWeights();
  const game = createGame(weights, seen);

  renderBorder(DOM['border-layer'], borderData);
  renderAirports(DOM['airport-layer'], airportData, false);

  restoreCheckboxState();
  showCategoryCounts(airportData);
  wireListeners(game, airportData);
}

init();
