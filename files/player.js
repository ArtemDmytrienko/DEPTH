// ============================================================
// player.js — состояние текущего забега (позиция, кислород,
// руда, HP) и формулы, которые переводят уровни апгрейдов
// из магазина в реальные игровые цифры (скорость, урон и т.д.)
// ============================================================

let player, oxygen, maxOxygen, ore, depth, digTimer, digTarget, running;
let particles = [];
let hp = MAX_HEARTS;
let invulnUntil = 0;
let lastAttackAt = 0;
let bossMode = false;
let boss = null;
let bossDefeatedFlag = false;

function maxOxygenFor(){ return 60 + save.upgrades.oxygen * 8; }
function digTimeFor(hardness){
  const speedLvl = save.upgrades.digSpeed;
  const base = 220 * hardness;
  return Math.max(45, base - speedLvl*9);
}
function moveTimeFor(){
  return Math.max(55, 150 - save.upgrades.moveSpeed*5);
}
function oreValueMultiplier(){ return 1 + save.upgrades.oreValue * 0.04; }
function lightRadiusFor(){ return 140 + save.upgrades.lightRadius * 6; }
function oxygenDrainRate(){ return 0.045 * (1 - Math.min(0.6, save.upgrades.oxyEff * 0.03)); }

function startRun(){
  seed = Math.floor(Math.random()*1e9);
  world.clear();
  player = { x: Math.floor(COLS/2), y: 0, px:0, py:0, facing:1 }; // px/py = пиксельный offset для плавной анимации
  updatePixelPos(true);
  maxOxygen = maxOxygenFor();
  oxygen = maxOxygen;
  ore = 0;
  depth = 0;
  digTarget = null; digTimer = 0;
  running = true;
  lastMoveAt = 0;
  hp = MAX_HEARTS;
  invulnUntil = 0;
  monsters = [];
  bossMode = false;
  boss = null;
  bossDefeatedFlag = false;
  document.getElementById('bossHudWrap').classList.add('hidden');
  updateWeaponHud();
  hideOverlays();
}

function updatePixelPos(instant){
  const targetPx = player.x * TILE;
  const targetPy = (VISIBLE_ROWS>>1) * TILE; // игрок всегда в центре по вертикали, мир скроллится
  if(instant){ player.px = targetPx; player.py = targetPy; }
}

// camera offset in rows so that player.y maps near center
function cameraTopRow(){ return player.y - (VISIBLE_ROWS>>1); }

function spendOxygen(amt){
  oxygen = Math.max(0, oxygen - amt);
  if(oxygen <= 0 && running){ die(); }
}

function spawnParticles(x,y,color){
  for(let i=0;i<6;i++){
    particles.push({
      x: x*TILE + TILE/2, y: y*TILE + TILE/2,
      vx: (Math.random()-0.5)*3, vy: (Math.random()-1.2)*3,
      life: 1, color
    });
  }
}

function updateParticles(){
  particles.forEach(p=>{
    p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.04;
  });
  particles = particles.filter(p=>p.life>0);
}
