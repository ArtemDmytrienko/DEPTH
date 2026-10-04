// ============================================================
// input.js — клавиатура и движение/копание игрока.
//
// Управление:
//   W A S D   — ходьба / копание вверх-вниз-влево-вправо
//   J         — атака
//   стрелки и ПРОБЕЛ тоже работают — дублируют WASD и J,
//   чтобы игра была удобна и тем, кто привык к стрелкам
//   ESC       — вернуться на поверхность (во время забега)
//
// Все клавиши приводятся к нижнему регистру (e.key.toLowerCase()),
// поэтому не важно, зажат CapsLock или нет.
// ============================================================

const keys = {};
let lastMoveAt = 0;

const TRACKED_KEYS = [
  'arrowleft','arrowright','arrowup','arrowdown',
  'w','a','s','d','j',' ','escape'
];

window.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  if(TRACKED_KEYS.includes(k)) e.preventDefault();
  keys[k] = true;
  if(k === 'escape' && running && !bossMode){ returnToSurfaceInstant(); }
});
window.addEventListener('keyup', e=>{
  keys[e.key.toLowerCase()] = false;
});

// true, если зажата любая из клавиш, отвечающих за данное направление/действие
function keyLeft(){  return keys['a'] || keys['arrowleft']; }
function keyRight(){ return keys['d'] || keys['arrowright']; }
function keyUp(){    return keys['w'] || keys['arrowup']; }
function keyDown(){  return keys['s'] || keys['arrowdown']; }
function keyAttack(){return keys['j'] || keys[' ']; }

function attemptMove(dx, dy){
  const now = performance.now();
  if(now - lastMoveAt < moveTimeFor()) return;
  if(dx !== 0) player.facing = dx > 0 ? 1 : -1;
  const nx = player.x + dx, ny = player.y + dy;
  if(nx < 0 || nx >= COLS) return;
  if(ny < 0) return;
  if(monsterAt(nx, ny)) return; // нельзя пройти сквозь монстра — нужно атаковать
  const t = getTile(nx, ny);
  if(t === TILES.EMPTY){
    player.x = nx; player.y = ny;
    lastMoveAt = now;
    spendOxygen(0.6);
  } else if(t === TILES.CHEST){
    const dt = digTimeFor(TILE_INFO[t].hardness);
    if(now - lastMoveAt < dt) return;
    setTile(nx, ny, TILES.EMPTY);
    const bonus = Math.round((80 + player.y*2) * oreValueMultiplier());
    ore += bonus;
    spawnParticles(nx, ny, '#e8a33d');
    // шанс засады растёт с глубиной
    if(Math.random() < Math.min(0.55, 0.15 + player.y*0.003)){
      const count = player.y > 70 ? 2 : 1;
      for(let i=0;i<count;i++){
        const mx = Math.max(0, Math.min(COLS-1, nx + (Math.random()<0.5?-1:1)));
        spawnMonster(pickMonsterType(), mx, ny);
      }
    }
    lastMoveAt = now;
    spendOxygen(1.1);
    depth = Math.max(depth, player.y);
  } else {
    // копаем
    const info = TILE_INFO[t];
    const dt = digTimeFor(info.hardness);
    // instant-dig модель: даём задержку по времени + тратим кислород, потом очищаем тайл
    if(now - lastMoveAt < dt) return;
    setTile(nx, ny, TILES.EMPTY);
    if(info.value > 0){
      ore += Math.round(info.value * oreValueMultiplier());
      spawnParticles(nx, ny, info.gem || info.color);
    } else {
      spawnParticles(nx, ny, info.color);
    }
    lastMoveAt = now;
    spendOxygen(1.1);
    depth = Math.max(depth, player.y);
    // шанс встретить монстра в открывшейся полости
    if(Math.random() < monsterChanceForDepth()){
      spawnMonster(pickMonsterType(), nx, ny);
    }
    if(player.y >= BOSS_TRIGGER_DEPTH && !bossDefeatedFlag && running){
      triggerBossFall();
    }
  }
}

function attemptArenaMove(dx,dy){
  const now = performance.now();
  if(now - lastMoveAt < moveTimeFor()) return;
  if(dx !== 0) player.facing = dx > 0 ? 1 : -1;
  const nx = player.x+dx, ny = player.y+dy;
  if(nx < 0 || nx >= COLS) return;
  if(ny < 2 || ny >= VISIBLE_ROWS-1) return;
  player.x = nx; player.y = ny;
  lastMoveAt = now;
}
