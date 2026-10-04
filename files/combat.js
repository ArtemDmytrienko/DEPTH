// ============================================================
// combat.js — всё, что связано с боем: монстры (спавн, ИИ,
// движение по туннелям), атака игрока оружием, урон по игроку.
// ============================================================

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

function monsterAt(x,y){
  return monsters.find(m => m.x===x && m.y===y);
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
