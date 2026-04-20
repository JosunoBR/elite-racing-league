if (typeof pilotRegistry !== "undefined" && pilotRegistry.initFromPilotosJS) {
  pilotRegistry.initFromPilotosJS();
}

// ========== LISTENERS PARA REATIVIDADE E MONITORAMENTO ==========

// Listener para reatividade em mesma aba
window.addEventListener('gridUpdated', function(event) {
  console.log('[app.js] Detectado atualização de grids', event.detail);
  setTimeout(function() {
    renderizarTabelas();
  }, 100);
});

// Listener para falhas de persistência
window.addEventListener('persistenceFailure', function(event) {
  console.warn('[app.js] Falha de sincronização:', event.detail);
  // Opcional: mostrar notificação no UI
  var notification = document.createElement('div');
  notification.style.cssText = 'position:fixed;top:10px;right:10px;background:#dc3545;color:white;padding:15px;border-radius:5px;z-index:9999;max-width:400px;';
  notification.textContent = '⚠️ Falha ao sincronizar dados. Tentando novamente...';
  document.body.appendChild(notification);
  setTimeout(function() { notification.remove(); }, 5000);
});

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

function getEditableGrids() {
  if (typeof loadEditableGrids === "function") {
    return loadEditableGrids();
  }
  return [];
}

function calculateGridRowTotal(row) {
  if (!row || !Array.isArray(row.etapas)) {
    return 0;
  }
  return row.etapas.reduce((total, value) => {
    const numericValue = parseFloat(String(value || "").replace(",", "."));
    return total + (Number.isFinite(numericValue) ? numericValue : 0);
  }, 0);
}

function getGridRowsWithTotals(grid) {
  if (!grid || !Array.isArray(grid.rows)) {
    return [];
  }

  return grid.rows
    .map((row) => ({
      pilotId: String(row?.pilotId || "").trim(),
      nome: String(row?.nome || "").trim(),
      equipe: String(row?.equipe || "").trim(),
      total: calculateGridRowTotal(row)
    }))
    .filter((row) => row.nome)
    .sort((firstRow, secondRow) => secondRow.total - firstRow.total || firstRow.nome.localeCompare(secondRow.nome));
}

// Agrupa pontos por equipe e retorna lista ordenada por total
function getConstructorStandings(rows) {
  const map = {};
  rows.forEach(function(row) {
    const team = String(row.equipe || "").trim();
    if (!team) return;
    if (!map[team]) map[team] = 0;
    map[team] += row.total;
  });
  return Object.entries(map)
    .map(function([team, pts]) { return { equipe: team, total: pts }; })
    .sort(function(a, b) { return b.total - a.total || a.equipe.localeCompare(b.equipe); });
}

function formatTeamName(team) {
  const normalizedTeam = String(team || "").trim().toLowerCase();
  const teamNames = {
    redbull: "Red Bull",
    ferrari: "Ferrari",
    mercedes: "Mercedes",
    astonmartin: "Aston Martin",
    kicksauber: "Kick Sauber",
    alpine: "Alpine",
    haas: "Haas",
    mclaren: "McLaren",
    rb: "RB",
    williams: "Williams"
  };

  if (teamNames[normalizedTeam]) {
    return teamNames[normalizedTeam];
  }
  return String(team || "").trim();
}

function formatPoints(value) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  });
}

function renderizarTabelas() {
  const tabsContainer = document.querySelector(".tabs");
  const gridsContainer = document.getElementById("conteudo-grids-container") || document.getElementById("tabelas-container");

  if (!tabsContainer || !gridsContainer) {
    return;
  }

  const grids = getEditableGrids();
  tabsContainer.innerHTML = "";
  gridsContainer.innerHTML = "";

  grids.forEach((grid, index) => {
    const rows = getGridRowsWithTotals(grid);

    const button = document.createElement("button");
    button.className = "tab" + (index === 0 ? " active" : "");
    button.dataset.gridId = grid.id;
    button.textContent = grid.name || "Grid " + (index + 1);
    button.addEventListener("click", function () {
      trocarGrid(grid.id);
    });
    tabsContainer.appendChild(button);

    const gridDiv = document.createElement("div");
    gridDiv.className = "grid-classificacao" + (index === 0 ? " ativo" : "");
    gridDiv.id = grid.id;

    // 1. Montar HTML do Carrossel do Grid
    const topPilotos = rows.slice(0, 10);
    let swiperHtml = "";
    if (topPilotos.length > 0) {
      const slides = topPilotos.map((piloto, i) => {
        const leaderClass = i === 0 ? "leader-card" : "";
        const pilotImage = (piloto.pilotId && pilotRegistry.getImage(piloto.pilotId)) || "fotosmenu/logo.png";
        return `<div class="swiper-slide"><div class="card-piloto ${leaderClass}"><img src="${pilotImage}" onerror="this.src='fotosmenu/logo.png'" class="img-click"><div class="card-body"><div class="nome">${escapeHtml(piloto.nome)}</div><div class="equipe">${escapeHtml(formatTeamName(piloto.equipe) || "Sem equipe")}</div><div class="points">${formatPoints(piloto.total)} PTS</div></div></div></div>`;
      }).join("");
      swiperHtml = `
        <div class="swiper">
          <div class="swiper-wrapper">
            ${slides}
          </div>
          <div class="swiper-button-next"></div>
          <div class="swiper-button-prev"></div>
          <div class="swiper-pagination"></div>
        </div>
      `;
    } else {
      swiperHtml = `<div class="text-center p-5 w-100">Nenhum piloto para exibir neste grid.</div>`;
    }

    // 2. Montar HTML da Tabela do Grid
    let rowsHtml = "";
    if (rows.length) {
      rowsHtml = rows.map((row) => {
        const pilotImage = (row.pilotId && pilotRegistry.getImage(row.pilotId)) || "fotosmenu/logo.png";
        const teamClass = String(row.equipe || "").trim().toLowerCase().replace(/\s/g, '');

        return `
          <tr>
            <td>
              <div class="piloto-info">
                <img src="${pilotImage}" class="foto-piloto" onerror="this.src='fotosmenu/logo.png'">
                <span>${escapeHtml(row.nome)}</span>
              </div>
            </td>
            <td><span class="${teamClass}">${escapeHtml(formatTeamName(row.equipe) || "-")}</span></td>
            <td class="numero">${formatPoints(row.total)}</td>
          </tr>`;
      }).join("");
    } else {
      rowsHtml = "<tr><td colspan=\"3\" class=\"text-center\">Nenhum piloto cadastrado.</td></tr>";
    }

    // 3. Montar HTML da Tabela de Construtores
    const constructors = getConstructorStandings(rows);
    let constructorRowsHtml = "";
    if (constructors.length) {
      constructorRowsHtml = constructors.map(function(c, i) {
        const teamClass = String(c.equipe || "").trim().toLowerCase().replace(/\s/g, '');
        return `<tr>
            <td class="numero">${i + 1}</td>
            <td><span class="${teamClass}">${escapeHtml(formatTeamName(c.equipe))}</span></td>
            <td class="numero">${formatPoints(c.total)}</td>
          </tr>`;
      }).join("");
    } else {
      constructorRowsHtml = "<tr><td colspan=\"3\" class=\"text-center\">Nenhuma equipe cadastrada.</td></tr>";
    }

    // 4. Juntar Tudo e Inserir no HTML
    gridDiv.innerHTML = `
      <!-- CARROSSEL -->
      <div class="container mt-5">
        <h1 class="title">🏁 Destaques de ${escapeHtml(grid.name || "Grid " + (index + 1))}</h1>
        ${swiperHtml}
      </div>

      <!-- TABELA DE CLASSIFICAÇÃO -->
      <div class="classificacao-container">
        <div class="tabela">
          <h3>${escapeHtml(grid.name || "Grid " + (index + 1))}</h3>
          <table><thead><tr><th>Piloto</th><th>Equipe</th><th>Pontos</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        </div>
        <div class="tabela tabela-construtores">
          <h3>Campeonato de Construtores</h3>
          <table><thead><tr><th>#</th><th>Equipe</th><th>Pontos</th></tr></thead><tbody>${constructorRowsHtml}</tbody></table>
        </div>
      </div>
    `;

    gridsContainer.appendChild(gridDiv);
  });

  if (grids.length) {
    trocarGrid(grids[0].id);
  }
}

function trocarGrid(gridId) {
  document.querySelectorAll(".tabs .tab").forEach((tabButton) => {
    tabButton.classList.toggle("active", tabButton.dataset.gridId === gridId);
  });
  document.querySelectorAll(".grid-classificacao").forEach((grid) => {
    grid.classList.toggle("ativo", grid.id === gridId);
  });

  inicializarSwiper(gridId);
}

const modal = document.getElementById("modalImg");
const modalImg = document.getElementById("imgExpandida");
const fechar = document.querySelector(".fechar");
let homeSwiper = null;

if (modal && modalImg && fechar) {
  document.addEventListener("click", function (event) {
    if (event.target.classList.contains("img-click")) {
      modal.style.display = "block";
      modalImg.src = event.target.src;
    }
  });

  fechar.onclick = function () {
    modal.style.display = "none";
  };

  modal.onclick = function () {
    modal.style.display = "none";
  };
}

function inicializarSwiper(gridId) {
  if (typeof Swiper === "undefined") return;

  if (homeSwiper) {
    homeSwiper.destroy(true, true);
    homeSwiper = null;
  }

  const swiperSelector = `.grid-classificacao#${gridId} .swiper`;
  const swiperElement = document.querySelector(swiperSelector);
  
  if (!swiperElement) return;

  homeSwiper = new Swiper(swiperElement, {
    slidesPerView: 5,
    spaceBetween: 20,
    loop: false,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev"
    },
    breakpoints: {
      320: { slidesPerView: 1 },
      768: { slidesPerView: 2 },
      1024: { slidesPerView: 4 },
      1400: { slidesPerView: 5 }
    }
  });
}

renderizarTabelas();

window.addEventListener("storage", function (event) {
  if (event.key && event.key !== GRID_STORAGE_KEY && event.key !== "eliteRacingLeaguePilotRegistry") {
    return;
  }
  renderizarTabelas();
});

