const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const menuScreen = document.getElementById('menuScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startForm = document.getElementById('startForm');
const nicknameInput = document.getElementById('nickname');
const respawnButton = document.getElementById('respawnButton');
const leaderboardList = document.getElementById('leaderboardList');
const massValue = document.getElementById('massValue');
const healthValue = document.getElementById('healthValue');
const scoreMass = document.getElementById('scoreMass');
const eatenValue = document.getElementById('eatenValue');
const massProgress = document.getElementById('massProgress');
const statusText = document.getElementById('statusText');
const gasStatus = document.getElementById('gasStatus');
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
const layoutSelect = document.getElementById('layout');
const streakValue = document.getElementById('streakValue');
const evolutionValue = document.getElementById('evolutionValue');
const allianceButton = document.getElementById('allianceButton');
const allianceRejectButton = document.getElementById('allianceRejectButton');
const betrayButton = document.getElementById('betrayButton');

const WORLD = { width: 5200, height: 3600 };
const FOOD_TARGET = 420;
const BOT_TARGET = 8;
const MAX_CELLS = 80;
const VIRUS_TARGET = 18;
const GRID_SIZE = 100;
const MIN_CELL_GROWTH = 12;
const SHRINK_DELAY = 60;
const SHRINK_PHASE = 20;
const SHRINK_PAUSE = 20;
const SHRINK_CYCLES = 3;
const GAS_DAMAGE_RATE = 7;
const DASH_COOLDOWN = 4;
const DASH_FORCE = 620;
const HAZARD_DAMAGE_RATE = 18;
const SPLIT_COST = 1;
const BOT_NAMES = ['Nova', 'Miso', 'Orbit', 'Kite', 'Pixel', 'Zest', 'Comet', 'Echo', 'Mochi', 'Vanta', 'Sprout', 'Rook'];
const food = [];
const cells = [];
const ejectedMass = [];
const viruses = [];
const mothercells = [];
const powerups = [];
const hazards = [];
const obstacles = [];
const blackholes = [];
const currents = [];
const portals = [];
const alliances = [];
const allianceOffers = [];
const particles = [];
const floatingText = [];
const bots = [];
const TEAMS = [{ name: 'Red', color: '#ff6961' }, { name: 'Green', color: '#77dd77' }, { name: 'Blue', color: '#70a7ff' }];
const player = { id: 'player', name: 'James', color: `hsl(${Math.floor(Math.random() * 360)} 82% 62%)`, skin: 'neon', eaten: 0, splitCooldown: 0, splitKills: 0, kills: 0, streak: 0, evolution: 1, controlledCell: null, betrayalUntil: 0 };
const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false };
const camera = { x: WORLD.width / 2, y: WORLD.height / 2, zoom: 1 };
const arena = { left: 0, top: 0, right: WORLD.width, bottom: WORLD.height };
const weather = { type: 'clear', remaining: 28 };
let gameState = 'menu';
let gameMode = 'ffa';
let spectatorFocus = null;
let spectatorFree = false;
let spectatorDrag = false;
let selectedCell = null;
let previousPointer = { x: 0, y: 0 };
const match = { startedAt: 0, peakMass: 12, kills: 0, food: 0, viruses: 0 };
let arenaLayout = 'open';
let pendingAllianceOffer = null;
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
function randomFood() { const legendary = Math.random() < .025; return { x: 35 + Math.random() * (WORLD.width - 70), y: 35 + Math.random() * (WORLD.height - 70), radius: legendary ? 11 : 5 + Math.random() * 4, value: legendary ? 12 : 1, legendary, color: legendary ? '#ffd34e' : `hsl(${Math.floor(Math.random() * 360)} 90% 67%)` }; }
function spawnPoint(margin = 180) { return { x: margin + Math.random() * (WORLD.width - margin * 2), y: margin + Math.random() * (WORLD.height - margin * 2) }; }
function resetArena() { arena.left = 0; arena.top = 0; arena.right = WORLD.width; arena.bottom = WORLD.height; obstacles.length = 0; hazards.length = 0; blackholes.length = 0; currents.length = 0; portals.length = 0; if (arenaLayout === 'crossfire') { obstacles.push({ x: 2400, y: 1550, width: 400, height: 500 }); } if (arenaLayout === 'rings') { obstacles.push({ x: 2600, y: 1800, radius: 420 }, { x: 2600, y: 1800, radius: 180 }); } for (let index = 0; index < 7; index += 1) { const spawn = spawnPoint(260); hazards.push({ x: spawn.x, y: spawn.y, radius: 28, angle: Math.random() * Math.PI * 2, speed: 35 + Math.random() * 45, orbit: 80 + Math.random() * 150, originX: spawn.x, originY: spawn.y, pulse: Math.random() * 6 }); } for (let index = 0; index < 4; index += 1) { const spawn = spawnPoint(320); currents.push({ x: spawn.x, y: spawn.y, radius: 180, vx: Math.random() * 90 - 45, vy: Math.random() * 90 - 45, pulse: Math.random() * 6 }); } for (let index = 0; index < 3; index += 1) { const spawn = spawnPoint(420); blackholes.push({ x: spawn.x, y: spawn.y, radius: 70, pull: 190, type: index % 2 ? 'forward' : 'vortex', angle: Math.random() * Math.PI * 2, pulse: Math.random() * 6 }); } for (let index = 0; index < 3; index += 1) { const first = spawnPoint(360); const second = spawnPoint(360); portals.push({ x: first.x, y: first.y, radius: 32, pair: index }); portals.push({ x: second.x, y: second.y, radius: 32, pair: index }); } }
function updateArena(elapsed) {
  if (elapsed < SHRINK_DELAY) return { phase: 'safe', remaining: SHRINK_DELAY - elapsed };
  const cycleTime = SHRINK_PHASE + SHRINK_PAUSE;
  const cycleElapsed = elapsed - SHRINK_DELAY;
  const cycleProgress = clamp(Math.floor(cycleElapsed / cycleTime), 0, SHRINK_CYCLES);
  const phaseElapsed = cycleElapsed - cycleProgress * cycleTime;
  const shrinking = cycleProgress < SHRINK_CYCLES && phaseElapsed < SHRINK_PHASE;
  const completedCycles = cycleProgress >= SHRINK_CYCLES ? SHRINK_CYCLES : cycleProgress + (shrinking ? phaseElapsed / SHRINK_PHASE : 1);
  const inset = Math.min(WORLD.width, WORLD.height) * .45 * completedCycles / SHRINK_CYCLES;
  const driftX = Math.sin(elapsed * .17) * 150 * completedCycles / SHRINK_CYCLES; const driftY = Math.cos(elapsed * .13) * 110 * completedCycles / SHRINK_CYCLES;
  arena.left = inset + driftX; arena.top = inset + driftY; arena.right = WORLD.width - inset + driftX; arena.bottom = WORLD.height - inset + driftY;
  return { phase: shrinking ? 'shrinking' : cycleProgress < SHRINK_CYCLES ? 'pause' : 'final', remaining: shrinking ? SHRINK_PHASE - phaseElapsed : cycleProgress < SHRINK_CYCLES ? cycleTime - phaseElapsed : 0 };
}
function arenaCenter() { return { x: (arena.left + arena.right) / 2, y: (arena.top + arena.bottom) / 2 }; }
function updateHazards(delta) { for (const hazard of hazards) { hazard.angle += hazard.speed * delta / hazard.orbit; hazard.x = hazard.originX + Math.cos(hazard.angle) * hazard.orbit; hazard.y = hazard.originY + Math.sin(hazard.angle) * hazard.orbit; hazard.pulse += delta * 4; } }
function updateWeather(delta) { weather.remaining -= delta; if (weather.remaining <= 0) { weather.type = ['clear', 'wind', 'current', 'low-gravity'][Math.floor(Math.random() * 4)]; weather.remaining = 18 + Math.random() * 22; } }
function allianceBetween(first, second) { return alliances.some((alliance) => ((alliance.first === first && alliance.second === second) || (alliance.first === second && alliance.second === first)) && alliance.until > performance.now() / 1000); }
function livingOpponent(exclude = player) { return [player, ...bots].filter((owner) => owner !== exclude && ownedCells(owner).length); }
function offerAlliance(from, to) { if (!to || from === to || allianceBetween(from, to) || allianceOffers.some((offer) => offer.from === from && offer.to === to)) return; allianceOffers.push({ from, to, expires: performance.now() / 1000 + 10 }); if (from === player) addFloatingText(player.controlledCell?.x || WORLD.width / 2, player.controlledCell?.y || WORLD.height / 2, `OFFER TO ${to.name}`, '#70a7ff'); }
function resolveAllianceOffers(now) { for (let index = allianceOffers.length - 1; index >= 0; index -= 1) { const offer = allianceOffers[index]; if (offer.expires < now || !ownedCells(offer.to).length) { if (offer.to === player) pendingAllianceOffer = null; allianceOffers.splice(index, 1); continue; } if (offer.to === player) { pendingAllianceOffer = offer; continue; } if (offer.from === player) { if (Math.random() < .72) alliances.push({ first: player, second: offer.to, until: now + 75 }); allianceOffers.splice(index, 1); } else if (Math.random() < .55) { alliances.push({ first: offer.from, second: offer.to, until: now + 75 }); allianceOffers.splice(index, 1); } } for (let index = alliances.length - 1; index >= 0; index -= 1) if (alliances[index].until <= now) alliances.splice(index, 1); if (Math.random() < .006 && bots.length) { const from = bots[Math.floor(Math.random() * bots.length)]; const targets = livingOpponent(from); offerAlliance(from, targets[Math.floor(Math.random() * targets.length)]); } }
function offerPlayerAlliance() { const candidates = livingOpponent(); const target = candidates[Math.floor(Math.random() * candidates.length)]; offerAlliance(player, target); }
function betrayAlliances() { const now = performance.now() / 1000; const active = alliances.filter((alliance) => alliance.first === player || alliance.second === player); if (!active.length) return; alliances.splice(0, alliances.length, ...alliances.filter((alliance) => alliance.first !== player && alliance.second !== player)); player.betrayalUntil = now + 30; addFloatingText(player.controlledCell?.x || WORLD.width / 2, player.controlledCell?.y || WORLD.height / 2, 'BETRAYAL: HUNTED', '#ff6961'); }
function acceptAlliance() { if (!pendingAllianceOffer) return; alliances.push({ first: pendingAllianceOffer.from, second: player, until: performance.now() / 1000 + 75 }); allianceOffers.splice(allianceOffers.indexOf(pendingAllianceOffer), 1); addFloatingText(player.controlledCell.x, player.controlledCell.y, 'ALLIANCE ACCEPTED', '#70a7ff'); pendingAllianceOffer = null; }
function rejectAlliance() { if (!pendingAllianceOffer) return; allianceOffers.splice(allianceOffers.indexOf(pendingAllianceOffer), 1); pendingAllianceOffer = null; }
function clampCameraToArena() {
  const halfWidth = innerWidth / 2 / camera.zoom; const halfHeight = innerHeight / 2 / camera.zoom;
  camera.x = arena.right - arena.left <= halfWidth * 2 ? (arena.left + arena.right) / 2 : clamp(camera.x, arena.left + halfWidth, arena.right - halfWidth);
  camera.y = arena.bottom - arena.top <= halfHeight * 2 ? (arena.top + arena.bottom) / 2 : clamp(camera.y, arena.top + halfHeight, arena.bottom - halfHeight);
}
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
function randomPowerup() { const spawn = spawnPoint(120); const types = ['speed', 'magnet', 'merge', 'resistance', 'invisibility']; return { x: spawn.x, y: spawn.y, radius: 13, type: types[Math.floor(Math.random() * types.length)], pulse: Math.random() * 6 }; }
for (let index = 0; index < 12; index += 1) powerups.push(randomPowerup());
function createMothercell() { const spawn = spawnPoint(300); mothercells.push({ x: spawn.x, y: spawn.y, radius: 62, timer: Math.random() * 2, pulse: Math.random() * 6 }); }

function createCell(owner, x, y, mass, options = {}) {
  const radius = radiusForMass(mass);
  const cell = { owner, name: options.name || owner.name, color: options.color || owner.color, skin: options.skin || owner.skin || 'neon', aiControlled: options.aiControlled || false, x, y, visualX: x, visualY: y, radius, visualRadius: radius, mass, targetMass: mass, health: 100, vx: 0, vy: 0, impulseX: 0, impulseY: 0, state: 'forage', target: null, stateTime: 0, mergeReadyAt: options.mergeReadyAt || 0, decayNotice: 0, actionCooldown: 0, dashCooldown: 0, portalCooldown: 0, speedBoost: 0, magnet: 0, gasResistance: 0, invisible: 0, instantMerge: false, evolution: owner === player ? player.evolution : 1 };
  cells.push(cell);
  return cell;
}
function ownedCells(owner) { return cells.filter((cell) => cell.owner === owner); }
function centroid(owner) {
  const pieces = ownedCells(owner);
  if (!pieces.length) return { x: WORLD.width / 2, y: WORLD.height / 2 };
  return pieces.reduce((center, cell) => ({ x: center.x + cell.visualX / pieces.length, y: center.y + cell.visualY / pieces.length }), { x: 0, y: 0 });
}
function resetPlayer() { player.eaten = 0; player.kills = 0; player.streak = 0; player.evolution = 1; player.splitCooldown = 0; player.controlledCell = createCell(player, WORLD.width / 2, WORLD.height / 2, 12); }
function setupBots() {
  bots.length = 0;
  for (let index = 0; index < BOT_TARGET; index += 1) { const team = TEAMS[index % 3]; const owner = { id: `bot-${index}`, name: BOT_NAMES[index % BOT_NAMES.length], color: gameMode === 'teams' ? team.color : randomColor(), skin: randomSkin(), tactic: Math.random(), team: gameMode === 'teams' ? team.name : null }; bots.push(owner); const spawn = spawnPoint(); createCell(owner, spawn.x, spawn.y, 15 + Math.random() * 28); }
}
function startGame() {
  player.name = nicknameInput.value.trim().slice(0, 14) || 'James'; player.color = randomColor(); player.skin = skinSelect.value; player.splitKills = 0; gameMode = modeSelect.value; arenaLayout = layoutSelect.value; player.team = gameMode === 'teams' ? TEAMS[0].name : null; if (gameMode === 'teams') player.color = TEAMS[0].color; document.body.dataset.theme = themeSelect.value; cells.length = 0; ejectedMass.length = 0; particles.length = 0; floatingText.length = 0; mothercells.length = 0; alliances.length = 0; allianceOffers.length = 0; pendingAllianceOffer = null; player.betrayalUntil = 0; weather.type = 'clear'; weather.remaining = 28; selectedCell = null; resetArena(); match.startedAt = performance.now(); match.peakMass = 12; match.kills = 0; match.food = 0; match.viruses = 0; achievements.clear(); spectatorFocus = null; spectatorFree = false; resetPlayer(); setupBots(); if (gameMode === 'experimental') for (let index = 0; index < 8; index += 1) createMothercell(); gameState = 'playing'; spectatorBar.hidden = true; menuScreen.hidden = true; gameOverScreen.hidden = true; startAudio();
}
function startSpectator() { gameMode = 'ffa'; cells.length = 0; ejectedMass.length = 0; resetArena(); setupBots(); spectatorFocus = bots[0]; spectatorFree = false; gameState = 'spectator'; menuScreen.hidden = true; gameOverScreen.hidden = true; spectatorBar.hidden = false; }
function handoffPlayerControl() { const survivor = ownedCells(player).sort((first, second) => second.targetMass - first.targetMass)[0]; if (!survivor) return false; for (const cell of ownedCells(player)) cell.aiControlled = cell !== survivor; survivor.aiControlled = false; player.controlledCell = survivor; selectedCell = null; emitBurst(survivor.x, survivor.y, player.color, 18, 150); addFloatingText(survivor.x, survivor.y, 'CONTROL TRANSFERRED', '#ffffff'); return true; }
function unlockAchievement(id, title) { if (achievements.has(id)) return; achievements.add(id); achievementToast.textContent = `Achievement unlocked: ${title}`; achievementToast.hidden = false; setTimeout(() => { achievementToast.hidden = true; }, 2600); }
function applyPowerup(cell, orb) { if (orb.type === 'speed') cell.speedBoost = 7; if (orb.type === 'magnet') cell.magnet = 8; if (orb.type === 'merge') { cell.instantMerge = true; for (const sibling of ownedCells(cell.owner)) sibling.mergeReadyAt = 0; } if (orb.type === 'resistance') cell.gasResistance = .7; if (orb.type === 'invisibility') cell.invisible = 8; const labels = { speed: 'SPEED SURGE', magnet: 'MASS MAGNET', merge: 'INSTANT MERGE', resistance: 'GAS RESISTANCE', invisibility: 'INVISIBLE' }; emitBurst(orb.x, orb.y, '#ffdc70', 16, 180); addFloatingText(cell.x, cell.y, labels[orb.type], '#ffdc70'); playSound('eat', .8); }
function updateMothercells(delta) { if (gameMode !== 'experimental') return; for (const mother of mothercells) { mother.timer -= delta; mother.pulse += delta * 2; if (mother.timer <= 0) { mother.timer = 1.4; const angle = Math.random() * Math.PI * 2; food.push({ x: clamp(mother.x + Math.cos(angle) * (mother.radius + 18), 20, WORLD.width - 20), y: clamp(mother.y + Math.sin(angle) * (mother.radius + 18), 20, WORLD.height - 20), radius: 6, color: '#ff9be8' }); } for (const cell of cells.slice()) if (cell.radius < mother.radius && distanceBetween(cell, mother) < mother.radius * 1.2) { emitBurst(cell.x, cell.y, '#ff75d4', 18, 200); addFloatingText(cell.x, cell.y, 'MOTHERCELL', '#ff75d4'); removeCell(cell); if (cell.owner === player) endGame('loss'); } } }
function updatePowerups(cell, delta) { cell.speedBoost = Math.max(0, cell.speedBoost - delta); cell.magnet = Math.max(0, cell.magnet - delta); cell.gasResistance = Math.max(0, cell.gasResistance - delta); cell.invisible = Math.max(0, cell.invisible - delta); if (cell.magnet > 0) for (const pellet of food) { const distance = distanceBetween(cell, pellet); if (distance < 230 && distance > 1) { pellet.x += (cell.x - pellet.x) / distance * 90 * delta; pellet.y += (cell.y - pellet.y) / distance * 90 * delta; } } for (let index = powerups.length - 1; index >= 0; index -= 1) if (distanceBetween(cell, powerups[index]) < cell.radius + powerups[index].radius) { applyPowerup(cell, powerups[index]); powerups[index] = randomPowerup(); } }
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
  let threat = null; let prey = null; let closestThreat = Infinity; let bestPreyScore = 0;
  const edgeDistance = Math.min(cell.x - arena.left, arena.right - cell.x, cell.y - arena.top, arena.bottom - cell.y);
  if (edgeDistance < 180) return { state: 'escape', target: arenaCenter() };
  if (cell.owner !== player && player.betrayalUntil > performance.now() / 1000) return { state: 'hunt', target: player };
  const foodTarget = nearestFood(cell);
  if (foodTarget && distanceBetween(cell, foodTarget) < 500 && cell.owner.tactic < .4) return { state: 'camp', target: foodTarget };
  for (const other of cells) {
    if (other === cell || other.owner === cell.owner || other.invisible > 0 || allianceBetween(cell.owner, other.owner) || (gameMode === 'teams' && other.owner.team && other.owner.team === cell.owner.team)) continue;
    const distance = distanceBetween(cell, other);
    if (other.mass > cell.mass * 1.35 && distance < closestThreat) { threat = other; closestThreat = distance; }
    if (cell.mass > other.mass * 1.1) { const preyScore = other.mass / Math.max(distance, 1); if (preyScore > bestPreyScore) { prey = other; bestPreyScore = preyScore; } }
  }
  if (threat && closestThreat < 650) return { state: 'flee', target: threat };
  const preyDistance = prey ? distanceBetween(cell, prey) : Infinity;
  if (prey && preyDistance < 550 && cell.owner.tactic < .8) return { state: 'ambush', target: prey };
  if (prey && preyDistance < 800) return { state: 'chase', target: prey };
  return { state: 'forage', target: foodTarget };
}
function applyGasDamage(cell, delta) {
  const outside = cell.x < arena.left || cell.x > arena.right || cell.y < arena.top || cell.y > arena.bottom;
  if (!outside) return false;
  cell.health = Math.max(0, cell.health - GAS_DAMAGE_RATE * (1 - cell.gasResistance) * delta);
  if (cell.health > 0) return false;
  const wasControlled = cell === player.controlledCell;
  emitBurst(cell.x, cell.y, '#b9d66a', 16, 170); addFloatingText(cell.x, cell.y, 'POISONED', '#d7ef8c'); removeCell(cell);
  if (wasControlled && !handoffPlayerControl()) endGame('loss');
  return true;
}
function updateEvolution() {
  const nextLevel = Math.min(5, 1 + Math.floor(player.kills / 3));
  if (nextLevel === player.evolution) return;
  player.evolution = nextLevel;
  for (const cell of ownedCells(player)) { cell.evolution = nextLevel; cell.health = Math.min(100, cell.health + 25); }
  addFloatingText(player.controlledCell?.x || WORLD.width / 2, player.controlledCell?.y || WORLD.height / 2, `EVOLUTION ${nextLevel}`, '#d390ff');
}
function dashCell(cell) {
  if (!cell || cell.dashCooldown > 0) return;
  const angle = Math.atan2((pointer.active ? pointer.y : innerHeight / 2) - innerHeight / 2, (pointer.active ? pointer.x : innerWidth / 2) - innerWidth / 2);
  cell.impulseX += Math.cos(angle) * DASH_FORCE; cell.impulseY += Math.sin(angle) * DASH_FORCE; cell.dashCooldown = DASH_COOLDOWN; cell.targetMass = Math.max(2, cell.targetMass - 2);
  emitBurst(cell.x, cell.y, cell.color, 10, 160); playSound('split', .5);
}
function applyHazardDamage(cell, delta) {
  for (const hazard of hazards) if (distanceBetween(cell, hazard) < cell.radius + hazard.radius) {
    cell.health = Math.max(0, cell.health - HAZARD_DAMAGE_RATE * delta);
    if (cell.health <= 0) { const wasControlled = cell === player.controlledCell; removeCell(cell); emitBurst(cell.x, cell.y, '#ff8b79', 14, 150); if (wasControlled && !handoffPlayerControl()) endGame('loss'); return true; }
    return false;
  }
  return false;
}
function applyWorldForces(cell, delta) {
  for (const current of currents) if (distanceBetween(cell, current) < current.radius) { cell.vx += current.vx * delta; cell.vy += current.vy * delta; }
  if (weather.type === 'wind') { cell.vx += Math.sin(cell.y / 240) * 25 * delta; cell.vy += Math.cos(cell.x / 240) * 25 * delta; }
  if (weather.type === 'current') { cell.vx += 35 * delta; cell.vy -= 24 * delta; }
  if (weather.type === 'low-gravity') { cell.impulseX *= Math.pow(.7, delta); cell.impulseY *= Math.pow(.7, delta); }
  for (const blackhole of blackholes) {
    const distance = distanceBetween(cell, blackhole);
    if (distance < blackhole.radius * 3) { const angle = blackhole.type === 'forward' ? blackhole.angle : Math.atan2(blackhole.y - cell.y, blackhole.x - cell.x); const strength = blackhole.pull * (1 - distance / (blackhole.radius * 3)); cell.vx += Math.cos(angle) * strength * delta; cell.vy += Math.sin(angle) * strength * delta; }
    if (distance < blackhole.radius * .48) { const wasControlled = cell === player.controlledCell; removeCell(cell); emitBurst(cell.x, cell.y, '#30204f', 20, 200); addFloatingText(cell.x, cell.y, `${blackhole.type.toUpperCase()} VOID`, '#d390ff'); if (wasControlled && !handoffPlayerControl()) endGame('loss'); return true; }
  }
  if (cell.portalCooldown > 0) cell.portalCooldown -= delta;
  if (cell.portalCooldown <= 0) for (const portal of portals) if (distanceBetween(cell, portal) < portal.radius) { const exit = portals.find((candidate) => candidate !== portal && candidate.pair === portal.pair); if (exit) { cell.x = exit.x; cell.y = exit.y; cell.visualX = exit.x; cell.visualY = exit.y; cell.portalCooldown = 1; } break; }
  return false;
}
function removeCell(cell) { const index = cells.indexOf(cell); if (index >= 0) cells.splice(index, 1); }
function applyFood(cell) {
  for (let index = food.length - 1; index >= 0; index -= 1) {
    const pellet = food[index];
    if (distanceBetween(cell, pellet) < cell.radius + pellet.radius) { food[index] = randomFood(); cell.targetMass += pellet.value; if (cell.owner === player) { player.eaten += 1; match.food += 1; } emitBurst(pellet.x, pellet.y, pellet.color, pellet.legendary ? 12 : 4, pellet.legendary ? 130 : 55); playSound('eat', pellet.legendary ? 1 : .45); addFloatingText(cell.x, cell.y, pellet.legendary ? `+${pellet.value} LEGENDARY` : `+${pellet.value}`, pellet.legendary ? '#ffd34e' : '#a8f36d'); }
  }
}
function popCell(cell, virus) {
  const count = Math.min(15 + Math.floor(Math.random() * 6), MAX_CELLS - cells.length + 1);
  if (count < 2) return false;
  const totalMass = cell.mass; const angleStep = Math.PI * 2 / count; const wasControlled = cell === player.controlledCell; removeCell(cell); emitBurst(cell.x, cell.y, '#7be06b', 30, 260); playSound('pop'); addFloatingText(cell.x, cell.y, `-${Math.floor(totalMass)}`, '#ff9a72');
  for (let index = 0; index < count; index += 1) {
    const angle = index * angleStep + Math.random() * .3; const pieceMass = Math.max(2, totalMass / count); const offset = virus.radius + 12;
    const piece = createCell(cell.owner, clamp(cell.x + Math.cos(angle) * offset, 30, WORLD.width - 30), clamp(cell.y + Math.sin(angle) * offset, 30, WORLD.height - 30), pieceMass, { aiControlled: cell.owner === player, mergeReadyAt: performance.now() / 1000 + 8 });
    piece.impulseX = Math.cos(angle) * 260; piece.impulseY = Math.sin(angle) * 260;
  }
  if (wasControlled) handoffPlayerControl();
  return true;
}
function consumeCells() {
  for (let predatorIndex = 0; predatorIndex < cells.length; predatorIndex += 1) {
    const predator = cells[predatorIndex];
    for (let preyIndex = cells.length - 1; preyIndex >= 0; preyIndex -= 1) {
      const prey = cells[preyIndex];
      if (predator === prey || predator.owner === prey.owner || allianceBetween(predator.owner, prey.owner) || (gameMode === 'teams' && predator.owner.team && predator.owner.team === prey.owner.team) || predator.mass < prey.mass * 1.1) continue;
      if (distanceBetween(predator, prey) < predator.radius - prey.radius * .3) { const growth = Math.max(prey.mass, MIN_CELL_GROWTH) * (1 + predator.mass / 100); predator.targetMass += growth; if (predator.owner === player) { player.eaten += 1; player.kills += 1; player.streak += 1; match.kills += 1; updateEvolution(); if (ownedCells(player).length > 1) { player.splitKills += 1; if (player.splitKills >= 10) unlockAchievement('split-specialist', 'Split Specialist'); } } const wasControlled = prey === player.controlledCell; emitBurst(prey.x, prey.y, prey.color, 12, 160); addFloatingText(predator.x, predator.y, `+${Math.floor(growth)}${predator.owner === player ? ` STREAK ${player.streak}` : ''}`); playSound('eat'); removeCell(prey); if (wasControlled && !handoffPlayerControl()) endGame('loss'); break; }
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
    if (distanceBetween(first, second) < Math.max(first.radius, second.radius) * .72) { const larger = first.mass >= second.mass ? first : second; const smaller = larger === first ? second : first; larger.targetMass += smaller.targetMass; if (smaller === player.controlledCell) { player.controlledCell = larger; larger.aiControlled = false; } removeCell(smaller); return; }
  }
}
function mergeSelectedCell(now) {
  if (!selectedCell || selectedCell.owner !== player || now < selectedCell.mergeReadyAt) return false;
  const target = ownedCells(player).find((cell) => cell !== selectedCell);
  if (!target) return false;
  target.targetMass += selectedCell.targetMass; if (selectedCell === player.controlledCell) { player.controlledCell = target; target.aiControlled = false; } addFloatingText(target.x, target.y, `+${Math.floor(selectedCell.targetMass)}`, '#a8f36d'); emitBurst(selectedCell.x, selectedCell.y, player.color, 12, 120); removeCell(selectedCell); selectedCell = null; playSound('eat'); return true;
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
    const halfMass = cell.targetMass / 2 - SPLIT_COST;
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
  const gasPhase = gameState === 'playing' ? updateArena((performance.now() - match.startedAt) / 1000) : { phase: 'safe', remaining: 0 };
  updateHazards(delta);
  updateWeather(delta);
  resolveAllianceOffers(now);
  const playerCenter = centroid(player); player.splitCooldown = Math.max(0, player.splitCooldown - delta);
  for (const cell of cells.slice()) {
    let directionX = 0; let directionY = 0;
    if (cell.owner === player && cell === player.controlledCell) {
      const targetX = cell.x + (pointer.active ? pointer.x - innerWidth / 2 : 0) / camera.zoom; const targetY = cell.y + (pointer.active ? pointer.y - innerHeight / 2 : 0) / camera.zoom; const distance = Math.hypot(targetX - cell.x, targetY - cell.y); if (distance) { directionX = (targetX - cell.x) / distance; directionY = (targetY - cell.y) / distance; }
    } else if (cell.owner !== player) {
      cell.stateTime -= delta; if (cell.stateTime <= 0 || !cell.target) { const decision = chooseBotTarget(cell); cell.state = decision.state; cell.target = decision.target; cell.stateTime = .35 + Math.random() * .6; }
      if (cell.target) { const targetX = cell.state === 'flee' ? cell.x * 2 - cell.target.x : cell.target.x; const targetY = cell.state === 'flee' ? cell.y * 2 - cell.target.y : cell.target.y; const distance = Math.hypot(targetX - cell.x, targetY - cell.y); if (distance) { directionX = (targetX - cell.x) / distance; directionY = (targetY - cell.y) / distance; } }
      botStrike(cell);
    }
    if (cell.owner === player && cell.aiControlled) {
      cell.stateTime -= delta;
      if (cell.stateTime <= 0 || !cell.target) { const decision = chooseBotTarget(cell); cell.state = decision.state; cell.target = decision.target; cell.stateTime = .5 + Math.random(); }
      if (cell.target) { const targetX = cell.state === 'flee' ? cell.x * 2 - cell.target.x : cell.target.x; const targetY = cell.state === 'flee' ? cell.y * 2 - cell.target.y : cell.target.y; const distance = Math.hypot(targetX - cell.x, targetY - cell.y); if (distance) { directionX = (targetX - cell.x) / distance; directionY = (targetY - cell.y) / distance; } }
    }
    const speed = Math.max(55, 235 / Math.pow(cell.mass / 12, .23)) * (1 + (cell.evolution - 1) * .08) * (cell.speedBoost > 0 ? 1.65 : 1);
    const steering = 1 - Math.pow(.0001, delta);
    cell.actionCooldown = Math.max(0, cell.actionCooldown - delta);
    updatePowerups(cell, delta);
    if (applyWorldForces(cell, delta)) continue;
    cell.vx = lerp(cell.vx, directionX * speed + cell.impulseX, steering);
    cell.vy = lerp(cell.vy, directionY * speed + cell.impulseY, steering);
    cell.impulseX *= Math.pow(.002, delta); cell.impulseY *= Math.pow(.002, delta);
    cell.x = clamp(cell.x + cell.vx * delta, cell.radius, WORLD.width - cell.radius);
    cell.y = clamp(cell.y + cell.vy * delta, cell.radius, WORLD.height - cell.radius);
    cell.visualX = lerp(cell.visualX, cell.x, 1 - Math.pow(.00001, delta));
    cell.visualY = lerp(cell.visualY, cell.y, 1 - Math.pow(.00001, delta));
    cell.mass = lerp(cell.mass, cell.targetMass, 1 - Math.pow(.0001, delta));
    cell.decayNotice -= delta;
    cell.radius = radiusForMass(cell.mass);
    cell.visualRadius = lerp(cell.visualRadius, radiusForMass(cell.targetMass), 1 - Math.pow(.00001, delta));
    applyFood(cell);
    if (cell.evolution > 1) cell.health = Math.min(100, cell.health + (cell.evolution - 1) * .8 * delta);
    if (applyGasDamage(cell, delta) || applyHazardDamage(cell, delta)) continue;
  }
  updateMothercells(delta); mergePlayerPieces(now); updateEjected(delta); updateEffects(delta); consumeCells();
  const focus = gameState === 'playing' && player.controlledCell ? player.controlledCell : spectatorFocus && ownedCells(spectatorFocus)[0] ? centroid(spectatorFocus) : centroid(player); if (gameState === 'spectator' && spectatorFree) clampCameraToArena(); else { camera.x = focus.x; camera.y = focus.y; } const totalMass = ownedCells(player).reduce((sum, cell) => sum + cell.targetMass, 0); match.peakMass = Math.max(match.peakMass, totalMass); camera.zoom = gameState === 'spectator' && spectatorFree ? camera.zoom : clamp(1.05 - Math.sqrt(Math.max(0, totalMass)) / 1200, .62, 1.05); updateUi(totalMass, gasPhase);
}
function updateUi(totalMass, gasPhase = { phase: 'safe', remaining: 0 }) {
  const livingBots = bots.filter((bot) => ownedCells(bot).length);
  const controlledHealth = player.controlledCell ? Math.ceil(player.controlledCell.health) : 0;
  const seconds = Math.max(0, Math.ceil(gasPhase.remaining));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  massValue.textContent = Math.floor(totalMass); scoreMass.textContent = Math.floor(totalMass); healthValue.textContent = `${controlledHealth}%`; streakValue.textContent = player.streak; evolutionValue.textContent = ['I', 'II', 'III', 'IV', 'V'][player.evolution - 1]; eatenValue.textContent = player.eaten; massProgress.style.width = `${Math.min(100, 5 + totalMass / 2)}%`; statusText.textContent = `${livingBots.length} rivals in arena${player.betrayalUntil > performance.now() / 1000 ? ' · HUNTED' : ''}${weather.type !== 'clear' ? ` · ${weather.type.toUpperCase()}` : ''}`; gasStatus.textContent = pendingAllianceOffer ? `Alliance from ${pendingAllianceOffer.from.name}` : gasPhase.phase === 'safe' ? `Gas starts in ${clock}` : gasPhase.phase === 'shrinking' ? `Gas advances ${clock}` : gasPhase.phase === 'pause' ? `Gas pauses ${clock}` : 'Gas settled'; allianceButton.textContent = pendingAllianceOffer ? 'Accept alliance' : 'Offer alliance'; allianceRejectButton.hidden = !pendingAllianceOffer;
  const rankings = [player, ...livingBots].map((owner) => ({ owner, mass: ownedCells(owner).reduce((sum, cell) => sum + cell.targetMass, 0) })).sort((first, second) => second.mass - first.mass).slice(0, 10);
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
function drawPoisonGas() {
  if (arena.left <= 0) return;
  context.save(); context.fillStyle = 'rgba(155, 191, 77, .16)';
  context.fillRect(0, 0, WORLD.width, arena.top); context.fillRect(0, arena.bottom, WORLD.width, WORLD.height - arena.bottom);
  context.fillRect(0, arena.top, arena.left, arena.bottom - arena.top); context.fillRect(arena.right, arena.top, WORLD.width - arena.right, arena.bottom - arena.top);
  context.strokeStyle = 'rgba(207, 238, 112, .72)'; context.lineWidth = 8; context.strokeRect(arena.left, arena.top, arena.right - arena.left, arena.bottom - arena.top); context.restore();
}
function drawArenaFeatures() {
  context.save();
  for (const obstacle of obstacles) { context.fillStyle = 'rgba(73, 112, 128, .34)'; context.strokeStyle = 'rgba(129, 214, 218, .7)'; context.lineWidth = 6; if (obstacle.radius) { context.beginPath(); context.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2); context.arc(obstacle.x, obstacle.y, obstacle.radius * .43, 0, Math.PI * 2, true); context.fill('evenodd'); context.stroke(); } else { context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height); context.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height); } }
  for (const hazard of hazards) { const glow = 1 + Math.sin(hazard.pulse) * .12; context.fillStyle = '#ff6b61'; context.shadowColor = '#ff6b61'; context.shadowBlur = 22; context.beginPath(); context.arc(hazard.x, hazard.y, hazard.radius * glow, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; }
  for (const current of currents) { context.strokeStyle = 'rgba(112, 231, 255, .35)'; context.lineWidth = 3; context.beginPath(); context.arc(current.x, current.y, current.radius, 0, Math.PI * 2); context.stroke(); context.beginPath(); context.moveTo(current.x, current.y); context.lineTo(current.x + current.vx * 2, current.y + current.vy * 2); context.stroke(); }
  for (const blackhole of blackholes) { context.fillStyle = '#24153d'; context.shadowColor = '#d390ff'; context.shadowBlur = 24; context.beginPath(); context.arc(blackhole.x, blackhole.y, blackhole.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; context.strokeStyle = '#d390ff'; context.lineWidth = 4; context.stroke(); }
  for (const portal of portals) { context.strokeStyle = '#70a7ff'; context.lineWidth = 5; context.beginPath(); context.arc(portal.x, portal.y, portal.radius + Math.sin(performance.now() / 160) * 4, 0, Math.PI * 2); context.stroke(); }
  const elapsed = gameState === 'playing' ? (performance.now() - match.startedAt) / 1000 : 0; const cycleElapsed = Math.max(0, elapsed - SHRINK_DELAY); const cycle = Math.min(SHRINK_CYCLES, Math.floor(cycleElapsed / (SHRINK_PHASE + SHRINK_PAUSE)) + 1); const predictedInset = Math.min(WORLD.width, WORLD.height) * .45 * cycle / SHRINK_CYCLES; context.setLineDash([18, 14]); context.strokeStyle = 'rgba(255, 211, 78, .78)'; context.lineWidth = 5; context.strokeRect(predictedInset, predictedInset, WORLD.width - predictedInset * 2, WORLD.height - predictedInset * 2); context.setLineDash([]); context.restore();
}
function drawMothercell(mother) { context.save(); context.translate(mother.x, mother.y); const pulse = 1 + Math.sin(mother.pulse) * .04; context.scale(pulse, pulse); context.beginPath(); context.fillStyle = '#ff70d9'; context.shadowColor = '#ff70d9'; context.shadowBlur = 28; context.arc(0, 0, mother.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; context.strokeStyle = 'rgba(255,222,249,.8)'; context.lineWidth = 3; context.stroke(); context.restore(); }
function drawPowerup(orb) { const colors = { speed: '#ffcf5c', magnet: '#6de7ff', merge: '#d390ff' }; context.save(); context.translate(orb.x, orb.y); context.rotate(orb.pulse); context.fillStyle = colors[orb.type]; context.shadowColor = colors[orb.type]; context.shadowBlur = 18; context.beginPath(); context.moveTo(0, -orb.radius); context.lineTo(orb.radius, 0); context.lineTo(0, orb.radius); context.lineTo(-orb.radius, 0); context.closePath(); context.fill(); context.restore(); orb.pulse += .012; }
function drawCell(cell) {
  context.save(); context.globalAlpha = cell.invisible > 0 ? .2 : 1; context.beginPath(); context.arc(cell.visualX, cell.visualY, cell.visualRadius, 0, Math.PI * 2); context.clip();
  context.fillStyle = cell.color; context.shadowColor = cell.color; context.shadowBlur = cell.owner === player ? 30 : 16; context.fillRect(cell.visualX - cell.visualRadius, cell.visualY - cell.visualRadius, cell.visualRadius * 2, cell.visualRadius * 2); context.shadowBlur = 0;
  if (cell.skin === 'planet') { const planet = context.createRadialGradient(cell.visualX - cell.visualRadius * .35, cell.visualY - cell.visualRadius * .4, 1, cell.visualX, cell.visualY, cell.visualRadius); planet.addColorStop(0, 'rgba(255,255,255,.85)'); planet.addColorStop(.18, 'rgba(255,255,255,.12)'); planet.addColorStop(1, 'rgba(0,0,0,.5)'); context.fillStyle = planet; context.fillRect(cell.visualX - cell.visualRadius, cell.visualY - cell.visualRadius, cell.visualRadius * 2, cell.visualRadius * 2); context.strokeStyle = 'rgba(255,255,255,.5)'; context.lineWidth = 2; context.beginPath(); context.ellipse(cell.visualX, cell.visualY, cell.visualRadius * .9, cell.visualRadius * .23, -.3, 0, Math.PI * 2); context.stroke(); }
  if (cell.skin === 'geometry') { context.strokeStyle = 'rgba(255,255,255,.62)'; context.lineWidth = Math.max(2, cell.visualRadius * .08); context.beginPath(); context.moveTo(cell.visualX, cell.visualY - cell.visualRadius); context.lineTo(cell.visualX + cell.visualRadius, cell.visualY); context.lineTo(cell.visualX, cell.visualY + cell.visualRadius); context.lineTo(cell.visualX - cell.visualRadius, cell.visualY); context.closePath(); context.stroke(); }
  context.restore(); context.globalAlpha = cell.invisible > 0 ? .2 : 1; context.beginPath(); context.strokeStyle = cell.owner === player ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.35)'; context.lineWidth = cell.owner === player ? 3 : 2; context.arc(cell.visualX, cell.visualY, cell.visualRadius - 1, 0, Math.PI * 2); context.stroke(); if (cell === selectedCell) { context.beginPath(); context.strokeStyle = '#ffcc66'; context.lineWidth = 4; context.arc(cell.visualX, cell.visualY, cell.visualRadius + 6, 0, Math.PI * 2); context.stroke(); } context.fillStyle = '#fff'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = `600 ${Math.max(10, cell.visualRadius * .3)}px Space Grotesk, sans-serif`; context.shadowColor = 'rgba(0,0,0,.35)'; context.shadowBlur = 5; context.fillText(cell.name, cell.visualX, cell.visualY); context.shadowBlur = 0; context.globalAlpha = 1;
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
function cellAtAnyScreenPoint(clientX, clientY) { const worldX = camera.x + (clientX - innerWidth / 2) / camera.zoom; const worldY = camera.y + (clientY - innerHeight / 2) / camera.zoom; return cells.slice().reverse().find((cell) => cell.owner !== player && Math.hypot(worldX - cell.x, worldY - cell.y) <= cell.visualRadius / camera.zoom); }
function draw() {
  const width = innerWidth; const height = innerHeight; const theme = document.body.dataset.theme || 'dark'; const background = theme === 'light' ? '#dfeadd' : theme === 'retro' ? '#160d28' : '#071019'; context.clearRect(0, 0, width, height); context.fillStyle = background; context.fillRect(0, 0, width, height); const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * .72); glow.addColorStop(0, theme === 'light' ? 'rgba(135, 183, 137, .3)' : theme === 'retro' ? 'rgba(121, 52, 152, .28)' : 'rgba(22, 55, 60, .42)'); glow.addColorStop(1, 'rgba(7, 16, 25, 0)'); context.fillStyle = glow; context.fillRect(0, 0, width, height);
  context.save(); context.translate(width / 2, height / 2); context.scale(camera.zoom, camera.zoom); context.translate(-camera.x, -camera.y); drawGrid(width, height); drawPoisonGas(); drawArenaFeatures(); context.strokeStyle = 'rgba(168, 243, 109, .55)'; context.lineWidth = 12; context.strokeRect(arena.left, arena.top, arena.right - arena.left, arena.bottom - arena.top);
  for (const pellet of food) { context.beginPath(); context.fillStyle = pellet.color; context.shadowColor = pellet.color; context.shadowBlur = pellet.legendary ? 24 : 10; context.arc(pellet.x, pellet.y, pellet.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; }
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
allianceButton.addEventListener('click', (event) => { event.stopPropagation(); if (pendingAllianceOffer) acceptAlliance(); else offerPlayerAlliance(); });
allianceRejectButton.addEventListener('click', (event) => { event.stopPropagation(); rejectAlliance(); });
betrayButton.addEventListener('click', (event) => { event.stopPropagation(); betrayAlliances(); });
let lastTouchAt = 0;
addEventListener('resize', resize); addEventListener('pointermove', (event) => { if (gameState === 'spectator' && spectatorDrag) { camera.x -= (event.clientX - previousPointer.x) / camera.zoom; camera.y -= (event.clientY - previousPointer.y) / camera.zoom; spectatorFocus = null; spectatorFree = true; } pointer.x = event.clientX; pointer.y = event.clientY; previousPointer = { x: event.clientX, y: event.clientY }; pointer.active = true; }); addEventListener('pointerdown', (event) => { if (event.target.closest('button, input, select')) return; pointer.x = event.clientX; pointer.y = event.clientY; previousPointer = { x: event.clientX, y: event.clientY }; pointer.active = true; if (gameState === 'spectator') spectatorDrag = true; if (gameState === 'playing' && event.pointerType !== 'touch') { const clicked = cellAtScreenPoint(event.clientX, event.clientY); if (clicked) { if (selectedCell && selectedCell !== clicked) mergeSelectedCell(performance.now() / 1000); else selectedCell = clicked; } else { const bot = cellAtAnyScreenPoint(event.clientX, event.clientY); if (bot) offerAlliance(player, bot.owner); } } if (event.pointerType === 'touch' && performance.now() - lastTouchAt < 350) splitPlayer(); lastTouchAt = performance.now(); }); addEventListener('pointerup', () => { spectatorDrag = false; }); addEventListener('pointerleave', () => { pointer.active = false; spectatorDrag = false; });
addEventListener('wheel', (event) => { if (gameState !== 'spectator') return; event.preventDefault(); camera.zoom = clamp(camera.zoom * (event.deltaY > 0 ? .9 : 1.1), .35, 2.2); spectatorFocus = null; spectatorFree = true; }, { passive: false });
addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    splitPlayer();
  }
  if (event.code === 'KeyW') { event.preventDefault(); ejectMass(); }
  if (event.code === 'KeyM') { event.preventDefault(); mergeSelectedCell(performance.now() / 1000); }
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') { event.preventDefault(); dashCell(player.controlledCell); }
});
resize(); resetPlayer(); setupBots(); updateUi(12); requestAnimationFrame(frame);
