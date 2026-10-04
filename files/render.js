// ============================================================
// render.js — вся отрисовка на canvas: шахта, игрок, монстры,
// арена босса, и обновление HUD-элементов (полоски O2/HP и т.д.)
// ============================================================

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
        // лёгкая текстура задней стены
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

  // частицы
  particles.forEach(p=>{
    const py = (p.y - topRow*TILE);
    ctx.globalAlpha = Math.max(0,p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x-2, py-2, 4,4);
    ctx.globalAlpha = 1;
  });

  // игрок — шахтёр: каска с фонариком, тело, кирка
  const pRow = player.y - topRow;
  const px = player.x*TILE, py = pRow*TILE;
  drawPlayerAt(px, py);

  // виньетка — радиус света вокруг игрока
  const grad = ctx.createRadialGradient(px+TILE/2,py+TILE/2, 20, px+TILE/2, py+TILE/2, lightRadiusFor());
  grad.addColorStop(0,'rgba(0,0,0,0)');
  grad.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

function updateHud(){
  document.getElementById('depthVal').textContent = Math.max(0,player.y*2);
  document.getElementById('oreVal').textContent = ore;
  const pct = Math.max(0, (oxygen/maxOxygen)*100);
  const fill = document.getElementById('oxyFill');
  fill.style.width = pct+'%';
  fill.style.background = pct < 25 ? 'linear-gradient(90deg,#d9534f,#a83a37)' : 'linear-gradient(90deg, var(--ice-blue), #3aa0af)';
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
