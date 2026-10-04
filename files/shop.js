// ============================================================
// shop.js — магазин на поверхности (апгрейды + оружие),
// управление оверлеями (магазин/смерть/титры) и переходы
// между состояниями игры (смерть, возврат на поверхность).
// ============================================================

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
