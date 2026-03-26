// Sistema de Cadastro Central de Pilotos
(function () {
  const PILOT_REGISTRY_KEY = "eliteRacingLeaguePilotRegistry";

  function loadPilotRegistry() {
    if (typeof erlPersistence !== "undefined") {
      const persistedRegistry = erlPersistence.getSection("pilotRegistry", null);
      if (persistedRegistry && typeof persistedRegistry === "object") {
        if (typeof localStorage !== "undefined") {
          try {
            localStorage.setItem(PILOT_REGISTRY_KEY, JSON.stringify(persistedRegistry));
          } catch (error) {
            console.warn("Erro ao sincronizar registro de pilotos com o navegador.", error);
          }
        }

        return persistedRegistry;
      }
    }

    if (typeof localStorage === "undefined") {
      return {};
    }

    try {
      const data = localStorage.getItem(PILOT_REGISTRY_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn("Erro ao carregar registro de pilotos.", error);
      return {};
    }
  }

  function savePilotRegistry(registry) {
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(PILOT_REGISTRY_KEY, JSON.stringify(registry));
      } catch (error) {
        console.warn("Erro ao salvar registro de pilotos.", error);
      }
    }

    if (typeof erlPersistence !== "undefined") {
      erlPersistence.persistSection("pilotRegistry", registry);
    }
  }

  function registerPilot(pilotId, pilotData) {
    const registry = loadPilotRegistry();
    registry[pilotId] = {
      ...registry[pilotId],
      ...pilotData,
      id: pilotId
    };
    savePilotRegistry(registry);
    return registry[pilotId];
  }

  function getPilotById(pilotId) {
    const registry = loadPilotRegistry();
    return registry[pilotId] || null;
  }

  function getPilotImage(pilotId) {
    const pilot = getPilotById(pilotId);
    return pilot?.imagem || null;
  }

  function removePilotImage(pilotId) {
    const registry = loadPilotRegistry();
    if (registry[pilotId]) {
      registry[pilotId].imagem = "";
      savePilotRegistry(registry);
    }
  }

  function getAllPilots() {
    return loadPilotRegistry();
  }

  function initializeFromPilotosJS() {
    if (typeof pilotos === "undefined" || !Array.isArray(pilotos)) {
      return;
    }

    const registry = loadPilotRegistry();
    let hasChanges = false;

    pilotos.forEach((pilot) => {
      const pilotId = String(pilot.id || "").trim();
      if (!pilotId) {
        return;
      }

      const existingPilot = registry[pilotId];
      if (!existingPilot || typeof existingPilot !== "object") {
        registry[pilotId] = {
          id: pilotId,
          nome: String(pilot.nome || "").trim(),
          nick: String(pilot.nick || "").trim(),
          equipe: String(pilot.equipe || "").trim(),
          imagem: String(pilot.imagem || "").trim()
        };
        hasChanges = true;
        return;
      }

      const mergedPilot = {
        id: pilotId,
        nome: Object.prototype.hasOwnProperty.call(existingPilot, "nome")
          ? existingPilot.nome
          : String(pilot.nome || "").trim(),
        nick: Object.prototype.hasOwnProperty.call(existingPilot, "nick")
          ? existingPilot.nick
          : String(pilot.nick || "").trim(),
        equipe: Object.prototype.hasOwnProperty.call(existingPilot, "equipe")
          ? existingPilot.equipe
          : String(pilot.equipe || "").trim(),
        imagem: Object.prototype.hasOwnProperty.call(existingPilot, "imagem")
          ? existingPilot.imagem
          : String(pilot.imagem || "").trim()
      };

      if (JSON.stringify(existingPilot) !== JSON.stringify(mergedPilot)) {
        registry[pilotId] = mergedPilot;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      savePilotRegistry(registry);
    }
  }

  function findPilotIdByName(pilotName) {
    if (!pilotName) return null;
    const normalizedName = String(pilotName).trim().toLowerCase();
    const registry = loadPilotRegistry();
    for (const pilotId in registry) {
      const pilot = registry[pilotId];
      if (pilot && pilot.nome && pilot.nome.toLowerCase() === normalizedName) {
        return pilotId;
      }
    }
    return null;
  }

  window.pilotRegistry = {
    load: loadPilotRegistry,
    save: savePilotRegistry,
    register: registerPilot,
    getById: getPilotById,
    getImage: getPilotImage,
    removeImage: removePilotImage,
    getAll: getAllPilots,
    findIdByName: findPilotIdByName,
    initFromPilotosJS: initializeFromPilotosJS
  };
})();
