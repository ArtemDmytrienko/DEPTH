// ============================================================
// boss.js — бой с финальным боссом "Хранитель бездны": запуск
// при достижении BOSS_TRIGGER_DEPTH, паттерны атак, победа/поражение.
// ============================================================

function triggerBossFall(){
  running = false;
  bossMode = true;
  boss = {
    hp: BOSS_DEF.maxHp, maxHp: BOSS_DEF.maxHp,
    x: Math.floor(COLS/2), y: 5,
    state:'idle', stateUntil: performance.now()+1000,
    attackTelegraphed:false
  };
  player.x = Math.floor(COLS/2)-3; player.y = 8;
  document.getElementById('bossName').textContent = BOSS_DEF.name;
  document.getElementById('bossHudWrap').classList.remove('hidden');
  updateBossHud();
}

function updateBossHud(){
  const pct = Math.max(0, (boss.hp/boss.maxHp)*100);
  document.getElementById('bossHpFill').style.width = pct+'%';
}

function winBossFight(){
  bossMode = false;
  bossDefeatedFlag = true;
  save.bank += ore;
  writeSave();
  document.getElementById('bossHudWrap').classList.add('hidden');
  document.getElementById('cDepth').textContent = depth;
  document.getElementById('cOre').textContent = ore;
  document.getElementById('creditsOverlay').classList.add('show');
}

function loseBossFight(){
  bossMode = false;
  die();
}

function updateBoss(){
  if(!boss) return;
  const now = performance.now();
  if(now < boss.stateUntil) return;
  if(boss.state === 'idle'){
    const pattern = Math.random();
    if(pattern < 0.4){ boss.state = 'telegraph-swipe'; boss.stateUntil = now+600; }
    else if(pattern < 0.75){ boss.state = 'telegraph-slam'; boss.stateUntil = now+900; }
    else { boss.state = 'telegraph-throw'; boss.stateUntil = now+700; }
    boss.targetX = player.x; boss.targetY = player.y;
  } else if(boss.state === 'telegraph-swipe'){
    boss.state = 'attack-swipe'; boss.stateUntil = now+250;
    if(Math.abs(boss.x-player.x)<=2 && Math.abs(boss.y-player.y)<=1) damagePlayer(BOSS_DEF.dmg);
  } else if(boss.state === 'telegraph-slam'){
    boss.state = 'attack-slam'; boss.stateUntil = now+250;
    if(boss.targetX === player.x) damagePlayer(BOSS_DEF.dmg);
  } else if(boss.state === 'telegraph-throw'){
    boss.state = 'attack-throw'; boss.stateUntil = now+250;
    if(Math.abs(boss.targetX-player.x)<=1) damagePlayer(BOSS_DEF.dmg);
  } else {
    boss.state = 'idle'; boss.stateUntil = now+1000+Math.random()*600;
    // босс слегка смещается по горизонтали к игроку между атаками
    if(boss.x < player.x) boss.x++; else if(boss.x > player.x) boss.x--;
    boss.x = Math.max(1, Math.min(COLS-2, boss.x));
  }
  updateBossHud();
}
