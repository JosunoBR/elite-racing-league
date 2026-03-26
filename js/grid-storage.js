(function () {
  const STORAGE_KEY = "eliteRacingLeagueGridData";
  const STAGE_COUNT = 10;
  const DEFAULT_ROWS = 20;

  function createDefaultHeaders() {
    return Array.from({ length: STAGE_COUNT }, (_, index) => `Etapa ${index + 1}`);
  }

  function createEmptyRow(index) {
    return {
      id: index + 1,
      pilotId: "",
      nome: "",
      equipe: "",
      etapas: Array(STAGE_COUNT).fill("")
    };
  }

  function sanitizeNumericValue(value) {
    let sanitized = String(value ?? "").trim().replace(",", ".");
    sanitized = sanitized.replace(/[^0-9.]/g, "");

    const firstDotIndex = sanitized.indexOf(".");
    if (firstDotIndex !== -1) {
      sanitized =
        sanitized.slice(0, firstDotIndex + 1) +
        sanitized.slice(firstDotIndex + 1).replace(/\./g, "");
    }

    return sanitized;
  }

  function normalizeRow(row, index) {
    const etapas = Array.from({ length: STAGE_COUNT }, (_, stageIndex) => {
      const rawValue = Array.isArray(row?.etapas) ? row.etapas[stageIndex] : "";
      return sanitizeNumericValue(rawValue);
    });

    return {
      id: index + 1,
      pilotId: String(row?.pilotId ?? "").trim(),
      nome: String(row?.nome ?? "").trim(),
      equipe: String(row?.equipe ?? "").trim(),
      etapas
    };
  }

  function normalizeGrid(grid, index) {
    const rows = Array.isArray(grid?.rows) ? grid.rows : [];
    const rowCount = Math.max(DEFAULT_ROWS, rows.length);

    return {
      id: String(grid?.id || `grid${index + 1}`),
      name: String(grid?.name || `Grid ${index + 1}`).trim(),
      headers: Array.from({ length: STAGE_COUNT }, (_, stageIndex) => {
        const header = Array.isArray(grid?.headers) ? grid.headers[stageIndex] : "";
        return String(header || `Etapa ${stageIndex + 1}`).trim();
      }),
      rows: Array.from({ length: rowCount }, (_, rowIndex) =>
        normalizeRow(rows[rowIndex] || createEmptyRow(rowIndex), rowIndex)
      )
    };
  }

  function normalizeEditableGrids(grids) {
    if (!Array.isArray(grids)) {
      return [];
    }

    return grids.map((grid, index) => normalizeGrid(grid, index));
  }

  function buildDefaultEditableGrids() {
    if (typeof dadosCampeonato === "undefined" || !dadosCampeonato) {
      return [];
    }

    return Object.keys(dadosCampeonato).map((key, index) => {
      const categoria = dadosCampeonato[key];
      const pilotos = Array.isArray(categoria?.pilotos) ? categoria.pilotos : [];
      const rowCount = Math.max(DEFAULT_ROWS, pilotos.length);

      return normalizeGrid(
        {
          id: `grid${index + 1}`,
          name: categoria?.nome || `Grid ${index + 1}`,
          headers: createDefaultHeaders(),
          rows: Array.from({ length: rowCount }, (_, rowIndex) => ({
            id: rowIndex + 1,
            pilotId: pilotos[rowIndex]?.id || "",
            nome: pilotos[rowIndex]?.nome || "",
            equipe: pilotos[rowIndex]?.equipe || "",
            etapas: Array(STAGE_COUNT).fill("")
          }))
        },
        index
      );
    });
  }

  function loadEditableGrids() {
    const fallbackGrids = buildDefaultEditableGrids();
    const persistedGrids =
      typeof erlPersistence !== "undefined" ? erlPersistence.getSection("grids", null) : null;

    if (persistedGrids) {
      const normalizedPersistedGrids = normalizeEditableGrids(persistedGrids);
      if (normalizedPersistedGrids.length) {
        if (typeof localStorage !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedPersistedGrids));
          } catch (error) {
            console.warn("Nao foi possivel sincronizar os grids salvos no navegador.", error);
          }
        }

        return normalizedPersistedGrids;
      }
    }

    if (typeof localStorage === "undefined") {
      return fallbackGrids;
    }

    try {
      const rawData = localStorage.getItem(STORAGE_KEY);
      if (!rawData) {
        return fallbackGrids;
      }

      const parsedData = JSON.parse(rawData);
      const normalizedData = normalizeEditableGrids(parsedData);
      return normalizedData.length ? normalizedData : fallbackGrids;
    } catch (error) {
      console.warn("Nao foi possivel carregar os grids salvos.", error);
      return fallbackGrids;
    }
  }

  function saveEditableGrids(grids) {
    const normalizedData = normalizeEditableGrids(grids);

    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedData));
      } catch (error) {
        console.warn("Nao foi possivel salvar os grids.", error);
      }
    }

    if (typeof erlPersistence !== "undefined") {
      erlPersistence.persistSection("grids", normalizedData);
    }

    return normalizedData;
  }

  function escapeGridHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getGridNumber(gridId, fallbackNumber) {
    const match = String(gridId || "").match(/(\d+)$/);
    if (match) {
      return Number(match[1]);
    }

    return fallbackNumber;
  }

  window.GRID_STORAGE_KEY = STORAGE_KEY;
  window.GRID_STAGE_COUNT = STAGE_COUNT;
  window.GRID_DEFAULT_ROWS = DEFAULT_ROWS;
  window.createDefaultGridHeaders = createDefaultHeaders;
  window.sanitizeGridNumericValue = sanitizeNumericValue;
  window.normalizeEditableGrids = normalizeEditableGrids;
  window.buildDefaultEditableGrids = buildDefaultEditableGrids;
  window.loadEditableGrids = loadEditableGrids;
  window.saveEditableGrids = saveEditableGrids;
  window.escapeGridHtml = escapeGridHtml;
  window.getGridNumber = getGridNumber;
})();
