/**
 * PowerTrack - Firebase Configuration & Initialization
 * Project: powertrack-f0187
 * Database: https://powertrack-f0187-default-rtdb.asia-southeast1.firebasedatabase.app
 */

(function (window) {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyAnChsOgCNL37HCFJyT-_-MpGGcJFYfRNM",
    authDomain: "powertrack-f0187.firebaseapp.com",
    databaseURL: "https://powertrack-f0187-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "powertrack-f0187",
    storageBucket: "powertrack-f0187.firebasestorage.app",
    messagingSenderId: "255262800837",
    appId: "1:255262800837:web:4b560fc4fa0bebc8d629ac",
    measurementId: "G-4LKKWT0NFT"
  };

  window.FIREBASE_CONFIG = firebaseConfig;

  let app = null;
  let db = null;
  let auth = null;

  try {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      if (!firebase.apps || !firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
      } else {
        app = firebase.app();
      }

      if (firebase.database) {
        db = firebase.database();
      }

      if (firebase.auth) {
        auth = firebase.auth();
      }

      console.log("⚡ PowerTrack: Firebase initialized successfully with Realtime Database & Auth");
    } else {
      console.warn("⚡ PowerTrack: Firebase SDK not detected. Operating in local mode.");
    }
  } catch (error) {
    console.error("⚡ PowerTrack: Firebase initialization error:", error);
  }

  window.PowerTrackFirebase = {
    app: app,
    db: db,
    auth: auth,
    config: firebaseConfig,
    isAvailable: function () {
      return Boolean(app && db);
    },
    isAuthAvailable: function () {
      return Boolean(app && auth);
    }
  };
})(window);
