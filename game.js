const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const menuScreen = document.getElementById('menuScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startForm = document.getElementById('startForm');
const nicknameInput = document.getElementById('nickname');
const respawnButton = document.getElementById('respawnButton');
const leaderboardList = document.getElementById('leaderboardList');
const massValue = document.getElementById('massValue');
const scoreMass = document.getElementById('scoreMass');
const eatenValue = document.getElementById('eatenValue');
const massProgress = document.getElementById('massProgress');
const statusText = document.getElementById('statusText');
const finalMass = document.getElementById('finalMass');
const gameOverTitle = document.getElementById('gameOverTitle');
const skinSelect = document.getElementById('skin');
const themeSelect = document.getElementById('theme');
const splitButton = document.getElementById('splitButton');
const modeSelect = document.getElementById('mode');
const menuSpectateButton = document.getElementById('menuSpectateButton');
const deathSpectateButton = document.getElementById('deathSpectateButton');
const spectatorBar = document.getElementById('spectatorBar');
const nextFocusButton = document.getElementById('nextFocusButton');
const achievementToast = document.getElementById('achievementToast');

const WORLD = { width: 5200, height: 3600 };
const FOOD_TARGET = 420;
const BOT_TARGET = 8;
const MAX_CELLS = 80;
const VIRUS_TARGET = 18;
const GRID_SIZE = 100;
const DECAY_THRESHOLD = 60;
const DECAY_RATE = .018;
const BOT_NAMES = ['Nova', 'Miso', 'Orbit', 'Kite', 'Pixel', 'Zest', 'Comet', 'Echo', 'Mochi', 'Vanta', 'Sprout', 'Rook'];
const food = [];
const cells = [];
const ejectedMass = [];
const viruses = [];
const mothercells = [];
const powerups = [];
const particles = [];
const floatingText = [];
const bots = [];
const TEAMS = [{ name: 'Red', color: '#ff6961' }, { name: 'Green', color: '#77dd77' }, { name: 'Blue', color: '#70a7ff' }];
const player = { id: 'player', name: 'James', color: `hsl(${Math.floor(Math.random() * 360)} 82% 62%)`, skin: 'neon', eaten: 0, splitCooldown: 0, splitKills: 0 };
const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };
const camera = { x: WORLD.width / 2, y: WORLD.height / 2, zoom: 1 };
let gameState = 'menu';
let gameMode = 'ffa';
let spectatorFocus = null;
let spectatorFree = false;
let spectatorDrag = false;
let selectedCell = null;
let previousPointer = { x: 0, y: 0 };
const match = { startedAt: 0, peakMass: 12, kills: 0, food: 0, viruses: 0 };
const achievements = new Set();
let audioContext = null;
const audio = { enabled: true };

function resize() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * ratio); canvas.height = Math.floor(innerHeight * ratio);
  canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`; context.setTransform(ratio, 0, 0, ratio, 0, 0);
}
function lerp(current, target, amount) { return current + (target - current) * amount; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function radiusForMass(mass) { return 24 + Math.sqrt(Math.max(0, mass - 12)) * 4.8; }
function distanceBetween(first, second) { return Math.hypot(first.x - second.x, first.y - second.y); }
function randomColor() { return `hsl(${Math.floor(Math.random() * 360)} 82% 62%)`; }
function randomSkin() { return ['neon', 'planet', 'geometry'][Math.floor(Math.random() * 3)]; }
function randomFood() { return { x: 35 + Math.random() * (WORLD.width - 70), y: 35 + Math.random() * (WORLD.height - 70), radius: 5 + Math.random() * 4, color: `hsl(${Math.floor(Math.random() * 360)} 90% 67%)` }; }
function spawnPoint(margin = 180) { return { x: margin + Math.random() * (WORLD.width - margin * 2), y: margin + Math.random() * (WORLD.height - margin * 2) }; }
function startAudio() { if (!audio.enabled) return; const AudioEngine = window.AudioContext || window.webkitAudioContext; if (!AudioEngine) return; if (!audioContext) audioContext = new AudioEngine(); if (audioContext.state === 'suspended') audioContext.resume(); }
function playSound(type, intensity = 1) {
  if (!audioContext || !audio.enabled) return;
  const settings = { eat: [220, .06, 'sine'], eject: [310, .1, 'triangle'], split: [170, .18, 'sawtooth'], pop: [90, .28, 'square'], death: [55, .5, 'sawtooth'] }[type];
  if (!settings) return;
  const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); const start = audioContext.currentTime; const [frequency, duration, wave] = settings;
  oscillator.type = wave; oscillator.frequency.setValueAtTime(frequency * (0.85 + Math.random() * .3), start); oscillator.frequency.exponentialRampToValueAtTime(frequency * (type === 'death' ? .35 : 1.8), start + duration); gain.gain.setValueAtTime(.045 * intensity, start); gain.gain.exponentialRampToValueAtTime(.001, start + duration); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + duration);
}
function emitBurst(x, y, color, count = 14, force = 120) { for (let index = 0; index < count; index += 1) { const angle = Math.random() * Math.PI * 2; const speed = force * (.45 + Math.random()); particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .45 + Math.random() * .45, maxLife: 1, size: 2 + Math.random() * 4, color }); } }
function addFloatingText(x, y, text, color = '#a8f36d') { floatingText.push({ x, y, text, color, life: 1.1, maxLife: 1.1 }); }
function updateEffects(delta) { for (let index = particles.length - 1; index >= 0; index -= 1) { const particle = particles[index]; particle.life -= delta; particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.vx *= Math.pow(.02, delta); particle.vy *= Math.pow(.02, delta); if (particle.life <= 0) particles.splice(index, 1); } for (let index = floatingText.length - 1; index >= 0; index -= 1) { const item = floatingText[index]; item.life -= delta; item.y -= 28 * delta; if (item.life <= 0) floatingText.splice(index, 1); } }

for (let index = 0; index < FOOD_TARGET; index += 1) food.push(randomFood());
for (let index = 0; index < VIRUS_TARGET; index += 1) { const spawn = spawnPoint(260); viruses.push({ x: spawn.x, y: spawn.y, radius: 44, storedMass: 0, rotation: Math.random() * 6 }); }
function randomPowerup() { const spawn = spawnPoint(120); const types = ['speed', 'magnet', 'merge']; return { x: spawn.x, y: spawn.y, radius: 13, type: types[Math.floor(Math.random() * types.length)], pulse: Math.random() * 6 }; }
for (let index = 0; index < 12; index += 1) powerups.push(randomPowerup());
function createMothercell() { const spawn = spawnPoint(300); mothercells.push({ x: spawn.x, y: spawn.y, radius: 62, timer: Math.random() * 2, pulse: Math.random() * 6 }); }

function createCell(owner, x, y, mass, options = {}) {
  const radius = radiusForMass(mass);
  const cell = { owner, name: options.name || owner.name, color: options.color || owner.color, skin: options.skin || owner.skin || 'neon', aiControlled: options.aiControlled || false, x, y, visualX: x, visualY: y, radius, visualRadius: radius, mass, targetMass: mass, vx: 0, vy: 0, impulseX: 0, impulseY: 0, state: 'forage', target: null, stateTime: 0, mergeReadyAt: options.mergeReadyAt || 0, decayNotice: 0, actionCooldown: 0, speedBoost: 0, magnet: 0, instantMerge: false };
  cells.push(cell);
  return cell;
}
function ownedCells(owner) { return cells.filter((cell) => cell.owner === owner); }
function centroid(owner) {
  const pieces = ownedCells(owner);
  if (!pieces.length) return { x: WORLD.width / 2, y: WORLD.height / 2 };
  return pieces.reduce((center, cell) => ({ x: center.x + cell.visualX / pieces.length, y: center.y + cell.visualY / pieces.length }), { x: 0, y: 0 });
}
function resetPlayer() { createCell(player, WORLD.width / 2, WORLD.height / 2, 12); player.eaten = 0; player.splitCooldown = 0; }
function setupBots() {
  bots.length = 0;
  for (let index = 0; index < BOT_TARGET; index += 1) { const team = TEAMS[index % 3]; const owner = { id: `bot-${index}`, name: BOT_NAMES[index % BOT_NAMES.length], color: gameMode === 'teams' ? team.color : randomColor(), skin: randomSkin(), tactic: Math.random(), team: gameMode === 'teams' ? team.name : null }; bots.push(owner); const spawn = spawnPoint(); createCell(owner, spawn.x, spawn.y, 15 + Math.random() * 28); }
}
function startGame() {
  player.name = nicknameInput.value.trim().slice(0, 14) || 'James'; player.color = randomColor(); player.skin = skinSelect.value; player.splitKills = 0; gameMode = modeSelect.value; player.team = gameMode === 'teams' ? TEAMS[0].name : null; if (gameMode === 'teams') player.color = TEAMS[0].color; document.body.dataset.theme = themeSelect.value; cells.length = 0; ejectedMass.length = 0; particles.length = 0; floatingText.length = 0; mothercells.length = 0; selectedCell = null; match.startedAt = performance.now(); match.peakMass = 12; match.kills = 0; match.food = 0; match.viruses = 0; achievements.clear(); spectatorFocus = null; spectatorFree = false; resetPlayer(); setupBots(); if (gameMode === 'experimental') for (let index = 0; index < 8; index += 1) createMothercell(); gameState = 'playing'; spectatorBar.hidden = true; menuScreen.hidden = true; gameOverScreen.hidden = true; startAudio();
}
function startSpectator() { gameMode = 'ffa'; cells.length = 0; ejectedMass.length = 0; setupBots(); spectatorFocus = bots[0]; spectatorFree = false; gameState = 'spectator'; menuScreen.hidden = true; gameOverScreen.hidden = true; spectatorBar.hidden = false; }
function unlockAchievement(id, title) { if (achievements.has(id)) return; achievements.add(id); achievementToast.textContent = `Achievement unlocked: ${title}`; achievementToast.hidden = false; setTimeout(() => { achievementToast.hidden = true; }, 2600); }
function applyPowerup(cell, orb) { if (orb.type === 'speed') cell.speedBoost = 7; if (orb.type === 'magnet') cell.magnet = 8; if (orb.type === 'merge') { cell.instantMerge = true; for (const sibling of ownedCells(cell.owner)) sibling.mergeReadyAt = 0; } emitBurst(orb.x, orb.y, '#ffdc70', 16, 180); addFloatingText(cell.x, cell.y, orb.type === 'speed' ? 'SPEED SURGE' : orb.type === 'magnet' ? 'MASS MAGNET' : 'INSTANT MERGE', '#ffdc70'); playSound('eat', .8); }
function updateMothercells(delta) { if (gameMode !== 'experimental') return; for (const mother of mothercells) { mother.timer -= delta; mother.pulse += delta * 2; if (mother.timer <= 0) { mother.timer = 1.4; const angle = Math.random() * Math.PI * 2; food.push({ x: clamp(mother.x + Math.cos(angle) * (mother.radius + 18), 20, WORLD.width - 20), y: clamp(mother.y + Math.sin(angle) * (mother.radius + 18), 20, WORLD.height - 20), radius: 6, color: '#ff9be8' }); } for (const cell of cells.slice()) if (cell.radius < mother.radius && distanceBetween(cell, mother) < mother.radius * 1.2) { emitBurst(cell.x, cell.y, '#ff75d4', 18, 200); addFloatingText(cell.x, cell.y, 'MOTHERCELL', '#ff75d4'); removeCell(cell); if (cell.owner === player) endGame('loss'); } } }
function updatePowerups(cell, delta) { cell.speedBoost = Math.max(0, cell.speedBoost - delta); cell.magnet = Math.max(0, cell.magnet - delta); if (cell.magnet > 0) for (const pellet of food) { const distance = distanceBetween(cell, pellet); if (distance < 230 && distance > 1) { pellet.x += (cell.x - pellet.x) / distance * 90 * delta; pellet.y += (cell.y - pellet.y) / distance * 90 * delta; } } for (let index = powerups.length - 1; index >= 0; index -= 1) if (distanceBetween(cell, powerups[index]) < cell.radius + powerups[index].radius) { applyPowerup(cell, powerups[index]); powerups[index] = randomPowerup(); } }
function endGame(result) {
  if (gameState !== 'playing') return;
  const total = ownedCells(player).reduce((sum, cell) => sum + cell.targetMass, 0); finalMass.textContent = Math.floor(total); gameOverScreen.hidden = false; gameState = 'over';
  gameOverTitle.textContent = result === 'win' ? 'Arena conquered' : 'Cell lost';
  gameOverScreen.querySelector('.eyebrow').textContent = result === 'win' ? 'Every rival has been absorbed' : 'The arena keeps moving';
  document.getElementById('reportTime').textContent = `${Math.floor((performance.now() - match.startedAt) / 60000)}:${String(Math.floor((performance.now() - match.startedAt) / 1000) % 60).padStart(2, '0')}`;
  document.getElementById('reportPeak').textContent = Math.floor(match.peakMass); document.getElementById('reportKills').textContent = match.kills; document.getElementById('reportFood').textContent = match.food; document.getElementById('reportViruses').textContent = match.viruses;
  playSound(result === 'win' ? 'eat' : 'death', result === 'win' ? .8 : 1); emitBurst(camera.x, camera.y, result === 'win' ? '#a8f36d' : '#ff8b79', 36, 300);
}

function nearestFood(cell) {
  let nearest = null; let nearestDistance = Infinity;
  for (const pellet of food) { const currentDistance = distanceBetween(cell, pellet); if (currentDistance < nearestDistance) { nearest = pellet; nearestDistance = currentDistance; } }
  return nearest;
}
function chooseBotTarget(cell) {
  let threat = null; let prey = null; let closestThreat = Infinity; let closestPrey = Infinity;
  for (const other of cells) {
    if (other === cell || other.owner === cell.owner || (gameMode === 'teams' && other.owner.team && other.owner.team === cell.owner.team)) continue;
    const distance = distanceBetween(cell, other);
    if (other.mass > cell.mass * 1.35 && distance < closestThreat) { threat = other; closestThreat = distance; }
    if (cell.mass > other.mass * 1.1 && distance < closestPrey) { prey = other; closestPrey = distance; }
  }
  if (threat && closestThreat < 650) return { state: 'flee', target: threat };
  if (prey && closestPrey < 550 && cell.owner.tactic < .65) return { state: 'ambush', target: prey };
  if (prey && closestPrey < 800) return { state: 'chase', target: prey };
  return { state: 'forage', target: nearestFood(cell) };
}
function removeCell(cell) { const index = cells.indexOf(cell); if (index >= 0) cells.splice(index, 1); }
function applyFood(cell) {
  for (let index = food.length - 1; index >= 0; index -= 1) {
    const pellet = food[index];
    if (distanceBetween(cell, pellet) < cell.radius + pellet.radius) { food[index] = randomFood(); cell.targetMass += 1; if (cell.owner === player) { player.eaten += 1; match.food += 1; } emitBurst(pellet.x, pellet.y, pellet.color, 4, 55); playSound('eat', .45); addFloatingText(cell.x, cell.y, '+1'); }
  }
}
function popCell(cell, virus) {
  const count = Math.min(15 + Math.floor(Math.random() * 6), MAX_CELLS - cells.length + 1);
  if (count < 2) return false;
  const totalMass = cell.mass; const angleStep = Math.PI * 2 / count; removeCell(cell); emitBurst(cell.x, cell.y, '#7be06b', 30, 260); playSound('pop'); addFloatingText(cell.x, cell.y, `-${Math.floor(totalMass)}`, '#ff8b79');
  for (let index = 0; index < count; index += 1) {
    const angle = index * angleStep + Math.random() * .3; const pieceMass = Math.max(2, totalMass / count); const offset = virus.radius + 12;
    const piece = createCell(cell.owner, clamp(cell.x + Math.cos(angle) * offset, 30, WORLD.width - 30), clamp(cell.y + Math.sin(angle) * offset, 30, WORLD.height - 30), pieceMass, { mergeReadyAt: performance.now() / 1000 + 8 });
    piece.impulseX = Math.cos(angle) * 260; piece.impulseY = Math.sin(angle) * 260;
  }
  return true;
}
function consumeCells() {
  for (let predatorIndex = 0; predatorIndex < cells.length; predatorIndex += 1) {
    const predator = cells[predatorIndex];
    for (let preyIndex = cells.length - 1; preyIndex >= 0; preyIndex -= 1) {
      const prey = cells[preyIndex];
      if (predator === prey || predator.owner === prey.owner || (gameMode === 'teams' && predator.owner.team && predator.owner.team === prey.owner.team) || predator.mass < prey.mass * 1.1) continue;
      if (distanceBetween(predator, prey) < predator.radius - prey.radius * .3) { predator.targetMass += prey.mass; if (predator.owner === player) { player.eaten += 1; match.kills += 1; if (ownedCells(player).length > 1) { player.splitKills += 1; if (player.splitKills >= 10) unlockAchievement('split-specialist', 'Split Specialist'); } } emitBurst(prey.x, prey.y, prey.color, 12, 160); addFloatingText(predator.x, predator.y, `+${Math.floor(prey.mass)}`); playSound('eat'); removeCell(prey); break; }
    }
  }
  for (const cell of cells.slice()) for (const virus of viruses) if (cell.radius > virus.radius * 1.1 && distanceBetween(cell, virus) < cell.radius - virus.radius * .2) { if (cell.owner === player) { match.viruses += 1; if (match.viruses >= 3) unlockAchievement('virus-buster', 'Virus Buster'); } popCell(cell, virus); break; }
  if (!ownedCells(player).length) endGame('loss');
  else if (bots.every((bot) => !ownedCells(bot).length)) endGame('win');
}
function mergePlayerPieces(now) {
  for (let firstIndex = 0; firstIndex < cells.length; firstIndex += 1) for (let secondIndex = firstIndex + 1; secondIndex < cells.length; secondIndex += 1) {
    const first = cells[firstIndex]; const second = cells[secondIndex];
    if (first.owner !== player || second.owner !== player || now < first.mergeReadyAt || now < second.mergeReadyAt) continue;
    if (distanceBetween(first, second) < Math.max(first.radius, second.radius) * .72) { const larger = first.mass >= second.mass ? first : second; const smaller = larger === first ? second : first; larger.targetMass += smaller.targetMass; removeCell(smaller); return; }
  }
}
function separateSiblingCells(now) {
  for (let firstIndex = 0; firstIndex < cells.length; firstIndex += 1) for (let secondIndex = firstIndex + 1; secondIndex < cells.length; secondIndex += 1) {
    const first = cells[firstIndex]; const second = cells[secondIndex];
    if (first.owner !== player || second.owner !== player || now >= first.mergeReadyAt || now >= second.mergeReadyAt) continue;
    const distance = distanceBetween(first, second) || .01; const desired = (first.radius + second.radius) * .8;
    if (distance < desired) { const push = (desired - distance) / distance * .5; const x = (first.x - second.x) * push; const y = (first.y - second.y) * push; first.x += x; first.y += y; second.x -= x; second.y -= y; }
  }
}
function mergeSelectedCell(now) {
  if (!selectedCell || selectedCell.owner !== player || now < selectedCell.mergeReadyAt) return false;
  const target = ownedCells(player).find((cell) => cell !== selectedCell);
  if (!target) return false;
  target.targetMass += selectedCell.targetMass; addFloatingText(target.x, target.y, `+${Math.floor(selectedCell.targetMass)}`, '#a8f36d'); emitBurst(selectedCell.x, selectedCell.y, player.color, 12, 120); removeCell(selectedCell); selectedCell = null; playSound('eat'); return true;
}
function botStrike(cell) {
  if (cell.actionCooldown > 0 || cell.state !== 'ambush' || !cell.target || cell.mass < cell.target.mass * 1.45 || cells.length >= MAX_CELLS) return;
  const angle = Math.atan2(cell.target.y - cell.y, cell.target.x - cell.x);
  if (distanceBetween(cell, cell.target) < 360) {
    const halfMass = cell.targetMass / 2; cell.mass = halfMass; cell.targetMass = halfMass;
    const half = createCell(cell.owner, cell.x + Math.cos(angle) * cell.radius, cell.y + Math.sin(angle) * cell.radius, halfMass, { aiControlled: cell.owner === player, mergeReadyAt: performance.now() / 1000 + 8 });
    half.impulseX = Math.cos(angle) * 430; half.impulseY = Math.sin(angle) * 430; emitBurst(cell.x, cell.y, cell.color, 12, 190); playSound('split', .35);
  } else if (distanceBetween(cell, cell.target) < 520) launchMass(cell, angle);
  cell.actionCooldown = .9;
}
function splitPlayer() {
  if (gameState !== 'playing' || player.splitCooldown > 0 || cells.length >= MAX_CELLS) return;
  const angle = Math.atan2((pointer.active ? pointer.y : innerHeight / 2) - innerHeight / 2, (pointer.active ? pointer.x : innerWidth / 2) - innerWidth / 2);
  const pieces = ownedCells(player).slice();
  let splitCount = 0;
  for (const cell of pieces) {
    if (cell.targetMass < 24 || cells.length >= MAX_CELLS) continue;
    const halfMass = cell.targetMass / 2;
    cell.mass = halfMass; cell.targetMass = halfMass;
    const offset = cell.radius * .8;
    const half = createCell(player, cell.x + Math.cos(angle) * offset, cell.y + Math.sin(angle) * offset, halfMass, { aiControlled: true, mergeReadyAt: performance.now() / 1000 + 8 });
    half.impulseX = Math.cos(angle) * 460; half.impulseY = Math.sin(angle) * 460; splitCount += 1;
  }
  if (splitCount) { player.splitCooldown = .65; emitBurst(ownedCells(player)[0]?.x || WORLD.width / 2, ownedCells(player)[0]?.y || WORLD.height / 2, player.color, 20, 220); addFloatingText(centroid(player).x, centroid(player).y, 'SPLIT', '#ffffff'); playSound('split'); }
}
function launchMass(cell, angle) {
  if (cell.targetMass < 18 || ejectedMass.length >= MAX_CELLS) return;
  cell.targetMass -= 4; const offset = cell.radius + 10;
  ejectedMass.push({ x: cell.x + Math.cos(angle) * offset, y: cell.y + Math.sin(angle) * offset, visualX: cell.x, visualY: cell.y, radius: 8, mass: 4, color: cell.color, vx: Math.cos(angle) * 390, vy: Math.sin(angle) * 390, owner: cell.owner });
  emitBurst(cell.x, cell.y, cell.color, 7, 100); addFloatingText(cell.x, cell.y, '-4', '#ffcc66'); playSound('eject', .55);
}
function ejectMass() {
  if (gameState !== 'playing') return;
  const angle = Math.atan2((pointer.active ? pointer.y : innerHeight / 2) - innerHeight / 2, (pointer.active ? pointer.x : innerWidth / 2) - innerWidth / 2);
  for (const cell of ownedCells(player)) launchMass(cell, angle);
}
function updateEjected(delta) {
  for (let index = ejectedMass.length - 1; index >= 0; index -= 1) {
    const mass = ejectedMass[index]; mass.x = clamp(mass.x + mass.vx * delta, 8, WORLD.width - 8); mass.y = clamp(mass.y + mass.vy * delta, 8, WORLD.height - 8); mass.vx *= Math.pow(.025, delta); mass.vy *= Math.pow(.025, delta); mass.visualX = lerp(mass.visualX, mass.x, .2); mass.visualY = lerp(mass.visualY, mass.y, .2);
    let absorbed = false;
    for (const virus of viruses) if (distanceBetween(mass, virus) < virus.radius + mass.radius) { virus.storedMass += mass.mass; if (virus.storedMass >= 24 && viruses.length < 28) { const angle = Math.atan2(mass.vy, mass.vx); virus.radius = 54; viruses.push({ x: clamp(virus.x + Math.cos(angle) * 110, 80, WORLD.width - 80), y: clamp(virus.y + Math.sin(angle) * 110, 80, WORLD.height - 80), radius: 44, storedMass: 0, rotation: Math.random() * 6 }); virus.storedMass = 0; } ejectedMass.splice(index, 1); absorbed = true; break; }
    if (absorbed) continue;
    for (const cell of cells) if (cell.owner !== mass.owner && distanceBetween(mass, cell) < cell.radius + mass.radius) { cell.targetMass += mass.mass; ejectedMass.splice(index, 1); break; }
  }
}

function update(delta, now) {
  if (gameState !== 'playing' && gameState !== 'spectator') return;
  const playerCenter = centroid(player); player.splitCooldown = Math.max(0, player.splitCooldown - delta);
  for (const cell of cells) {
    let directionX = 0; let directionY = 0;
    if (cell.owner === player) {
      const targetX = playerCenter.x + (pointer.active ? pointer.x - innerWidth / 2 : 0) / camera.zoom; const targetY = playerCenter.y + (pointer.active ? pointer.y - innerHeight / 2 : 0) / camera.zoom; const distance = Math.hypot(targetX - cell.x, targetY - cell.y); if (distance) { directionX = (targetX - cell.x) / distance; directionY = (targetY - cell.y) / distance; }
    } else {
      cell.stateTime -= delta; if (cell.stateTime <= 0 || !cell.target) { const decision = chooseBotTarget(cell); cell.state = decision.state; cell.target = decision.target; cell.stateTime = .35 + Math.random() * .6; }
      if (cell.target) { const targetX = cell.state === 'flee' ? cell.x * 2 - cell.target.x : cell.target.x; const targetY = cell.state === 'flee' ? cell.y * 2 - cell.target.y : cell.target.y; const distance = Math.hypot(targetX - cell.x, targetY - cell.y); if (distance) { directionX = (targetX - cell.x) / distance; directionY = (targetY - cell.y) / distance; } }
      botStrike(cell);
    }
    if (cell.owner === player && cell.aiControlled) {
      cell.stateTime -= delta;
      if (cell.stateTime <= 0 || !cell.target) { const decision = chooseBotTarget(cell); cell.state = decision.state; cell.target = decision.target; cell.stateTime = .5 + Math.random(); }
      if (cell.target) { const targetX = cell.state === 'flee' ? cell.x * 2 - cell.target.x : cell.target.x; const targetY = cell.state === 'flee' ? cell.y * 2 - cell.target.y : cell.target.y; const distance = Math.hypot(targetX - cell.x, targetY - cell.y); if (distance) { directionX = (targetX - cell.x) / distance; directionY = (targetY - cell.y) / distance; } }
    }
    const speed = Math.max(55, 235 / Math.pow(cell.mass / 12, .23)) * (cell.speedBoost > 0 ? 1.65 : 1);
    const steering = 1 - Math.pow(.0001, delta);
    cell.actionCooldown = Math.max(0, cell.actionCooldown - delta);
    updatePowerups(cell, delta);
    cell.vx = lerp(cell.vx, directionX * speed + cell.impulseX, steering);
    cell.vy = lerp(cell.vy, directionY * speed + cell.impulseY, steering);
    cell.impulseX *= Math.pow(.002, delta); cell.impulseY *= Math.pow(.002, delta);
    cell.x = clamp(cell.x + cell.vx * delta, cell.radius, WORLD.width - cell.radius);
    cell.y = clamp(cell.y + cell.vy * delta, cell.radius, WORLD.height - cell.radius);
    cell.visualX = lerp(cell.visualX, cell.x, 1 - Math.pow(.00001, delta));
    cell.visualY = lerp(cell.visualY, cell.y, 1 - Math.pow(.00001, delta));
    cell.mass = lerp(cell.mass, cell.targetMass, 1 - Math.pow(.0001, delta));
    cell.decayNotice -= delta;
    if (gameMode !== 'teams' && cell.targetMass > DECAY_THRESHOLD) {
      const loss = Math.min(cell.targetMass - DECAY_THRESHOLD, (cell.targetMass - DECAY_THRESHOLD) * DECAY_RATE * delta);
      cell.targetMass -= loss;
      if (cell.decayNotice <= 0) { addFloatingText(cell.x, cell.y, `-${Math.max(1, Math.floor(loss))}`, '#ff9a72'); cell.decayNotice = 1.4; }
    }
    cell.radius = radiusForMass(cell.mass);
    cell.visualRadius = lerp(cell.visualRadius, radiusForMass(cell.targetMass), 1 - Math.pow(.00001, delta));
    applyFood(cell);
  }
  updateMothercells(delta); separateSiblingCells(now); mergePlayerPieces(now); updateEjected(delta); updateEffects(delta); consumeCells();
  const focus = spectatorFocus && ownedCells(spectatorFocus)[0] ? centroid(spectatorFocus) : centroid(player); if (gameState === 'spectator' && spectatorFree) { camera.x = clamp(camera.x, innerWidth / 2 / camera.zoom, WORLD.width - innerWidth / 2 / camera.zoom); camera.y = clamp(camera.y, innerHeight / 2 / camera.zoom, WORLD.height - innerHeight / 2 / camera.zoom); } else { camera.x = focus.x; camera.y = focus.y; } const totalMass = ownedCells(player).reduce((sum, cell) => sum + cell.targetMass, 0); match.peakMass = Math.max(match.peakMass, totalMass); camera.zoom = gameState === 'spectator' && spectatorFree ? camera.zoom : clamp(1.05 - Math.sqrt(Math.max(0, totalMass)) / 1200, .62, 1.05); updateUi(totalMass);
}
function updateUi(totalMass) {
  massValue.textContent = Math.floor(totalMass); scoreMass.textContent = Math.floor(totalMass); eatenValue.textContent = player.eaten; massProgress.style.width = `${Math.min(100, 5 + totalMass / 2)}%`; statusText.textContent = `${bots.length} rivals in arena`;
  const rankings = [player, ...bots].map((owner) => ({ owner, mass: ownedCells(owner).reduce((sum, cell) => sum + cell.targetMass, 0) })).sort((first, second) => second.mass - first.mass).slice(0, 10);
  if (gameState === 'playing' && rankings[0]?.owner === player) unlockAchievement('apex', 'Apex Predator');
  leaderboardList.innerHTML = rankings.map((entry) => `<li class="${entry.owner === player ? 'is-player' : ''}"><strong>${entry.owner.name}</strong><em>${Math.floor(entry.mass)}</em></li>`).join('');
}
function drawGrid(viewWidth, viewHeight) {
  const left = camera.x - viewWidth / 2 / camera.zoom - GRID_SIZE; const right = camera.x + viewWidth / 2 / camera.zoom + GRID_SIZE; const top = camera.y - viewHeight / 2 / camera.zoom - GRID_SIZE; const bottom = camera.y + viewHeight / 2 / camera.zoom + GRID_SIZE;
  context.beginPath(); context.strokeStyle = 'rgba(194, 222, 218, .075)'; context.lineWidth = 1 / camera.zoom; for (let x = Math.floor(left / GRID_SIZE) * GRID_SIZE; x <= right; x += GRID_SIZE) { context.moveTo(x, top); context.lineTo(x, bottom); } for (let y = Math.floor(top / GRID_SIZE) * GRID_SIZE; y <= bottom; y += GRID_SIZE) { context.moveTo(left, y); context.lineTo(right, y); } context.stroke();
}
function drawVirus(virus) {
  context.save(); context.translate(virus.x, virus.y); context.rotate(virus.rotation); context.beginPath(); const spikes = 20;
  for (let index = 0; index < spikes; index += 1) { const angle = index / spikes * Math.PI * 2; const outer = index % 2 ? virus.radius * 1.08 : virus.radius * 1.22; const inner = virus.radius * .8; context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer); context.lineTo(Math.cos(angle + Math.PI / spikes) * inner, Math.sin(angle + Math.PI / spikes) * inner); }
  context.closePath(); context.fillStyle = '#7be06b'; context.shadowColor = '#52d879'; context.shadowBlur = 18; context.fill(); context.shadowBlur = 0; context.strokeStyle = 'rgba(8, 49, 35, .8)'; context.lineWidth = 3; context.stroke(); context.restore(); virus.rotation += .001;
}
function drawMothercell(mother) { context.save(); context.translate(mother.x, mother.y); const pulse = 1 + Math.sin(mother.pulse) * .04; context.scale(pulse, pulse); context.beginPath(); context.fillStyle = '#ff70d9'; context.shadowColor = '#ff70d9'; context.shadowBlur = 28; context.arc(0, 0, mother.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; context.strokeStyle = 'rgba(255,222,249,.8)'; context.lineWidth = 3; context.stroke(); context.restore(); }
function drawPowerup(orb) { const colors = { speed: '#ffcf5c', magnet: '#6de7ff', merge: '#d390ff' }; context.save(); context.translate(orb.x, orb.y); context.rotate(orb.pulse); context.fillStyle = colors[orb.type]; context.shadowColor = colors[orb.type]; context.shadowBlur = 18; context.beginPath(); context.moveTo(0, -orb.radius); context.lineTo(orb.radius, 0); context.lineTo(0, orb.radius); context.lineTo(-orb.radius, 0); context.closePath(); context.fill(); context.restore(); orb.pulse += .012; }
function drawCell(cell) {
  context.save(); context.beginPath(); context.arc(cell.visualX, cell.visualY, cell.visualRadius, 0, Math.PI * 2); context.clip();
  context.fillStyle = cell.color; context.shadowColor = cell.color; context.shadowBlur = cell.owner === player ? 30 : 16; context.fillRect(cell.visualX - cell.visualRadius, cell.visualY - cell.visualRadius, cell.visualRadius * 2, cell.visualRadius * 2); context.shadowBlur = 0;
  if (cell.skin === 'planet') { const planet = context.createRadialGradient(cell.visualX - cell.visualRadius * .35, cell.visualY - cell.visualRadius * .4, 1, cell.visualX, cell.visualY, cell.visualRadius); planet.addColorStop(0, 'rgba(255,255,255,.85)'); planet.addColorStop(.18, 'rgba(255,255,255,.12)'); planet.addColorStop(1, 'rgba(0,0,0,.5)'); context.fillStyle = planet; context.fillRect(cell.visualX - cell.visualRadius, cell.visualY - cell.visualRadius, cell.visualRadius * 2, cell.visualRadius * 2); context.strokeStyle = 'rgba(255,255,255,.5)'; context.lineWidth = 2; context.beginPath(); context.ellipse(cell.visualX, cell.visualY, cell.visualRadius * .9, cell.visualRadius * .23, -.3, 0, Math.PI * 2); context.stroke(); }
  if (cell.skin === 'geometry') { context.strokeStyle = 'rgba(255,255,255,.62)'; context.lineWidth = Math.max(2, cell.visualRadius * .08); context.beginPath(); context.moveTo(cell.visualX, cell.visualY - cell.visualRadius); context.lineTo(cell.visualX + cell.visualRadius, cell.visualY); context.lineTo(cell.visualX, cell.visualY + cell.visualRadius); context.lineTo(cell.visualX - cell.visualRadius, cell.visualY); context.closePath(); context.stroke(); }
  context.restore(); context.beginPath(); context.strokeStyle = cell.owner === player ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.35)'; context.lineWidth = cell.owner === player ? 3 : 2; context.arc(cell.visualX, cell.visualY, cell.visualRadius - 1, 0, Math.PI * 2); context.stroke(); if (cell === selectedCell) { context.beginPath(); context.strokeStyle = '#ffcc66'; context.lineWidth = 4; context.arc(cell.visualX, cell.visualY, cell.visualRadius + 6, 0, Math.PI * 2); context.stroke(); } context.fillStyle = '#fff'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `600 ${Math.max(10, cell.visualRadius * .3)}px Space Grotesk, sans-serif`; context.shadowColor = 'rgba(0,0,0,.35)'; context.shadowBlur = 5; context.fillText(cell.name, cell.visualX, cell.visualY); context.shadowBlur = 0;
}
function cellAtScreenPoint(clientX, clientY) { const worldX = camera.x + (clientX - innerWidth / 2) / camera.zoom; const worldY = camera.y + (clientY - innerHeight / 2) / camera.zoom; return ownedCells(player).slice().reverse().find((cell) => Math.hypot(worldX - cell.x, worldY - cell.y) <= cell.visualRadius / camera.zoom); }
function drawMinimap(width, height) {
  const mapWidth = 156; const mapHeight = 108; const left = width - mapWidth - 24; const top = height - mapHeight - 24; const scaleX = mapWidth / WORLD.width; const scaleY = mapHeight / WORLD.height;
  context.save(); context.fillStyle = 'rgba(5, 13, 20, .8)'; context.fillRect(left, top, mapWidth, mapHeight); context.strokeStyle = 'rgba(168,243,109,.65)'; context.lineWidth = 1; context.strokeRect(left, top, mapWidth, mapHeight);
  for (const pellet of food) { context.fillStyle = 'rgba(255, 209, 104, .2)'; context.fillRect(left + pellet.x * scaleX, top + pellet.y * scaleY, 1.4, 1.4); }
  for (const virus of viruses) { context.fillStyle = '#7be06b'; context.beginPath(); context.arc(left + virus.x * scaleX, top + virus.y * scaleY, 2.5, 0, Math.PI * 2); context.fill(); }
  for (const mother of mothercells) { context.fillStyle = '#ff70d9'; context.fillRect(left + mother.x * scaleX - 1, top + mother.y * scaleY - 1, 3, 3); }
  for (const bot of bots) for (const cell of ownedCells(bot)) { context.fillStyle = 'rgba(255,255,255,.45)'; context.fillRect(left + cell.x * scaleX - 1, top + cell.y * scaleY - 1, 2, 2); }
  const center = centroid(player); const pulse = 3 + Math.sin(performance.now() / 180) * 1.5; context.strokeStyle = player.color; context.lineWidth = 1.5; context.beginPath(); context.arc(left + center.x * scaleX, top + center.y * scaleY, pulse, 0, Math.PI * 2); context.stroke(); context.fillStyle = player.color; context.beginPath(); context.arc(left + center.x * scaleX, top + center.y * scaleY, 2, 0, Math.PI * 2); context.fill(); context.restore();
}
function draw() {
  const width = innerWidth; const height = innerHeight; const theme = document.body.dataset.theme || 'dark'; const background = theme === 'light' ? '#dfeadd' : theme === 'retro' ? '#160d28' : '#071019'; context.clearRect(0, 0, width, height); context.fillStyle = background; context.fillRect(0, 0, width, height); const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * .72); glow.addColorStop(0, theme === 'light' ? 'rgba(135, 183, 137, .3)' : theme === 'retro' ? 'rgba(121, 52, 152, .28)' : 'rgba(22, 55, 60, .42)'); glow.addColorStop(1, 'rgba(7, 16, 25, 0)'); context.fillStyle = glow; context.fillRect(0, 0, width, height);
  context.save(); context.translate(width / 2, height / 2); context.scale(camera.zoom, camera.zoom); context.translate(-camera.x, -camera.y); drawGrid(width, height); context.strokeStyle = 'rgba(168, 243, 109, .55)'; context.lineWidth = 12; context.strokeRect(0, 0, WORLD.width, WORLD.height);
  for (const pellet of food) { context.beginPath(); context.fillStyle = pellet.color; context.shadowColor = pellet.color; context.shadowBlur = 10; context.arc(pellet.x, pellet.y, pellet.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; }
  for (const virus of viruses) drawVirus(virus);
  for (const mother of mothercells) drawMothercell(mother);
  for (const orb of powerups) drawPowerup(orb);
  for (const mass of ejectedMass) { context.beginPath(); context.fillStyle = mass.color; context.shadowColor = mass.color; context.shadowBlur = 12; context.arc(mass.visualX, mass.visualY, mass.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; }
  for (const particle of particles) { context.globalAlpha = Math.max(0, particle.life / particle.maxLife); context.fillStyle = particle.color; context.beginPath(); context.arc(particle.x, particle.y, particle.size * context.globalAlpha, 0, Math.PI * 2); context.fill(); } context.globalAlpha = 1;
  for (const cell of cells) drawCell(cell);
  for (const item of floatingText) { context.globalAlpha = item.life / item.maxLife; context.fillStyle = item.color; context.font = '600 14px Space Grotesk, sans-serif'; context.textAlign = 'center'; context.fillText(item.text, item.x, item.y); } context.globalAlpha = 1;
  context.restore();
  drawMinimap(width, height);
}

let previous = performance.now();
function frame(now) { const delta = Math.min((now - previous) / 1000, .05); previous = now; update(delta, now / 1000); draw(); requestAnimationFrame(frame); }
function cycleSpectatorFocus() { const ranked = bots.filter((bot) => ownedCells(bot).length).sort((first, second) => ownedCells(second).reduce((sum, cell) => sum + cell.targetMass, 0) - ownedCells(first).reduce((sum, cell) => sum + cell.targetMass, 0)); const currentIndex = ranked.indexOf(spectatorFocus); spectatorFocus = ranked[(currentIndex + 1) % Math.max(1, ranked.length)] || null; spectatorFree = false; }
startForm.addEventListener('submit', (event) => { event.preventDefault(); startGame(); });
respawnButton.addEventListener('click', startGame);
menuSpectateButton.addEventListener('click', startSpectator);
deathSpectateButton.addEventListener('click', () => { gameOverScreen.hidden = true; startSpectator(); });
nextFocusButton.addEventListener('click', cycleSpectatorFocus);
splitButton.addEventListener('click', (event) => { event.preventDefault(); splitPlayer(); });
let lastTouchAt = 0;
addEventListener('resize', resize); addEventListener('pointermove', (event) => { if (gameState === 'spectator' && spectatorDrag) { camera.x -= (event.clientX - previousPointer.x) / camera.zoom; camera.y -= (event.clientY - previousPointer.y) / camera.zoom; spectatorFocus = null; spectatorFree = true; } pointer.x = event.clientX; pointer.y = event.clientY; previousPointer = { x: event.clientX, y: event.clientY }; pointer.active = true; }); addEventListener('pointerdown', (event) => { pointer.x = event.clientX; pointer.y = event.clientY; previousPointer = { x: event.clientX, y: event.clientY }; pointer.active = true; if (gameState === 'spectator') spectatorDrag = true; if (gameState === 'playing' && event.pointerType !== 'touch') { const clicked = cellAtScreenPoint(event.clientX, event.clientY); if (clicked) { if (selectedCell && selectedCell !== clicked) mergeSelectedCell(performance.now() / 1000); else selectedCell = clicked; } } if (event.pointerType === 'touch' && performance.now() - lastTouchAt < 350) splitPlayer(); lastTouchAt = performance.now(); }); addEventListener('pointerup', () => { spectatorDrag = false; }); addEventListener('pointerleave', () => { pointer.active = false; spectatorDrag = false; });
addEventListener('wheel', (event) => { if (gameState !== 'spectator') return; event.preventDefault(); camera.zoom = clamp(camera.zoom * (event.deltaY > 0 ? .9 : 1.1), .35, 2.2); spectatorFocus = null; spectatorFree = true; }, { passive: false });
addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    splitPlayer();
  }
  if (event.code === 'KeyW') { event.preventDefault(); ejectMass(); }
  if (event.code === 'KeyM') { event.preventDefault(); mergeSelectedCell(performance.now() / 1000); }
});
resize(); resetPlayer(); setupBots(); updateUi(12); requestAnimationFrame(frame);
