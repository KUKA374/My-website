/*
  Math Teacher — Firebase configuration

  IMPORTANT:
  Replace the values below with the Firebase Web App configuration
  from your own Firebase project.

  Firebase web configuration is normally safe to place in frontend code.
  Never place a service-account private key or other secret here.
*/

const FIREBASE_CONFIG = {
  apiKey: "PASTE_FIREBASE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

const FIREBASE_CONFIGURED = !Object.values(FIREBASE_CONFIG).some(function(value) {
  return String(value).startsWith("PASTE_");
});
