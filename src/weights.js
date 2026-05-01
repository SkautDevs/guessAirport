export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getWeight(weights, seen, icao) {
  if (weights[icao]) return weights[icao];
  return seen.has(icao) ? 1 : 2;
}

export function updateWeight(weights, seen, icao, correct) {
  seen.add(icao);
  const current = weights[icao] || 1;
  if (correct) {
    const newW = Math.max(1, Math.round(current / 2));
    if (newW === 1) delete weights[icao];
    else weights[icao] = newW;
  } else {
    weights[icao] = current * 2;
  }
}

export function weightedPick(pool, count, weights, seen) {
  const items = pool.map(a => ({ airport: a, weight: getWeight(weights, seen, a.icao) }));
  const picked = [];
  for (let n = 0; n < count && items.length > 0; n++) {
    const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
    let r = Math.random() * totalWeight;
    let idx = 0;
    for (let i = 0; i < items.length; i++) {
      r -= items[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    picked.push(items[idx].airport);
    items.splice(idx, 1);
  }
  return picked;
}
