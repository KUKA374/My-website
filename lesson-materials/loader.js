/* Bounded, explicit JSON loading. No all-materials query or legacy bulk fallback. */
(function (root) {
  "use strict";
  const M =
    typeof module !== "undefined"
      ? require("./model.js")
      : root.LessonMaterialsModel;
  function abort() {
    const e = new Error("Жүктеу тоқтатылды.");
    e.name = "AbortError";
    return e;
  }
  class Repository {
    constructor({
      baseURL,
      fetcher = (...args) => globalThis.fetch(...args),
      maxEntries = 8,
      maxCacheBytes = 524288,
      maxDocumentBytes = 131072,
      timeoutMs = 10000,
    } = {}) {
      if (
        !Number.isInteger(maxEntries) ||
        maxEntries < 1 ||
        maxEntries > 64 ||
        !Number.isInteger(maxCacheBytes) ||
        maxCacheBytes < 1024 ||
        !Number.isInteger(maxDocumentBytes) ||
        maxDocumentBytes < 128 ||
        timeoutMs < 1 ||
        typeof fetcher !== "function"
      )
        throw Error("Жүктеуші шектеулері жарамсыз.");
      this.base = new URL(
        baseURL || "./lesson-materials/",
        root.location?.href || "https://invalid.local/",
      );
      if (!this.base.pathname.endsWith("/"))
        throw Error("Негізгі каталог жолы / таңбасымен аяқталуы тиіс.");
      this.fetcher = fetcher;
      this.maxEntries = maxEntries;
      this.maxCacheBytes = maxCacheBytes;
      this.maxDocumentBytes = maxDocumentBytes;
      this.timeoutMs = timeoutMs;
      this.cache = new Map();
      this.bytes = 0;
      this.requests = 0;
      this.transferred = 0;
    }
    url(path) {
      if (
        typeof path !== "string" ||
        !path ||
        /^(?:[a-z]+:|\/)|\\|[?#]/i.test(path)
      )
        throw Error("Мазмұн жолы жарамсыз.");
      let decoded;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        throw Error("Мазмұн жолы оқылмады.");
      }
      if (
        /%2f|%5c/i.test(path) ||
        decoded.split("/").some((x) => x === ".." || x === ".") ||
        !path.endsWith(".json")
      )
        throw Error("Мазмұн жолы жарамсыз.");
      const u = new URL(path, this.base);
      if (
        u.origin !== this.base.origin ||
        !u.pathname.startsWith(this.base.pathname)
      )
        throw Error("Мазмұн жолы каталогтан тыс.");
      return u.href;
    }
    evict(url) {
      const v = this.cache.get(url);
      if (v) {
        this.bytes -= v.bytes;
        this.cache.delete(url);
      }
    }
    async read(path, { signal, optional = false, validate = (x) => x } = {}) {
      if (signal?.aborted) throw abort();
      const url = this.url(path);
      if (this.cache.has(url)) {
        const hit = this.cache.get(url);
        this.cache.delete(url);
        this.cache.set(url, hit);
        try {
          return M.clone(validate(M.clone(hit.value)));
        } catch (e) {
          this.evict(url);
          throw e;
        }
      }
      const controller = new AbortController(),
        cancel = () => controller.abort();
      signal?.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(cancel, this.timeoutMs);
      try {
        this.requests++;
        const response = await this.fetcher(url, {
          signal: controller.signal,
          cache: "no-cache",
          credentials: "same-origin",
        });
        if (response.status === 404 && optional) return null;
        if (!response.ok)
          throw Error("Сабақ мазмұны жүктелмеді. Қайта көріңіз.");
        if (
          !/application\/json/i.test(response.headers.get("content-type") || "")
        )
          throw Error("JSON мазмұнының түрі жарамсыз.");
        if (
          Number(response.headers.get("content-length")) > this.maxDocumentBytes
        )
          throw Error("Мазмұн көлемі рұқсат шегінен асты.");
        let raw = "",
          bytes = 0;
        const reader = response.body?.getReader();
        if (!reader) throw Error("Ағынмен жүктеу қолжетімсіз.");
        const decoder = new TextDecoder();
        try {
          while (true) {
            const p = await reader.read();
            if (p.done) break;
            bytes += p.value.byteLength;
            if (bytes > this.maxDocumentBytes) {
              await reader.cancel();
              throw Error("Мазмұн көлемі рұқсат шегінен асты.");
            }
            raw += decoder.decode(p.value, { stream: true });
          }
          raw += decoder.decode();
        } finally {
          reader.releaseLock();
        }
        if (controller.signal.aborted) throw abort();
        const value = validate(JSON.parse(raw));
        this.transferred += bytes;
        if (bytes <= this.maxCacheBytes) {
          while (
            this.cache.size >= this.maxEntries ||
            this.bytes + bytes > this.maxCacheBytes
          ) {
            this.evict(this.cache.keys().next().value);
          }
          this.cache.set(url, { value: M.clone(value), bytes });
          this.bytes += bytes;
        }
        return M.clone(value);
      } catch (e) {
        this.evict(url);
        if (signal?.aborted) throw abort();
        if (controller.signal.aborted)
          throw Error("Жүктеу уақыты аяқталды. Қайта көріңіз.");
        throw e;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", cancel);
      }
    }
    async load(context, { signal } = {}) {
      const c = M.identity(context),
        lessonId = M.id(c);
      const path = `index/${encodeURIComponent(c.grade)}/${encodeURIComponent(c.subject)}/q${c.quarter}.json`;
      const index = await this.read(path, {
        signal,
        optional: true,
        validate: (x) => {
          if (
            !x ||
            x.schemaVersion !== 1 ||
            !Array.isArray(x.lessons) ||
            x.lessons.length > 300
          )
            throw Error("Каталог нұсқасы жарамсыз.");
          const ids = new Set();
          for (const row of x.lessons) {
            M.parseId(row.lessonId);
            if (ids.has(row.lessonId)) throw Error("Каталогта ID қайталанды.");
            ids.add(row.lessonId);
            if (row.content !== null) this.url(row.content);
            M.ref(row.presentation);
          }
          return x;
        },
      });
      if (signal?.aborted) throw abort();
      const entry = index?.lessons.find((x) => x.lessonId === lessonId);
      if (!entry) return { material: M.empty(lessonId), available: false };
      if (entry.content === null) {
        const blank = M.empty(lessonId);
        blank.presentation = entry.presentation;
        return { material: blank, available: false };
      }
      const material = await this.read(entry.content, {
        signal,
        validate: (x) => M.material(x, lessonId),
      });
      if (
        ["id", "startSlide", "endSlide"].some(
          (k) => material.presentation?.[k] !== entry.presentation?.[k],
        )
      )
        throw Error("Сабақ пен каталог презентациясы сәйкес емес.");
      return { material, available: true };
    }
    async slides(reference, { signal } = {}) {
      M.ref(reference);
      if (!reference) return null;
      const p = await this.read(`presentations/${M.key(reference.id)}.json`, {
        signal,
        validate: (x) => M.presentation(x, reference.id),
      });
      if (reference.endSlide > p.slides.length)
        throw Error("Слайд аралығы презентациядан тыс.");
      return {
        id: p.id,
        title: p.title,
        total: p.slides.length,
        start: reference.startSlide,
        end: reference.endSlide,
        slides: p.slides.slice(reference.startSlide - 1, reference.endSlide),
      };
    }
    clear() {
      this.cache.clear();
      this.bytes = 0;
    }
    stats() {
      return {
        entries: this.cache.size,
        cacheBytes: this.bytes,
        requests: this.requests,
        transferredBytes: this.transferred,
      };
    }
  }
  if (typeof module !== "undefined") module.exports = { Repository };
  else root.LessonMaterialsLoader = { Repository };
})(typeof window !== "undefined" ? window : globalThis);
