// ============================================================
// constants.js — вся "база данных" игры: размеры поля, типы
// тайлов/руды, апгрейды, оружие, монстры, настройки босса.
// Здесь нет логики — только цифры и описания, которые удобно
// крутить, когда нужно поменять баланс игры.
// ============================================================

const TILE = 32;
const COLS = 12;
const VISIBLE_ROWS = 13;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = COLS * TILE;
canvas.height = VISIBLE_ROWS * TILE;

const MAX_HEARTS = 5;
const BOSS_TRIGGER_DEPTH = 100; // player.y, на HUD это 200м (y*2)
const SAVE_KEY = 'depth_save_v1';

// ---------- Тайлы / руда ----------
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

// ---------- Апгрейды в магазине ----------
// Растянутая кривая: max:20 у всех, mult ~1.3 => к 20 уровню цена в ~190 раз больше базовой.
const UPGRADE_DEFS = {
  oxygen:     { name:'Баллон кислорода',   desc:'+8 макс. O2 за уровень',        base:22, mult:1.30, max:20 },
  digSpeed:   { name:'Прочность кирки',    desc:'Быстрее копать',                base:26, mult:1.30, max:20 },
  moveSpeed:  { name:'Ботинки шахтёра',    desc:'Быстрее ходьба',                base:20, mult:1.30, max:20 },
  luck:       { name:'Чутьё на руду',      desc:'Больше ценной руды в породе',   base:32, mult:1.32, max:20 },
  oreValue:   { name:'Оценка руды',        desc:'+4% ценности добычи за уровень',base:28, mult:1.31, max:20 },
  lightRadius:{ name:'Фонарь',             desc:'Шире радиус света',             base:18, mult:1.28, max:20 },
  oxyEff:     { name:'Дыхательная техника',desc:'Медленнее расход O2 со временем',base:30, mult:1.33, max:20 },
};

// ---------- Оружие ----------
const WEAPON_DEFS = {
  pickaxe: { name:'Кирка',    dmg:8,  cooldown:400, cost:0,   maxLvl:10, dmgPerLvl:0.9, upBase:24, upMult:1.28 },
  daggers: { name:'Кинжалы',  dmg:6,  cooldown:220, cost:180, maxLvl:10, dmgPerLvl:0.7, upBase:26, upMult:1.28 },
  sword:   { name:'Меч',      dmg:14, cooldown:500, cost:320, maxLvl:10, dmgPerLvl:1.6, upBase:32, upMult:1.30 },
  hammer:  { name:'Молот',    dmg:26, cooldown:900, cost:600, maxLvl:10, dmgPerLvl:2.8, upBase:40, upMult:1.32 },
};

// ---------- Монстры ----------
const MONSTER_DEFS = {
  goblin:    { name:'Гоблин',         color:'#4a7a3a', dark:'#2f5227', baseHp:22, hpPerDepth:0.35, dmg:1, moveMs:420, atkMs:800, minDepth:16, dropOre:6 },
  deadMiner: { name:'Мёртвый шахтёр', color:'#5a5a62', dark:'#33333a', baseHp:42, hpPerDepth:0.55, dmg:1, moveMs:560, atkMs:1000, minDepth:45, dropOre:14 },
};

// ---------- Босс ----------
const BOSS_DEF = { name:'ХРАНИТЕЛЬ БЕЗДНЫ', maxHp:900, dmg:1 };
