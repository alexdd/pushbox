/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * Shared yoga-event catalog: deities (symbolic), asanas, festival foci.
 */
"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.YogaCatalog = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {

  const DEITIES = [
    { id: "shiva", name: "Shiva", honorific: "Mahadev", color: "#5b4a8a", symbol: "Trishula · Mondsichel" },
    { id: "kali", name: "Kali", honorific: "Maa Kali", color: "#2a1038", symbol: "Sichel · Lotus" },
    { id: "ganesha", name: "Ganesha", honorific: "Ganapati", color: "#c45c26", symbol: "Modaka · Lotus" },
    { id: "lakshmi", name: "Lakshmi", honorific: "Maa Lakshmi", color: "#d4a017", symbol: "Lotus · Kalasha" },
    { id: "saraswati", name: "Saraswati", honorific: "Maa Saraswati", color: "#d8e6f2", symbol: "Veena · Schwan" },
    { id: "hanuman", name: "Hanuman", honorific: "Anjaneya", color: "#c43b3b", symbol: "Gada · Berg" },
    { id: "krishna", name: "Krishna", honorific: "Govinda", color: "#2f6fbf", symbol: "Flöte · Pfauenfeder" }
  ];

  const TEMPLE_NAMES = {
    shiva: "Kailash Ashram",
    kali: "Kalighat Mandir",
    ganesha: "Ganapati Mandir",
    lakshmi: "Padma Ashram",
    saraswati: "Vani Mandir",
    hanuman: "Anjaneya Mandir",
    krishna: "Vrindavan Kunj"
  };

  const ASANAS = [
    { id: "surya", name: "Surya Namaskar" },
    { id: "tadasana", name: "Tadasana" },
    { id: "adho", name: "Adho Mukha Svanasana" },
    { id: "virabhadra", name: "Virabhadrasana" },
    { id: "bhujanga", name: "Bhujangasana" },
    { id: "padma", name: "Padmasana" },
    { id: "trikona", name: "Trikonasana" },
    { id: "vriksha", name: "Vrikshasana" },
    { id: "bala", name: "Balasana" },
    { id: "savasana", name: "Savasana" }
  ];

  const FOCI = [
    { id: "hatha", name: "Hatha" },
    { id: "vinyasa", name: "Vinyasa" },
    { id: "pranayama", name: "Pranayama" },
    { id: "meditation", name: "Meditation" },
    { id: "bhakti", name: "Bhakti" },
    { id: "yin", name: "Yin" },
    { id: "ashtanga", name: "Ashtanga" }
  ];

  function deityById(id) {
    for (let i = 0; i < DEITIES.length; i++) if (DEITIES[i].id === id) return DEITIES[i];
    return DEITIES[0];
  }

  function asanaById(id) {
    for (let i = 0; i < ASANAS.length; i++) if (ASANAS[i].id === id) return ASANAS[i];
    return null;
  }

  function focusById(id) {
    for (let i = 0; i < FOCI.length; i++) if (FOCI[i].id === id) return FOCI[i];
    return FOCI[0];
  }

  function sanitizeAsanas(list) {
    const out = [];
    const seen = new Set();
    const arr = Array.isArray(list) ? list : String(list || "").split(",");
    for (let i = 0; i < arr.length; i++) {
      const id = String(arr[i] || "").trim();
      if (!asanaById(id) || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out.slice(0, 6);
  }

  function sanitizeFocus(id) {
    return focusById(id) ? id : "hatha";
  }

  return {
    DEITIES,
    TEMPLE_NAMES,
    ASANAS,
    FOCI,
    deityById,
    asanaById,
    focusById,
    sanitizeAsanas,
    sanitizeFocus
  };
});
