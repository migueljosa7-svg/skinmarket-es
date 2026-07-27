// src/hooks/useFetchSkins.js
import { useState, useEffect } from "react";

const SKINS_API = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

let cachedSkins = null;
let priceMap = null;

export const getSkins = async () => {
  // Return cached skins if we have them (with or without priceMap)
  if (cachedSkins) return cachedSkins;

  try {
    const res = await fetch(SKINS_API);
    if (!res.ok) throw new Error("API de skins no respondió correctamente");
    const result = await res.json();

    if (!Array.isArray(result)) throw new Error("Formato de API inválido");

    if (!priceMap) {
      try {
        const pricesRes = await fetch('/skin_prices.json');
        if (pricesRes.ok) {
          priceMap = await pricesRes.json();
        } else {
          priceMap = {};
        }
      } catch (e) {
        console.warn('Could not load prices:', e);
        priceMap = {};
      }
    }

    cachedSkins = result.map((skin) => {
      let basePrice = priceMap[skin.name];
      if (!basePrice) {
        // Fallback si no hay precio real
        basePrice = Math.random() * 10;
        switch (skin.rarity?.name) {
          case "Covert": basePrice = Math.random() * 500 + 50; break;
          case "Classified": basePrice = Math.random() * 50 + 10; break;
          case "Restricted": basePrice = Math.random() * 10 + 2; break;
          case "Mil-Spec Grade": basePrice = Math.random() * 2 + 0.5; break;
          case "Consumer Grade": basePrice = Math.random() * 0.5 + 0.05; break;
          default: basePrice = 1.0; break;
        }
      }
      return {
        id: skin.id,
        name: skin.name,
        price: parseFloat(basePrice.toFixed(2)),
        rarity: skin.rarity?.name || "Unknown",
        image: skin.image || "",
        raw: skin,
      };
    });
    return cachedSkins;
  } catch (err) {
    console.error("Error cargando skins:", err);
    throw err; // Re-throw to be caught by hook
  }
};

export const useFetchSkins = (count = 6, random = true) => {
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadSkins = async () => {
      try {
        setLoading(true);
        const data = await getSkins();
        if (!isMounted) return;

        let result = data;
        if (random && count < data.length) {
          // Muestreo aleatorio eficiente en lugar de sort completo (O(N log N) -> O(count))
          const sampled = [];
          const indices = new Set();
          while (sampled.length < count) {
            const idx = Math.floor(Math.random() * data.length);
            if (!indices.has(idx)) {
              indices.add(idx);
              sampled.push(data[idx]);
            }
          }
          result = sampled;
        } else if (random) {
          result = [...data].sort(() => Math.random() - 0.5);
        } else {
          result = data.slice(0, count);
        }

        setSkins(result);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message);
        setSkins([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSkins();
    return () => { isMounted = false; };
  }, [count, random]);

  return { skins, loading, error };
};