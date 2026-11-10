/* Read only users/{UID}.role via Firestore REST; no Firestore writer/Storage SDK. */
"use strict";
function roleDatabase({ credential, projectId, fetcher = globalThis.fetch }) {
  if (!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId || ""))
    throw Error("FIREBASE_PROJECT_ID жарамсыз.");
  return {
    collection(name) {
      if (name !== "users") throw Error("Тек users рөлін оқу қолжетімді.");
      return {
        doc(uid) {
          return {
            async get() {
              const token = await credential.getAccessToken();
              const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}?mask.fieldPaths=role`;
              const response = await fetcher(url, {
                redirect: "error",
                headers: { authorization: "Bearer " + token.access_token },
                signal: AbortSignal.timeout(10000),
              });
              if (response.status === 404) {
                await response.body?.cancel();
                return { exists: false };
              }
              if (!response.ok) {
                await response.body?.cancel();
                throw Error("Рөлді серверде тексеру қолжетімсіз.");
              }
              const value = await response.json(),
                role = value.fields?.role?.stringValue;
              return {
                exists: true,
                data: () => ({ role: typeof role === "string" ? role : null }),
              };
            },
          };
        },
      };
    },
  };
}
module.exports = { roleDatabase };
