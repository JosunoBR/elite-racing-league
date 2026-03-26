const http = require("http");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { URL } = require("url");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const STATIC_INDEX = "index.html";
const STATE_FILE = path.join(ROOT_DIR, "data", "runtime-state.json");
const PILOT_UPLOADS_DIR = path.join(ROOT_DIR, "uploads", "pilotos");
const VALID_SECTIONS = new Set(["grids", "pilotRegistry", "users"]);
const GRID_STAGE_COUNT = 10;
const GRID_DEFAULT_ROWS = 20;

function cloneData(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
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

function sanitizePilotId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w-]/g, "_");
}

function normalizeUser(user) {
  const username = String(user?.username ?? "")
    .trim()
    .toLowerCase();
  const password = String(user?.password ?? "").trim();
  const role = user?.role === "root" ? "root" : "admin";

  if (!username || !password) {
    return null;
  }

  return { username, password, role };
}

function normalizeUsers(users) {
  if (!Array.isArray(users)) {
    return [];
  }

  const normalizedUsers = [];
  const seenUsernames = new Set();

  users.forEach((user) => {
    const normalizedUser = normalizeUser(user);
    if (!normalizedUser || seenUsernames.has(normalizedUser.username)) {
      return;
    }

    seenUsernames.add(normalizedUser.username);
    normalizedUsers.push(normalizedUser);
  });

  return normalizedUsers;
}

function normalizePilotRecord(pilotId, pilotData) {
  const normalizedId = sanitizePilotId(pilotId || pilotData?.id);
  if (!normalizedId) {
    return null;
  }

  return {
    id: normalizedId,
    nome: String(pilotData?.nome ?? "").trim(),
    nick: String(pilotData?.nick ?? "").trim(),
    equipe: String(pilotData?.equipe ?? "").trim(),
    imagem: String(pilotData?.imagem ?? "").trim()
  };
}

function normalizePilotRegistry(registry) {
  if (!registry || typeof registry !== "object") {
    return {};
  }

  const normalizedRegistry = {};

  Object.keys(registry).forEach((pilotId) => {
    const normalizedPilot = normalizePilotRecord(pilotId, registry[pilotId]);
    if (!normalizedPilot) {
      return;
    }

    normalizedRegistry[normalizedPilot.id] = normalizedPilot;
  });

  return normalizedRegistry;
}

function createDefaultHeaders() {
  return Array.from({ length: GRID_STAGE_COUNT }, (_, index) => `Etapa ${index + 1}`);
}

function createEmptyRow(index) {
  return {
    id: index + 1,
    pilotId: "",
    nome: "",
    equipe: "",
    etapas: Array(GRID_STAGE_COUNT).fill("")
  };
}

function normalizeGridRow(row, index) {
  const etapas = Array.from({ length: GRID_STAGE_COUNT }, (_, stageIndex) => {
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
  const rowCount = Math.max(GRID_DEFAULT_ROWS, rows.length);

  return {
    id: String(grid?.id || `grid${index + 1}`).trim(),
    name: String(grid?.name || `Grid ${index + 1}`).trim(),
    headers: Array.from({ length: GRID_STAGE_COUNT }, (_, stageIndex) => {
      const header = Array.isArray(grid?.headers) ? grid.headers[stageIndex] : "";
      return String(header || `Etapa ${stageIndex + 1}`).trim();
    }),
    rows: Array.from({ length: rowCount }, (_, rowIndex) =>
      normalizeGridRow(rows[rowIndex] || createEmptyRow(rowIndex), rowIndex)
    )
  };
}

function normalizeGrids(grids) {
  if (!Array.isArray(grids)) {
    return [];
  }

  return grids.map((grid, index) => normalizeGrid(grid, index));
}

function normalizeSection(sectionName, data) {
  if (sectionName === "grids") {
    return normalizeGrids(data);
  }

  if (sectionName === "pilotRegistry") {
    return normalizePilotRegistry(data);
  }

  if (sectionName === "users") {
    return normalizeUsers(data);
  }

  return cloneData(data);
}

function readScriptExport(relativeFilePath, exportName) {
  const absolutePath = path.join(ROOT_DIR, relativeFilePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const context = { console, globalThis: {} };

  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__ERL_EXPORT__ = ${exportName};`, context, {
    filename: absolutePath
  });

  return cloneData(context.globalThis.__ERL_EXPORT__);
}

function buildSeedState() {
  const dadosCampeonato = readScriptExport(path.join("data", "campeonato.js"), "dadosCampeonato");
  const pilotos = readScriptExport(path.join("data", "pilotos.js"), "pilotos");

  const grids = Object.keys(dadosCampeonato || {}).map((key, index) => {
    const categoria = dadosCampeonato[key] || {};
    const categoryPilots = Array.isArray(categoria.pilotos) ? categoria.pilotos : [];
    const rowCount = Math.max(GRID_DEFAULT_ROWS, categoryPilots.length);

    return {
      id: `grid${index + 1}`,
      name: categoria.nome || `Grid ${index + 1}`,
      headers: createDefaultHeaders(),
      rows: Array.from({ length: rowCount }, (_, rowIndex) => {
        const pilot = categoryPilots[rowIndex] || {};
        return {
          id: rowIndex + 1,
          pilotId: pilot.id ? String(pilot.id) : "",
          nome: pilot.nome || "",
          equipe: pilot.equipe || "",
          etapas: Array(GRID_STAGE_COUNT).fill("")
        };
      })
    };
  });

  const pilotRegistry = {};
  (Array.isArray(pilotos) ? pilotos : []).forEach((pilot) => {
    const normalizedPilot = normalizePilotRecord(pilot.id, pilot);
    if (normalizedPilot) {
      pilotRegistry[normalizedPilot.id] = normalizedPilot;
    }
  });

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    grids: normalizeGrids(grids),
    pilotRegistry: normalizePilotRegistry(pilotRegistry),
    users: []
  };
}

function writeState(state) {
  const nextState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    grids: normalizeGrids(state?.grids),
    pilotRegistry: normalizePilotRegistry(state?.pilotRegistry),
    users: normalizeUsers(state?.users)
  };

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2), "utf8");
  return nextState;
}

function ensureState() {
  if (!fs.existsSync(STATE_FILE)) {
    return writeState(buildSeedState());
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    const mergedState = {
      ...buildSeedState(),
      ...parsed
    };

    const normalizedState = {
      version: 1,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      grids: normalizeGrids(mergedState.grids),
      pilotRegistry: normalizePilotRegistry(mergedState.pilotRegistry),
      users: normalizeUsers(mergedState.users)
    };

    if (JSON.stringify(parsed) !== JSON.stringify(normalizedState)) {
      return writeState(normalizedState);
    }

    return normalizedState;
  } catch (error) {
    console.warn("Nao foi possivel ler o arquivo de estado. Recriando a partir dos arquivos base.", error);
    return writeState(buildSeedState());
  }
}

function readState() {
  return ensureState();
}

function updateStateSection(sectionName, data) {
  if (!VALID_SECTIONS.has(sectionName)) {
    throw new Error("Secao invalida.");
  }

  const currentState = readState();
  currentState[sectionName] = normalizeSection(sectionName, data);
  return writeState(currentState);
}

function isManagedPilotUpload(imagePath) {
  return typeof imagePath === "string" && imagePath.startsWith("uploads/pilotos/");
}

function removeManagedPilotUpload(imagePath) {
  if (!isManagedPilotUpload(imagePath)) {
    return;
  }

  const absolutePath = path.join(ROOT_DIR, imagePath);
  if (absolutePath.startsWith(PILOT_UPLOADS_DIR) && fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem invalido.");
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];
  const extensionMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  };

  const extension = extensionMap[mimeType];
  if (!extension) {
    throw new Error("Tipo de imagem nao suportado.");
  }

  return {
    mimeType,
    extension,
    buffer: Buffer.from(base64Data, "base64")
  };
}

function savePilotPhoto(pilotId, dataUrl) {
  const normalizedPilotId = sanitizePilotId(pilotId);
  if (!normalizedPilotId) {
    throw new Error("Piloto invalido para upload.");
  }

  const imageData = parseDataUrl(dataUrl);
  if (imageData.buffer.length > 8 * 1024 * 1024) {
    throw new Error("Imagem excede o limite de 8 MB.");
  }

  fs.mkdirSync(PILOT_UPLOADS_DIR, { recursive: true });

  const currentState = readState();
  const currentPilot = currentState.pilotRegistry[normalizedPilotId] || {};
  removeManagedPilotUpload(currentPilot.imagem);

  const fileName = `${normalizedPilotId}-${Date.now()}.${imageData.extension}`;
  const absoluteFilePath = path.join(PILOT_UPLOADS_DIR, fileName);
  fs.writeFileSync(absoluteFilePath, imageData.buffer);

  const relativeFilePath = `uploads/pilotos/${fileName}`.replace(/\\/g, "/");
  currentState.pilotRegistry[normalizedPilotId] = normalizePilotRecord(normalizedPilotId, {
    ...currentPilot,
    id: normalizedPilotId,
    imagem: relativeFilePath
  });

  writeState(currentState);
  return relativeFilePath;
}

function clearPilotPhoto(pilotId) {
  const normalizedPilotId = sanitizePilotId(pilotId);
  if (!normalizedPilotId) {
    throw new Error("Piloto invalido para remocao da imagem.");
  }

  const currentState = readState();
  const currentPilot = currentState.pilotRegistry[normalizedPilotId];
  if (!currentPilot) {
    return "";
  }

  removeManagedPilotUpload(currentPilot.imagem);
  currentState.pilotRegistry[normalizedPilotId] = normalizePilotRecord(normalizedPilotId, {
    ...currentPilot,
    imagem: ""
  });

  writeState(currentState);
  return "";
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".jfif": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8",
    ".ico": "image/x-icon"
  };

  return map[extension] || "application/octet-stream";
}

function safeResolvePath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split("?")[0]);
  const requestedPath = pathname === "/" ? STATIC_INDEX : pathname.replace(/^\/+/, "");
  const normalizedPath = path.normalize(requestedPath);
  const absolutePath = path.resolve(ROOT_DIR, normalizedPath);

  if (!absolutePath.startsWith(ROOT_DIR)) {
    return null;
  }

  return absolutePath;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;

    request.on("data", (chunk) => {
      totalLength += chunk.length;
      if (totalLength > 15 * 1024 * 1024) {
        reject(new Error("Payload muito grande."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendBootstrap(response) {
  const state = readState();
  const source = [
    "window.__ERL_SERVER_PERSISTENCE__ = true;",
    `window.__ERL_PERSISTED_STATE__ = ${JSON.stringify(state)};`
  ].join("\n");

  response.writeHead(200, {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(source);
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/bootstrap.js") {
    sendBootstrap(response);
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/state") {
    sendJson(response, 200, readState());
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/upload/pilot-photo") {
    try {
      const rawBody = await readRequestBody(request);
      const parsedBody = rawBody ? JSON.parse(rawBody) : {};
      const imagePath = savePilotPhoto(parsedBody.pilotId, parsedBody.dataUrl);
      sendJson(response, 200, { ok: true, imagePath });
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error.message });
    }
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/remove/pilot-photo") {
    try {
      const rawBody = await readRequestBody(request);
      const parsedBody = rawBody ? JSON.parse(rawBody) : {};
      const imagePath = clearPilotPhoto(parsedBody.pilotId);
      sendJson(response, 200, { ok: true, imagePath });
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error.message });
    }
    return true;
  }

  if (request.method === "POST" && url.pathname.startsWith("/api/save/")) {
    const sectionName = url.pathname.slice("/api/save/".length);

    try {
      const rawBody = await readRequestBody(request);
      const parsedBody = rawBody ? JSON.parse(rawBody) : {};
      const nextState = updateStateSection(sectionName, parsedBody.data);
      sendJson(response, 200, { ok: true, section: sectionName, updatedAt: nextState.updatedAt });
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error.message });
    }

    return true;
  }

  return false;
}

function handleStatic(request, response, urlPath) {
  const absolutePath = safeResolvePath(urlPath);

  if (!absolutePath) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Acesso negado.");
    return;
  }

  let filePath = absolutePath;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, STATIC_INDEX);
  }

  if (!fs.existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Arquivo nao encontrado.");
    return;
  }

  response.writeHead(200, {
    "Content-Type": getContentType(filePath)
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);

  if (await handleApi(request, response, url)) {
    return;
  }

  handleStatic(request, response, url.pathname);
});

server.listen(PORT, HOST, () => {
  ensureState();
  console.log(`Elite Racing League disponivel em http://${HOST}:${PORT}`);
});
