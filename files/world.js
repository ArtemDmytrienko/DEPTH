// ============================================================
// world.js — процедурная генерация пещеры. Мир не хранится
// целиком: каждый тайл генерируется один раз (детерминированно,
// по хэшу от координат + seed забега) и кэшируется в Map.
// ============================================================

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
  if(y <= 0) return TILES.EMPTY; // поверхность всегда открыта
  const r = hash(x,y);
  const depthFactor = Math.min(y / 160, 1); // 0 у поверхности -> 1 на большой глубине
  const luckBoost = save.upgrades.luck * 0.005;

  // глубинные руды появляются только начиная со своего minDepth,
  // и чем глубже за порогом — тем выше шанс
  const mythrilP  = y >= TILE_INFO[TILES.MYTHRIL].minDepth  ? 0.006 + (y-140)*0.0007 + luckBoost*0.15 : 0;
  const sapphireP = y >= TILE_INFO[TILES.SAPPHIRE].minDepth ? 0.010 + (y-105)*0.0006 + luckBoost*0.2  : 0;
  const rubyP     = y >= TILE_INFO[TILES.RUBY].minDepth     ? 0.014 + (y-80)*0.0005  + luckBoost*0.25 : 0;
  const emeraldP  = y >= TILE_INFO[TILES.EMERALD].minDepth  ? 0.018 + (y-60)*0.0004  + luckBoost*0.3  : 0;
  const chestP    = y >= TILE_INFO[TILES.CHEST].minDepth    ? 0.006 : 0;

  // обычная руда — шанс растёт с глубиной и "удачей"
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
