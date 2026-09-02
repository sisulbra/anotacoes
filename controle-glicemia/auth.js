(function () {
  "use strict";

  // Substitua pelo Client ID OAuth (tipo "Aplicativo da Web") criado no
  // Google Cloud Console para este projeto. Veja DEPLOY.md.
  var GOOGLE_CLIENT_ID = "REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com";

  var signinScreen = document.getElementById("signin-screen");
  var appRoot = document.getElementById("app-root");
  var knownProfilesBox = document.getElementById("known-profiles");
  var knownProfilesList = document.getElementById("known-profiles-list");
  var leadingDivider = document.getElementById("signin-divider");
  var googleArea = document.getElementById("google-signin-area");
  var googleBtnHost = document.getElementById("google-signin-btn");
  var localForm = document.getElementById("local-profile-form");
  var localNameInput = document.getElementById("local-profile-name");
  var profileChip = document.getElementById("profile-chip");
  var profileAvatar = document.getElementById("profile-avatar");
  var profileNameEl = document.getElementById("profile-name");

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function decodeGoogleCredential(jwt) {
    var payload = jwt.split(".")[1];
    var base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    return JSON.parse(decodeURIComponent(escape(atob(base64))));
  }

  function initials(name) {
    if (!name) return "?";
    var parts = name.trim().split(/\s+/);
    var first = parts[0] ? parts[0][0] : "";
    var last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  function renderProfileChip(record) {
    profileNameEl.textContent = record.name;
    if (record.picture) {
      profileAvatar.innerHTML = "";
      profileAvatar.style.backgroundImage = "url(" + record.picture + ")";
      profileAvatar.textContent = "";
    } else {
      profileAvatar.style.backgroundImage = "";
      profileAvatar.textContent = initials(record.name);
    }
  }

  function renderKnownProfiles() {
    var list = Storage.loadProfiles().sort(function (a, b) {
      return b.lastLogin - a.lastLogin;
    });

    if (list.length === 0) {
      knownProfilesBox.classList.add("hidden");
      leadingDivider.style.display = "none";
      return;
    }

    leadingDivider.style.display = "";
    knownProfilesBox.classList.remove("hidden");
    knownProfilesList.innerHTML = "";
    list.forEach(function (p) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "known-profile-btn";

      var avatar = document.createElement("span");
      avatar.className = "profile-avatar profile-avatar-lg";
      if (p.picture) {
        avatar.style.backgroundImage = "url(" + p.picture + ")";
      } else {
        avatar.textContent = initials(p.name);
      }

      var name = document.createElement("span");
      name.textContent = p.name;

      btn.appendChild(avatar);
      btn.appendChild(name);
      btn.addEventListener("click", function () {
        signInWithProfile(p);
      });
      knownProfilesList.appendChild(btn);
    });
  }

  function signInWithProfile(profile) {
    var record = Storage.upsertProfile(profile);
    Storage.setActiveUserId(record.id);
    renderProfileChip(record);
    signinScreen.classList.add("hidden");
    appRoot.classList.remove("hidden");
    if (window.GlicemiaApp) window.GlicemiaApp.init();
  }

  function signOut() {
    Storage.setActiveUserId(null);
    appRoot.classList.add("hidden");
    signinScreen.classList.remove("hidden");
    localNameInput.value = "";
    renderKnownProfiles();
  }

  function handleGoogleCredential(response) {
    try {
      var payload = decodeGoogleCredential(response.credential);
      signInWithProfile({
        id: "google_" + payload.sub,
        name: payload.name || payload.email || "Conta Google",
        email: payload.email || null,
        picture: payload.picture || null,
        provider: "google"
      });
    } catch (e) {
      alert("Não foi possível entrar com a conta Google. Tente novamente.");
    }
  }

  function setupGoogleSignIn() {
    var clientConfigured = GOOGLE_CLIENT_ID.indexOf("REPLACE_WITH") === -1;
    if (!clientConfigured) {
      googleArea.classList.add("hidden");
      return;
    }

    var attempts = 0;
    (function tryInit() {
      attempts++;
      if (window.google && window.google.accounts && window.google.accounts.id) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential
        });
        google.accounts.id.renderButton(googleBtnHost, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          locale: "pt-BR",
          width: 280
        });
        googleArea.classList.remove("hidden");
        return;
      }
      if (attempts < 6) {
        setTimeout(tryInit, 300);
      } else {
        googleArea.classList.add("hidden");
      }
    })();
  }

  localForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = localNameInput.value.trim();
    if (!name) return;
    signInWithProfile({ id: "local_" + uid(), name: name, provider: "local" });
  });

  profileChip.addEventListener("click", signOut);

  document.addEventListener("DOMContentLoaded", function () {
    var activeId = Storage.activeUserId();
    var activeProfile = activeId ? Storage.getProfile(activeId) : null;

    if (activeProfile) {
      renderProfileChip(activeProfile);
      signinScreen.classList.add("hidden");
      appRoot.classList.remove("hidden");
      if (window.GlicemiaApp) window.GlicemiaApp.init();
      return;
    }

    renderKnownProfiles();
    setupGoogleSignIn();
  });
})();
