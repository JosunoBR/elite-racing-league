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

  // ========== FILA DE RETRY COM BACKOFF EXPONENCIAL ==========
  class PersistenceQueue {
    constructor() {
      this.queue = [];
      this.isProcessing = false;
      this.maxRetries = 5;
      this.baseDelayMs = 1000;
      this.maxDelayMs = 32000;
    }

    enqueue(sectionName, value) {
      const task = {
        id: Date.now() + '_' + Math.random(),
        sectionName,
        value: JSON.parse(JSON.stringify(value)),
        retries: 0,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      this.queue.push(task);
      console.log(`[PersistenceQueue] Tarefa enfileirada: ${sectionName} (${this.queue.length} na fila)`);
      
      this.process();
      return task.id;
    }

    async process() {
      if (this.isProcessing || this.queue.length === 0) {
        return;
      }

      this.isProcessing = true;

      while (this.queue.length > 0) {
        const task = this.queue[0];
        const success = await this.executeTask(task);

        if (success) {
          this.queue.shift();
          console.log(`[PersistenceQueue] ✓ Sucesso: ${task.sectionName}`);
        } else {
          if (task.retries >= this.maxRetries) {
            this.queue.shift();
            task.status = 'failed';
            console.error(`[PersistenceQueue] ✗ Falhou após ${this.maxRetries} tentativas: ${task.sectionName}`);
            this.notifyFailure(task);
          } else {
            const delay = Math.min(
              this.baseDelayMs * Math.pow(2, task.retries),
              this.maxDelayMs
            );
            console.warn(`[PersistenceQueue] Retry em ${delay}ms: ${task.sectionName} (tentativa ${task.retries + 1}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      this.isProcessing = false;
    }

    async executeTask(task) {
      try {
        if (!window.__ERL_SERVER_PERSISTENCE__ || typeof fetch !== 'function') {
          return true;
        }

        const response = await fetch(`/api/save/${encodeURIComponent(task.sectionName)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: task.value, retryCount: task.retries })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        task.status = 'success';
        return true;
      } catch (error) {
        task.retries++;
        console.warn(`[PersistenceQueue] Erro na tentativa ${task.retries}: ${error.message}`);
        return false;
      }
    }

    notifyFailure(task) {
      const event = new CustomEvent('persistenceFailure', {
        detail: { task, queue: this.queue.length }
      });
      window.dispatchEvent(event);
    }

    getStatus() {
      return {
        queueLength: this.queue.length,
        isProcessing: this.isProcessing,
        tasks: this.queue.map(t => ({
          sectionName: t.sectionName,
          retries: t.retries,
          status: t.status
        }))
      };
    }
  }

  if (!window.__ERL_PERSISTENCE_QUEUE__) {
    window.__ERL_PERSISTENCE_QUEUE__ = new PersistenceQueue();
  }

  async function persistSection(sectionName, value) {
    setSection(sectionName, value);

    if (!window.__ERL_SERVER_PERSISTENCE__ || typeof fetch !== "function") {
      return { ok: false, mode: "browser-only" };
    }

    window.__ERL_PERSISTENCE_QUEUE__.enqueue(sectionName, value);
    return { ok: true, mode: "queued" };
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

  async function deletePilot(pilotId) {
    if (!window.__ERL_SERVER_PERSISTENCE__ || typeof fetch !== "function") {
      return { ok: true, mode: "browser-only" };
    }

    const response = await fetch("/api/delete/pilot", {
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
    removePilotPhoto,
    deletePilot,
    getQueueStatus: function() {
      return window.__ERL_PERSISTENCE_QUEUE__.getStatus();
    },
    flushQueue: async function() {
      await window.__ERL_PERSISTENCE_QUEUE__.process();
      return window.__ERL_PERSISTENCE_QUEUE__.getStatus();
    }
  };
})();
