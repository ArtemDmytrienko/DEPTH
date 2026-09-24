(() => {
  // ---------- Constants ----------
  const TILE = 32;
  const COLS = 12;
  const VISIBLE_ROWS = 13;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = COLS * TILE;
  canvas.height = VISIBLE_ROWS * TILE;

  const TILES = {
    EMPTY: 0, DIRT: 1, STONE: 2, COAL: 3, IRON: 4, GOLD: 5, DIAMOND: 6,
    EMERALD: 7, RUBY: 8, SAPPHIRE: 9, MYTHRIL: 10, CHEST: 11
  };
  const TILE_INFO = {
    [TILES.DIRT]:     { color:'#4a3529', hardness:1, value:0,  name:'земля' },
    [TILES.STONE]:    { color:'#3d3440', hardness:2, value:0,  name:'камень' },
    [TILES.COAL]:     { color:'#2c2a2e', hardness:2, value:8,  name:'уголь',    gem:'#1a1a1a' },
    [TILES.IRON]:     { color:'#5a4a3a', hardness:3, value:20, name:'железо',   gem:'#c9b18a' },
    [TILES.GOLD]:     { color:'#4a3a2a', hardness:4, value:55, name:'золото',   gem:'#e8c04d' },
    [TILES.DIAMOND]:  { color:'#3a3a4a', hardness:5, value:140,name:'алмаз',    gem:'#8fe8e0' },
    [TILES.EMERALD]:  { color:'#2a3a30', hardness:6, value:260,name:'изумруд',  gem:'#3fd97a', minDepth:60 },
    [TILES.RUBY]:     { color:'#3a2228', hardness:6, value:320,name:'рубин',    gem:'#e8395f', minDepth:80 },
    [TILES.SAPPHIRE]: { color:'#20263c', hardness:7, value:420,name:'сапфир',   gem:'#4d8fe8', minDepth:105 },
    [TILES.MYTHRIL]:  { color:'#332440', hardness:8, value:650,name:'мифрил',   gem:'#c98fe8', minDepth:140 },
    [TILES.CHEST]:    { color:'#6b4a2a', hardness:3, value:0,  name:'сундук',   minDepth:14, isChest:true },
  };

  // ---------- Persistent bank / upgrades ----------
  const SAVE_KEY = 'depth_save_v1';
  // ---------- Weapons ----------
  const WEAPON_DEFS = {
    pickaxe: { name:'Кирка',    dmg:8,  cooldown:400, cost:0,   maxLvl:10, dmgPerLvl:0.9, upBase:24, upMult:1.28 },
    daggers: { name:'Кинжалы',  dmg:6,  cooldown:220, cost:180, maxLvl:10, dmgPerLvl:0.7, upBase:26, upMult:1.28 },
    sword:   { name:'Меч',      dmg:14, cooldown:500, cost:320, maxLvl:10, dmgPerLvl:1.6, upBase:32, upMult:1.30 },
    hammer:  { name:'Молот',    dmg:26, cooldown:900, cost:600, maxLvl:10, dmgPerLvl:2.8, upBase:40, upMult:1.32 },
  };
  function weaponDamage(key){
    const def = WEAPON_DEFS[key];
    const lvl = save.weapons.levels[key] || 0;
    return Math.round(def.dmg + def.dmgPerLvl * lvl);
  }
  function weaponUpgradeCost(key){
    const def = WEAPON_DEFS[key];
    const lvl = save.weapons.levels[key] || 0;
    return Math.round(def.upBase * Math.pow(def.upMult, lvl));
  }
  function equippedWeaponKey(){ return save.weapons.equipped || 'pickaxe'; }

  // ---------- Monsters ----------
  const MONSTER_DEFS = {
    goblin:    { name:'Гоблин',       color:'#4a7a3a', dark:'#2f5227', baseHp:22, hpPerDepth:0.35, dmg:1, moveMs:420, atkMs:800, minDepth:16, dropOre:6 },
    deadMiner: { name:'Мёртвый шахтёр', color:'#5a5a62', dark:'#33333a', baseHp:42, hpPerDepth:0.55, dmg:1, moveMs:560, atkMs:1000, minDepth:45, dropOre:14 },
  };
  let monsters = [];
  function spawnMonster(type, x, y){
    const def = MONSTER_DEFS[type];
    const hp = Math.round(def.baseHp + def.hpPerDepth * player.y);
    monsters.push({ type, x, y, hp, maxHp:hp, lastMove:0, lastAttack:0 });
  }
  function monsterChanceForDepth(){
    // общий шанс появления монстра при копании, растёт с глубиной
    if(player.y < MONSTER_DEFS.goblin.minDepth) return 0;
    return Math.min(0.10, 0.01 + player.y*0.0009);
  }
  function pickMonsterType(){
    if(player.y >= MONSTER_DEFS.deadMiner.minDepth && Math.random() < 0.4) return 'deadMiner';
    return 'goblin';
  }

  function loadSave(){
    try{
      const raw = localStorage.getItem(SAVE_KEY);
      if(raw){
        const s = JSON.parse(raw);
        for(const k in UPGRADE_DEFS){ if(!(k in s.upgrades)) s.upgrades[k] = 0; }
        if(!s.weapons) s.weapons = { unlocked:{pickaxe:true}, equipped:'pickaxe', levels:{} };
        for(const k in WEAPON_DEFS){ if(!(k in s.weapons.levels)) s.weapons.levels[k] = 0; }
        if(!s.weapons.unlocked) s.weapons.unlocked = {pickaxe:true};
        s.weapons.unlocked.pickaxe = true;
        return s;
      }
    }catch(e){}
    const upgrades = {};
    for(const k in UPGRADE_DEFS) upgrades[k] = 0;
    const levels = {};
    for(const k in WEAPON_DEFS) levels[k] = 0;
    return { bank:0, upgrades, weapons:{ unlocked:{pickaxe:true}, equipped:'pickaxe', levels } };
  }
  function writeSave(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }

  // Растянутая кривая: max:20 у всех, mult ~1.3 => к 20 уровню цена в ~190 раз больше базовой.
  // Итого полная прокачка одной ветки — тысячи ₴, всех шести — десятки тысяч. Это надолго.
  const UPGRADE_DEFS = {
    oxygen:     { name:'Баллон кислорода',   desc:'+8 макс. O2 за уровень',        base:22, mult:1.30, max:20 },
    digSpeed:   { name:'Прочность кирки',    desc:'Быстрее копать',                base:26, mult:1.30, max:20 },
    moveSpeed:  { name:'Ботинки шахтёра',    desc:'Быстрее ходьба',                base:20, mult:1.30, max:20 },
    luck:       { name:'Чутьё на руду',      desc:'Больше ценной руды в породе',   base:32, mult:1.32, max:20 },
    oreValue:   { name:'Оценка руды',        desc:'+4% ценности добычи за уровень',base:28, mult:1.31, max:20 },
    lightRadius:{ name:'Фонарь',             desc:'Шире радиус света',             base:18, mult:1.28, max:20 },
    oxyEff:     { name:'Дыхательная техника',desc:'Медленнее расход O2 со временем',base:30, mult:1.33, max:20 },
  };
  let save = loadSave();
  function upgradeCost(key){
    const lvl = save.upgrades[key];
    const def = UPGRADE_DEFS[key];
    return Math.round(def.base * Math.pow(def.mult, lvl));
  }

  // ---------- World generation (deterministic per run seed) ----------
  let seed = Math.floor(Math.random()*1e9);
  function hash(x, y){
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return ((h >>> 0) % 10000) / 10000;
  }
  const world = new Map(); // "x,y" -> tile id
  function key(x,y){ return x+','+y; }

  function genTile(x, y){
    if(y <= 0) return TILES.EMPTY; // surface row is always open
    const r = hash(x,y);
    const depthFactor = Math.min(y / 160, 1); // 0 near surface -> 1 very deep
    const luckBoost = save.upgrades.luck * 0.005;

    // глубинные руды появляются только начиная со своего minDepth,
    // и чем глубже за порогом — тем выше шанс
    const mythrilP  = y >= TILE_INFO[TILES.MYTHRIL].minDepth  ? 0.006 + (y-140)*0.0007 + luckBoost*0.15 : 0;
    const sapphireP = y >= TILE_INFO[TILES.SAPPHIRE].minDepth ? 0.010 + (y-105)*0.0006 + luckBoost*0.2  : 0;
    const rubyP     = y >= TILE_INFO[TILES.RUBY].minDepth     ? 0.014 + (y-80)*0.0005  + luckBoost*0.25 : 0;
    const emeraldP  = y >= TILE_INFO[TILES.EMERALD].minDepth  ? 0.018 + (y-60)*0.0004  + luckBoost*0.3  : 0;
    const chestP    = y >= TILE_INFO[TILES.CHEST].minDepth    ? 0.006 : 0;

    // ore thresholds shift with depth + luck
    const diamondP = 0.01 + depthFactor*0.05 + luckBoost*0.4;
    const goldP    = 0.02 + depthFactor*0.07 + luckBoost*0.6;
    const ironP    = 0.05 + depthFactor*0.10 + luckBoost*0.8;
    const coalP    = 0.08 + depthFactor*0.06 + luckBoost;
    const stoneP   = 0.25 + depthFactor*0.30;

    let acc = 0;
    if(r < (acc += mythrilP))  return TILES.MYTHRIL;
    if(r < (acc += sapphireP)) return TILES.SAPPHIRE;
    if(r < (acc += rubyP))     return TILES.RUBY;
    if(r < (acc += emeraldP))  return TILES.EMERALD;
    if(r < (acc += chestP))    return TILES.CHEST;
    if(r < (acc += diamondP)) return TILES.DIAMOND;
    if(r < (acc += goldP))    return TILES.GOLD;
    if(r < (acc += ironP))    return TILES.IRON;
    if(r < (acc += coalP))    return TILES.COAL;
    if(r < (acc += stoneP))   return TILES.STONE;
    return TILES.DIRT;
  }
  function getTile(x,y){
    const k = key(x,y);
    if(!world.has(k)) world.set(k, genTile(x,y));
    return world.get(k);
  }
  function setTile(x,y,v){ world.set(key(x,y), v); }

  // ---------- Player / run state ----------
  let player, oxygen, maxOxygen, ore, depth, digTimer, digTarget, running;
  let particles = [];
  const MAX_HEARTS = 5;
  let hp = MAX_HEARTS;
  let invulnUntil = 0;
  let lastAttackAt = 0;
  let bossMode = false;
  let boss = null;
  let bossDefeatedFlag = false;
  const BOSS_TRIGGER_DEPTH = 100;

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
    player = { x: Math.floor(COLS/2), y: 0, px:0, py:0, facing:1 }; // px/py = pixel offset for smooth anim
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
    const targetPy = (VISIBLE_ROWS>>1) * TILE; // player stays vertically centered; world scrolls
    if(instant){ player.px = targetPx; player.py = targetPy; }
  }

  // camera offset in rows so that player.y maps near center
  function cameraTopRow(){ return player.y - (VISIBLE_ROWS>>1); }

  // ---------- Input / movement ----------
  const keys = {};
  let lastMoveAt = 0;
  window.addEventListener('keydown', e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
    keys[e.key] = true;
    if(e.key === 'Escape' && running && !bossMode){ returnToSurfaceInstant(); }
  });
  window.addEventListener('keyup', e=>{ keys[e.key] = false; });

  function monsterAt(x,y){
    return monsters.find(m => m.x===x && m.y===y);
  }

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
      // dig
      const info = TILE_INFO[t];
      const dt = digTimeFor(info.hardness);
      // instant-dig model: costs a bit more oxygen & time gate, then clears tile
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

  function attemptAttack(){
    const now = performance.now();
    const wKey = equippedWeaponKey();
    const wDef = WEAPON_DEFS[wKey];
    if(now - lastAttackAt < wDef.cooldown) return;
    const dmg = weaponDamage(wKey);
    if(bossMode && boss){
      if(Math.abs(boss.x - player.x) <= 1 && Math.abs(boss.y - player.y) <= 1){
        lastAttackAt = now;
        boss.hp = Math.max(0, boss.hp - dmg);
        spawnParticles(boss.x, boss.y, '#e8395f');
        if(boss.hp <= 0){ winBossFight(); }
      }
      return;
    }
    // проверяем всех монстров впритык к игроку (влево/вправо/вверх/вниз),
    // сначала там, куда смотрит персонаж, иначе - ближайшего из остальных
    const dirs = [
      [player.facing, 0], [-player.facing, 0], [0, -1], [0, 1]
    ];
    for(const [dx,dy] of dirs){
      const m = monsterAt(player.x+dx, player.y+dy);
      if(m){
        lastAttackAt = now;
        if(dx !== 0) player.facing = dx > 0 ? 1 : -1;
        m.hp -= dmg;
        spawnParticles(m.x, m.y, '#ffffff');
        if(m.hp <= 0){
          const def = MONSTER_DEFS[m.type];
          ore += Math.round(def.dropOre * oreValueMultiplier());
          monsters = monsters.filter(mm => mm !== m);
        }
        return;
      }
    }
  }

  function updateMonsters(){
    const now = performance.now();
    for(const m of monsters){
      const def = MONSTER_DEFS[m.type];
      const dx = player.x - m.x, dy = player.y - m.y;
      const adjacent = Math.abs(dx) + Math.abs(dy) === 1;
      if(adjacent){
        if(now - m.lastAttack > def.atkMs){
          m.lastAttack = now;
          damagePlayer(def.dmg);
        }
      } else if(now - m.lastMove > def.moveMs){
        m.lastMove = now;
        // двигаться к игроку только по уже открытым (EMPTY) клеткам
        const stepX = Math.sign(dx), stepY = Math.sign(dy);
        const tryOrder = Math.abs(dx) > Math.abs(dy)
          ? [[stepX,0],[0,stepY]] : [[0,stepY],[stepX,0]];
        for(const [sx,sy] of tryOrder){
          if(sx===0 && sy===0) continue;
          const nx = m.x+sx, ny = m.y+sy;
          if(getTile(nx,ny) === TILES.EMPTY && !monsterAt(nx,ny) && !(nx===player.x && ny===player.y)){
            m.x = nx; m.y = ny;
            break;
          }
        }
      }
    }
  }

  function damagePlayer(amount){
    const now = performance.now();
    if(now < invulnUntil) return;
    hp = Math.max(0, hp - amount);
    invulnUntil = now + 900;
    if(hp <= 0){
      if(bossMode){ loseBossFight(); }
      else { die(); }
    }
  }

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

  function die(){
    running = false;
    bossMode = false;
    document.getElementById('bossHudWrap').classList.add('hidden');
    save.bank += ore;
    writeSave();
    document.getElementById('deathTitle').textContent = hp <= 0 ? 'ВЫ ПОГИБЛИ' : 'КИСЛОРОД КОНЧИЛСЯ';
    document.getElementById('dDepth').textContent = depth;
    document.getElementById('dOre').textContent = ore;
    document.getElementById('deathOverlay').classList.add('show');
  }

  function returnToSurfaceInstant(){
    running = false;
    save.bank += ore;
    writeSave();
    openShop();
  }

  // ---------- Boss fight ----------
  const BOSS_DEF = { name:'ХРАНИТЕЛЬ БЕЗДНЫ', maxHp:900, dmg:1 };
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

  // ---------- Shop ----------
  function openShop(){
    hideOverlays();
    renderShop();
    document.getElementById('shopOverlay').classList.add('show');
  }
  function renderShop(){
    const list = document.getElementById('shopList');
    list.innerHTML = '';
    for(const k in UPGRADE_DEFS){
      const def = UPGRADE_DEFS[k];
      const lvl = save.upgrades[k];
      const cost = upgradeCost(k);
      const maxed = lvl >= def.max;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div>
          <div class="name">${def.name} <span class="lvl">Ур.${lvl}/${def.max}</span></div>
          <div class="desc">${def.desc}</div>
        </div>
        <button class="buyBtn" ${maxed || save.bank < cost ? 'disabled':''}>
          ${maxed ? 'МАКС' : cost + '₴'}
        </button>`;
      row.querySelector('button').addEventListener('click', ()=>{
        if(maxed || save.bank < cost) return;
        save.bank -= cost;
        save.upgrades[k]++;
        writeSave();
        renderShop();
        document.getElementById('bankVal').textContent = save.bank;
      });
      list.appendChild(row);
    }
    renderWeaponShop();
    document.getElementById('bankVal').textContent = save.bank;
  }
  function renderWeaponShop(){
    const list = document.getElementById('weaponList');
    list.innerHTML = '';
    for(const k in WEAPON_DEFS){
      const def = WEAPON_DEFS[k];
      const unlocked = !!save.weapons.unlocked[k];
      const lvl = save.weapons.levels[k] || 0;
      const dmg = weaponDamage(k);
      const upCost = weaponUpgradeCost(k);
      const maxed = lvl >= def.maxLvl;
      const equipped = equippedWeaponKey() === k;
      const row = document.createElement('div');
      row.className = 'weaponRow';
      const rightHtml = !unlocked
        ? `<button class="buyBtn">${def.cost}₴</button>`
        : `<div class="weaponBtns">
             <button class="equipBtn upBtn" ${maxed?'disabled':''}>${maxed?'МАКС':'+'+upCost+'₴'}</button>
             <button class="equipBtn eqBtn ${equipped?'active':''}">${equipped?'Экипировано':'Надеть'}</button>
           </div>`;
      row.innerHTML = `
        <div>
          <div class="name">${def.name} ${unlocked?`<span class="lvl">Ур.${lvl}/${def.maxLvl}</span>`:''}</div>
          <div class="stats">Урон: ${dmg} · Скорость: ${(1000/def.cooldown).toFixed(1)}/с</div>
        </div>
        ${rightHtml}`;
      if(!unlocked){
        row.querySelector('.buyBtn').disabled = save.bank < def.cost;
        row.querySelector('.buyBtn').addEventListener('click', ()=>{
          if(save.bank < def.cost) return;
          save.bank -= def.cost;
          save.weapons.unlocked[k] = true;
          writeSave();
          renderShop();
        });
      } else {
        const upBtn = row.querySelector('.upBtn');
        if(upBtn && !maxed){
          upBtn.disabled = save.bank < upCost;
          upBtn.addEventListener('click', ()=>{
            if(save.bank < upCost) return;
            save.bank -= upCost;
            save.weapons.levels[k]++;
            writeSave();
            renderShop();
          });
        }
        row.querySelector('.eqBtn').addEventListener('click', ()=>{
          save.weapons.equipped = k;
          writeSave();
          renderShop();
          updateWeaponHud();
        });
      }
      list.appendChild(row);
    }
  }
  function updateWeaponHud(){
    document.getElementById('weaponName').textContent = WEAPON_DEFS[equippedWeaponKey()].name;
  }
  function hideOverlays(){
    document.getElementById('shopOverlay').classList.remove('show');
    document.getElementById('deathOverlay').classList.remove('show');
    document.getElementById('creditsOverlay').classList.remove('show');
  }

  document.getElementById('creditsCloseBtn').addEventListener('click', openShop);
  document.getElementById('descendBtn').addEventListener('click', startRun);
  document.getElementById('respawnBtn').addEventListener('click', openShop);
  document.getElementById('playBtn').addEventListener('click', ()=>{
    document.getElementById('titleOverlay').classList.remove('show');
    openShop();
  });
  document.addEventListener('DOMContentLoaded', ()=>{ renderShop(); });

  // ---------- Render ----------
  function drawMonster(m, px, py){
    const def = MONSTER_DEFS[m.type];
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px+TILE/2, py+TILE-3, 9, 3, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.fillRect(px+8, py+8, TILE-16, TILE-12);
    ctx.fillStyle = def.color;
    ctx.fillRect(px+9, py+9, TILE-18, TILE-16);
    // глаза
    ctx.fillStyle = '#ff5050';
    ctx.fillRect(px+12, py+15, 3, 3);
    ctx.fillRect(px+TILE-15, py+15, 3, 3);
    // мини health bar
    const pct = Math.max(0, m.hp/m.maxHp);
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(px+5, py+3, TILE-10, 3);
    ctx.fillStyle = '#d9534f';
    ctx.fillRect(px+5, py+3, (TILE-10)*pct, 3);
  }

  function drawBossArena(){
    ctx.fillStyle = '#0c0a0e';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let row=0; row<VISIBLE_ROWS; row++){
      for(let col=0; col<COLS; col++){
        const px=col*TILE, py=row*TILE;
        const isWall = row<2 || row>=VISIBLE_ROWS-1;
        ctx.fillStyle = isWall ? '#241c2c' : (row%2===0 ? '#150f1a':'#130d18');
        ctx.fillRect(px,py,TILE,TILE);
      }
    }
    // телеграфы атак
    if(boss.state.startsWith('telegraph')){
      ctx.fillStyle = 'rgba(217,83,79,0.35)';
      if(boss.state==='telegraph-swipe'){
        ctx.fillRect((boss.x-2)*TILE, (boss.y-1)*TILE, 5*TILE, 3*TILE);
      } else if(boss.state==='telegraph-slam'){
        ctx.fillRect(boss.targetX*TILE, 2*TILE, TILE, (VISIBLE_ROWS-3)*TILE);
      } else if(boss.state==='telegraph-throw'){
        ctx.fillRect((boss.targetX-1)*TILE, 2*TILE, 3*TILE, (VISIBLE_ROWS-3)*TILE);
      }
    }
    // босс
    const bpx = boss.x*TILE, bpy = boss.y*TILE;
    ctx.fillStyle = '#3a1a20';
    ctx.beginPath();
    ctx.ellipse(bpx+TILE/2, bpy+TILE/2, TILE*0.85, TILE*0.7, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#5a2530';
    ctx.beginPath();
    ctx.ellipse(bpx+TILE/2, bpy+TILE/2, TILE*0.65, TILE*0.5, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#ffb0b0';
    ctx.beginPath();
    ctx.arc(bpx+TILE/2-14, bpy+TILE/2-6, 4, 0, Math.PI*2);
    ctx.arc(bpx+TILE/2+14, bpy+TILE/2-6, 4, 0, Math.PI*2);
    ctx.fill();

    // игрок
    drawPlayerAt(player.x*TILE, player.y*TILE);

    // частицы
    particles.forEach(p=>{
      ctx.globalAlpha = Math.max(0,p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x-2, p.y-2, 4,4);
      ctx.globalAlpha = 1;
    });
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(bossMode){ drawBossArena(); return; }
    const topRow = cameraTopRow();

    for(let row=0; row<VISIBLE_ROWS; row++){
      const worldY = topRow + row;
      for(let col=0; col<COLS; col++){
        const t = getTile(col, worldY);
        const px = col*TILE, py = row*TILE;
        if(worldY < 0) continue;
        if(t === TILES.EMPTY){
          // subtle back wall texture
          ctx.fillStyle = worldY===0 ? '#0c0a0e' : '#100c14';
          ctx.fillRect(px,py,TILE,TILE);
        } else if(t === TILES.CHEST){
          ctx.fillStyle = '#100c14';
          ctx.fillRect(px,py,TILE,TILE);
          ctx.fillStyle = '#6b4a2a';
          ctx.fillRect(px+5, py+12, TILE-10, TILE-16);
          ctx.fillStyle = '#8a6338';
          ctx.fillRect(px+5, py+12, TILE-10, 5);
          ctx.fillStyle = '#e8a33d';
          ctx.fillRect(px+TILE/2-2, py+13, 4, 4);
        } else {
          const info = TILE_INFO[t];
          ctx.fillStyle = info.color;
          ctx.fillRect(px,py,TILE,TILE);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.strokeRect(px+0.5,py+0.5,TILE-1,TILE-1);
          if(info.gem){
            ctx.fillStyle = info.gem;
            ctx.beginPath();
            ctx.arc(px+TILE/2, py+TILE/2, 5, 0, Math.PI*2);
            ctx.fill();
          }
        }
      }
    }

    // монстры
    for(const m of monsters){
      const mRow = m.y - topRow;
      if(mRow < -1 || mRow > VISIBLE_ROWS) continue;
      drawMonster(m, m.x*TILE, mRow*TILE);
    }

    // particles
    particles.forEach(p=>{
      const py = (p.y - topRow*TILE);
      ctx.globalAlpha = Math.max(0,p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x-2, py-2, 4,4);
      ctx.globalAlpha = 1;
    });

    // player — шахтёр: каска с фонариком, тело, кирка
    const pRow = player.y - topRow;
    const px = player.x*TILE, py = pRow*TILE;
    drawPlayerAt(px, py);

    // vignette light radius around player (simple)
    const grad = ctx.createRadialGradient(px+TILE/2,py+TILE/2, 20, px+TILE/2, py+TILE/2, lightRadiusFor());
    grad.addColorStop(0,'rgba(0,0,0,0)');
    grad.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  function drawPlayerAt(px, py){
    const facing = player.facing || 1; // 1 = вправо, -1 = влево
    ctx.save();
    ctx.translate(px + TILE/2, py + TILE/2);
    ctx.scale(facing, 1);
    ctx.translate(-TILE/2, -TILE/2);

    // тень
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(TILE/2, TILE-3, 10, 3, 0, 0, Math.PI*2);
    ctx.fill();

    // ноги
    ctx.fillStyle = '#2e2620';
    ctx.fillRect(TILE/2-7, TILE-11, 5, 9);
    ctx.fillRect(TILE/2+2, TILE-11, 5, 9);

    // тело (роба шахтёра)
    ctx.fillStyle = '#5a4530';
    ctx.fillRect(TILE/2-9, TILE-24, 18, 15);
    // ремень
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(TILE/2-9, TILE-14, 18, 3);
    // жилет-полоса светоотражающая
    ctx.fillStyle = '#e8a33d';
    ctx.fillRect(TILE/2-9, TILE-22, 18, 3);

    // кирка (за спиной, наклонена)
    ctx.save();
    ctx.translate(TILE/2+8, TILE-20);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(-1.5, -14, 3, 20);
    ctx.fillStyle = '#9aa0a8';
    ctx.beginPath();
    ctx.moveTo(-9,-14); ctx.lineTo(9,-14); ctx.lineTo(3,-19); ctx.lineTo(-3,-19);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // голова
    ctx.fillStyle = '#d9a878';
    ctx.beginPath();
    ctx.arc(TILE/2, TILE-27, 6.5, 0, Math.PI*2);
    ctx.fill();

    // каска
    ctx.fillStyle = '#e8a33d';
    ctx.beginPath();
    ctx.arc(TILE/2, TILE-29.5, 7, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(TILE/2-7, TILE-30, 14, 2.5);

    // фонарик на каске (светится)
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.arc(TILE/2+6, TILE-30.5, 2.3, 0, Math.PI*2);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff3d0';
    ctx.beginPath();
    ctx.arc(TILE/2+6, TILE-30.5, 4.5, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // рука с киркой
    ctx.fillStyle = '#5a4530';
    ctx.fillRect(TILE/2+4, TILE-22, 4, 8);

    ctx.restore();
  }

  function updateParticles(){
    particles.forEach(p=>{
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.04;
    });
    particles = particles.filter(p=>p.life>0);
  }

  function updateHeartsHud(){
    const bar = document.getElementById('heartsBar');
    bar.innerHTML = '';
    for(let i=0;i<MAX_HEARTS;i++){
      const full = i < hp;
      const d = document.createElement('div');
      d.className = 'heart';
      d.innerHTML = `<svg viewBox="0 0 24 24"><path fill="${full?'#d9534f':'#3d3440'}" d="M12 21s-7.5-4.6-10-9.3C.3 8.4 2 5 5.3 5c2 0 3.4 1.1 4.2 2.4C10.3 6.1 11.7 5 13.7 5 17 5 18.7 8.4 17 11.7 15.5 16.4 12 21 12 21z"/></svg>`;
      bar.appendChild(d);
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

  function updateHud(){
    document.getElementById('depthVal').textContent = Math.max(0,player.y*2);
    document.getElementById('oreVal').textContent = ore;
    const pct = Math.max(0, (oxygen/maxOxygen)*100);
    const fill = document.getElementById('oxyFill');
    fill.style.width = pct+'%';
    fill.style.background = pct < 25 ? 'linear-gradient(90deg,#d9534f,#a83a37)' : 'linear-gradient(90deg, var(--ice-blue), #3aa0af)';
  }

  // ---------- Main loop ----------
  function tick(){
    if(running){
      if(keys['ArrowLeft'])  attemptMove(-1,0);
      if(keys['ArrowRight']) attemptMove(1,0);
      if(keys['ArrowDown'])  attemptMove(0,1);
      if(keys['ArrowUp'])    attemptMove(0,-1);
      if(keys[' '])          attemptAttack();

      // passive oxygen drain
      oxygen = Math.max(0, oxygen - oxygenDrainRate());
      if(oxygen <= 0) die();

      // auto refill at surface
      if(player.y === 0) oxygen = Math.min(maxOxygen, oxygen + 0.3);

      updateMonsters();
      updateParticles();
      updateHud();
      updateHeartsHud();
    } else if(bossMode){
      if(keys['ArrowLeft'])  attemptArenaMove(-1,0);
      if(keys['ArrowRight']) attemptArenaMove(1,0);
      if(keys['ArrowUp'])    attemptArenaMove(0,-1);
      if(keys['ArrowDown'])  attemptArenaMove(0,1);
      if(keys[' '])          attemptAttack();
      updateBoss();
      updateParticles();
      updateHeartsHud();
    }
    draw();
    requestAnimationFrame(tick);
  }

  renderShop();
  running = false;
  player = {x:Math.floor(COLS/2), y:0, facing:1};
  ore = 0; oxygen = maxOxygenFor(); maxOxygen = maxOxygenFor(); depth = 0;
  updateHeartsHud();
  updateWeaponHud();
  requestAnimationFrame(tick);
})();
