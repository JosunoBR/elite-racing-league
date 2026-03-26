const fs = require("fs");
const path = require("path");
const http = require("http");
const assert = require("assert");
const { spawn } = require("child_process");
const { chromium } = require("@playwright/test");

const ROOT_DIR = path.resolve(__dirname, "..");
const STATE_FILE = path.join(ROOT_DIR, "data", "runtime-state.json");
const BACKUP_FILE = path.join(ROOT_DIR, "data", "runtime-state.test-backup.json");
const BASE_URL = "http://127.0.0.1:3000";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
          response.resume();

          if (response.statusCode && response.statusCode < 500) {
            resolve();
            return;
          }

          reject(new Error(`Status ${response.statusCode}`));
        });

        request.on("error", reject);
      });

      return;
    } catch (error) {
      await sleep(500);
    }
  }

  throw new Error(`Servidor nao respondeu em ${timeoutMs}ms.`);
}

async function startServer() {
  const server = spawn("node", ["server.js"], {
    cwd: ROOT_DIR,
    stdio: "ignore",
    windowsHide: true
  });

  await waitForServer(`${BASE_URL}/api/state`);
  return server;
}

async function stopServer(server) {
  if (!server || server.killed) {
    return;
  }

  server.kill();
  await sleep(1500);
}

function backupStateFile() {
  if (fs.existsSync(STATE_FILE)) {
    fs.copyFileSync(STATE_FILE, BACKUP_FILE);
  } else if (fs.existsSync(BACKUP_FILE)) {
    fs.unlinkSync(BACKUP_FILE);
  }
}

function resetStateFile() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

function restoreStateFile() {
  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, STATE_FILE);
    fs.unlinkSync(BACKUP_FILE);
    return;
  }

  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}

async function run() {
  const uniqueSuffix = Date.now();
  const gridTitle = `Grid Persistencia ${uniqueSuffix}`;
  const pilotId = `99${String(uniqueSuffix).slice(-3)}`;
  const pilotName = `Piloto Persistencia ${uniqueSuffix}`;
  const username = `adm${String(uniqueSuffix).slice(-6)}`;
  const password = `senha${String(uniqueSuffix).slice(-4)}`;
  const photoBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l9iQAAAAASUVORK5CYII=",
    "base64"
  );

  backupStateFile();
  resetStateFile();

  let server;
  let browser;
  let uploadedPhotoPath = "";

  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login.html?redirect=grid_edit.html`);
    await page.fill("#fUser", "root");
    await page.fill("#fPass", "erlroot2026");
    await page.click("#btnLogin");
    await page.waitForURL("**/grid_edit.html");

    const saveGridTitle = page.waitForResponse(
      (response) => response.url().includes("/api/save/grids") && response.request().method() === "POST"
    );
    await page.locator("#grid1 .grid-title").evaluate((element, value) => {
      element.textContent = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    }, gridTitle);
    await saveGridTitle;

    const saveGridPoints = page.waitForResponse(
      (response) => response.url().includes("/api/save/grids") && response.request().method() === "POST"
    );
    await page.locator("#grid1 tbody tr .stage-points").first().evaluate((element) => {
      element.textContent = "19";
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    });
    await saveGridPoints;

    await page.reload();
    await page.waitForSelector("#grid1");
    assert.strictEqual((await page.locator("#grid1 .grid-title").textContent()).trim(), gridTitle);
    assert.strictEqual((await page.locator("#grid1 tbody tr .stage-points").first().textContent()).trim(), "19");

    await page.goto(`${BASE_URL}/pilot_management.html`);
    await page.fill("#inputPilotId", pilotId);
    await page.fill("#inputNome", pilotName);
    await page.fill("#inputNick", "TST");
    await page.fill("#inputEquipe", "equipe-teste");
    await page.locator("#photoInput").setInputFiles({
      name: "piloto-teste.png",
      mimeType: "image/png",
      buffer: photoBuffer
    });
    const uploadPilotPhoto = page.waitForResponse(
      (response) =>
        response.url().includes("/api/upload/pilot-photo") && response.request().method() === "POST"
    );
    const savePilot = page.waitForResponse(
      (response) =>
        response.url().includes("/api/save/pilotRegistry") && response.request().method() === "POST"
    );
    await page.click('#pilotForm button[type="submit"]');
    const uploadPayload = await (await uploadPilotPhoto).json();
    await savePilot;
    uploadedPhotoPath = uploadPayload.imagePath;

    await page.reload();
    await page.fill("#searchInput", pilotName);
    await page.waitForSelector(`text=${pilotName}`);

    await page.goto(`${BASE_URL}/admin_users.html`);
    await page.fill("#newUser", username);
    await page.fill("#newPass", password);
    const saveUser = page.waitForResponse(
      (response) => response.url().includes("/api/save/users") && response.request().method() === "POST"
    );
    await page.click("#btnCreate");
    await saveUser;
    await page.waitForSelector(`text=${username}`);

    await browser.close();
    browser = null;

    await stopServer(server);
    server = await startServer();

    browser = await chromium.launch({ headless: true });
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();

    await freshPage.goto(`${BASE_URL}/login.html`);
    await freshPage.fill("#fUser", username);
    await freshPage.fill("#fPass", password);
    await freshPage.click("#btnLogin");
    await freshPage.waitForURL("**/grid_edit.html");
    assert.strictEqual((await freshPage.locator("#grid1 .grid-title").textContent()).trim(), gridTitle);

    await freshPage.goto(`${BASE_URL}/index.html`);
    await freshPage.waitForSelector(`text=${gridTitle}`);

    await freshPage.goto(`${BASE_URL}/pilot_management.html`);
    await freshPage.fill("#searchInput", pilotName);
    await freshPage.waitForSelector(`text=${pilotName}`);

    const savedState = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    assert.strictEqual(savedState.grids[0].name, gridTitle);
    assert.strictEqual(savedState.grids[0].rows[0].etapas[0], "19");
    assert.ok(savedState.pilotRegistry[pilotId], "Piloto nao encontrado no arquivo de estado.");
    assert.ok(
      savedState.pilotRegistry[pilotId].imagem.startsWith("uploads/pilotos/"),
      "Foto do piloto nao foi convertida para arquivo no servidor."
    );
    assert.ok(fs.existsSync(path.join(ROOT_DIR, savedState.pilotRegistry[pilotId].imagem)), "Arquivo da foto nao encontrado.");
    assert.ok(
      savedState.users.some((user) => user.username === username),
      "Usuario nao encontrado no arquivo de estado."
    );

    console.log("Teste de persistencia concluido com sucesso.");
  } finally {
    if (browser) {
      await browser.close();
    }

    if (server) {
      await stopServer(server);
    }

    if (uploadedPhotoPath) {
      const uploadedPhotoAbsolutePath = path.join(ROOT_DIR, uploadedPhotoPath);
      if (fs.existsSync(uploadedPhotoAbsolutePath)) {
        fs.unlinkSync(uploadedPhotoAbsolutePath);
      }
    }

    restoreStateFile();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
