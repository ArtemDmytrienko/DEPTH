// input.js — керування з клавиатури, рух та копання гравця.
//
// Керування:
//   W A SD  — ходьба / копання (вгору, вниз, вліво, вправо)
//   J       — атака
//   Стрілки та ПРОБІЛ теж працюють — дублюють WASD і J,
//   щоб гра була зручною і для тих, хто звик до стрілок.
//   ESC     — повернутися на поверхню (під час забігу)
//
// Усі клавіші переводяться в нижній регістр (e.key.toLowerCase()),
// тому стан CapsLock не має значення.

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

// true, якщо затиснута будь-яка з клавіш, що відповідають за вказаний напрямок/дію
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
  if(monsterAt(nx, ny)) return; // не можна пройти крізь монстра — потрібно атакувати
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
    // шанс засідки зростає з глибиною
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
    // копаємо
    const info = TILE_INFO[t];
    const dt = digTimeFor(info.hardness);
    // instant-dig модель: даємо затримку за часом + витрачаємо кисень, потім очищаємо тайл
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
    // шанс зустріти монстра у порожнині, що відкрилася
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
