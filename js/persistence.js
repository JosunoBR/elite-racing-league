(function () {
  function cloneData(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function ensureStateObject() {
    if (!window.__ERL_PERSISTED_STATE__ || typeof window.__ERL_PERSISTED_STATE__ !== "object") {
      window.__ERL_PERSISTED_STATE__ = {};
    }

    return window.__ERL_PERSISTED_STATE__;
  }

  function getSection(sectionName, fallbackValue) {
    const state = ensureStateObject();

    if (!Object.prototype.hasOwnProperty.call(state, sectionName)) {
      return cloneData(fallbackValue);
    }

    return cloneData(state[sectionName]);
  }

  function setSection(sectionName, value) {
    const state = ensureStateObject();
    state[sectionName] = cloneData(value);
    return state[sectionName];
  }

  async function persistSection(sectionName, value) {
    setSection(sectionName, value);

    if (!window.__ERL_SERVER_PERSISTENCE__ || typeof fetch !== "function") {
      return { ok: false, mode: "browser-only" };
    }

    try {
      const response = await fetch(`/api/save/${encodeURIComponent(sectionName)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: value })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      return { ok: true, mode: "server", payload };
    } catch (error) {
      console.warn(`Nao foi possivel persistir a secao "${sectionName}" no servidor.`, error);
      return { ok: false, mode: "server-error", error };
    }
  }

  async function uploadPilotPhoto(pilotId, dataUrl) {
    if (!window.__ERL_SERVER_PERSISTENCE__ || typeof fetch !== "function") {
      return { ok: true, imagePath: dataUrl, mode: "browser-only" };
    }

    const response = await fetch("/api/upload/pilot-photo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pilotId, dataUrl })
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    return payload;
  }

  async function removePilotPhoto(pilotId) {
    if (!window.__ERL_SERVER_PERSISTENCE__ || typeof fetch !== "function") {
      return { ok: true, imagePath: "", mode: "browser-only" };
    }

    const response = await fetch("/api/remove/pilot-photo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pilotId })
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    return payload;
  }

  window.erlPersistence = {
    cloneData,
    getSection,
    setSection,
    persistSection,
    uploadPilotPhoto,
    removePilotPhoto
  };
})();
