// ============================================================
// save.js — всё, что связано с сохранением прогресса в
// localStorage: банк игрока, уровни апгрейдов и оружия.
// Каждый новый посетитель сайта получает пустой localStorage,
// поэтому у него всегда старт с нуля — прогресс не шарится
// между разными людьми/браузерами.
// ============================================================

function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw){
      const s = JSON.parse(raw);
      // миграция старых сейвов — добавляем недостающие ключи, если в игру
      // добавили новый апгрейд/оружие после того как у игрока уже был сейв
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

let save = loadSave();

function upgradeCost(key){
  const lvl = save.upgrades[key];
  const def = UPGRADE_DEFS[key];
  return Math.round(def.base * Math.pow(def.mult, lvl));
}

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
