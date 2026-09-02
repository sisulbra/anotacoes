(function () {
  "use strict";

  var ACTIVE_USER_KEY = "glicemia_active_user";
  var PROFILES_KEY = "glicemia_profiles_v1";
  var DEFAULT_SETTINGS = { low: 70, high: 180 };

  function activeUserId() {
    return localStorage.getItem(ACTIVE_USER_KEY);
  }

  function setActiveUserId(id) {
    if (id) {
      localStorage.setItem(ACTIVE_USER_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  }

  function keyFor(userId, suffix) {
    return "glicemia_v1__" + userId + "__" + suffix;
  }

  function loadProfiles() {
    try {
      var raw = localStorage.getItem(PROFILES_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveProfiles(list) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
  }

  function upsertProfile(profile) {
    var list = loadProfiles();
    var idx = list.findIndex(function (p) {
      return p.id === profile.id;
    });
    var record = {
      id: profile.id,
      name: profile.name,
      email: profile.email || null,
      picture: profile.picture || null,
      provider: profile.provider,
      lastLogin: Date.now()
    };
    if (idx === -1) {
      list.push(record);
    } else {
      list[idx] = record;
    }
    saveProfiles(list);
    return record;
  }

  function getProfile(id) {
    return loadProfiles().find(function (p) {
      return p.id === id;
    }) || null;
  }

  function loadReadings(userId) {
    try {
      var raw = localStorage.getItem(keyFor(userId, "readings"));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveReadings(userId, readings) {
    localStorage.setItem(keyFor(userId, "readings"), JSON.stringify(readings));
  }

  function loadSettings(userId) {
    try {
      var raw = localStorage.getItem(keyFor(userId, "settings"));
      var parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed.low !== "number" || typeof parsed.high !== "number") {
        return Object.assign({}, DEFAULT_SETTINGS);
      }
      return parsed;
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings(userId, settings) {
    localStorage.setItem(keyFor(userId, "settings"), JSON.stringify(settings));
  }

  window.Storage = {
    activeUserId: activeUserId,
    setActiveUserId: setActiveUserId,
    loadProfiles: loadProfiles,
    upsertProfile: upsertProfile,
    getProfile: getProfile,
    loadReadings: loadReadings,
    saveReadings: saveReadings,
    loadSettings: loadSettings,
    saveSettings: saveSettings
  };
})();
