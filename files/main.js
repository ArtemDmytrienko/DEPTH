// ============================================================
// main.js — главный игровой цикл и запуск игры. Этот файл
// должен подключаться В INDEX.HTML ПОСЛЕДНИМ: он использует
// функции и переменные из всех остальных файлов.
// ============================================================

function tick(){
  if(running){
    if(keyLeft())   attemptMove(-1,0);
    if(keyRight())  attemptMove(1,0);
    if(keyDown())   attemptMove(0,1);
    if(keyUp())     attemptMove(0,-1);
    if(keyAttack()) attemptAttack();

    // пассивный расход кислорода
    oxygen = Math.max(0, oxygen - oxygenDrainRate());
    if(oxygen <= 0) die();

    // автовосстановление на поверхности
    if(player.y === 0) oxygen = Math.min(maxOxygen, oxygen + 0.3);

    updateMonsters();
    updateParticles();
    updateHud();
    updateHeartsHud();
  } else if(bossMode){
    if(keyLeft())   attemptArenaMove(-1,0);
    if(keyRight())  attemptArenaMove(1,0);
    if(keyUp())     attemptArenaMove(0,-1);
    if(keyDown())   attemptArenaMove(0,1);
    if(keyAttack()) attemptAttack();
    updateBoss();
    updateParticles();
    updateHeartsHud();
  }
  draw();
  requestAnimationFrame(tick);
}

// ---------- Запуск ----------
renderShop();
running = false;
player = {x:Math.floor(COLS/2), y:0, facing:1};
ore = 0; oxygen = maxOxygenFor(); maxOxygen = maxOxygenFor(); depth = 0;
updateHeartsHud();
updateWeaponHud();
requestAnimationFrame(tick);
