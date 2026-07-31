// src/hooks/useFetchSkins.js
import { useState, useEffect } from "react";

const SKINS_API = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

let cachedSkins = null;
let priceMap = null;

/**
 * Extract the Steam economy image hash from a full CDN URL.
 * @param {string} imageUrl - Full CDN URL (e.g. https://community.akamai.steamstatic.com/economy/image/HASH/360fx360f)
 * @returns {string} The raw hash or empty string
 */
function extractIconUrlHash(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  // Match the hash between /economy/image/ and the next slash
  const match = imageUrl.match(/\/economy\/image\/([^/?#]+)/);
  if (match && match[1]) {
    // Clean any trailing size specifiers
    return match[1].replace(/\/[^/]+$/, '');
  }
  // If it's already just a hash (no full URL), return it
  if (/^[-a-zA-Z0-9_/=]{50,}$/.test(imageUrl)) {
    return imageUrl;
  }
  return '';
}

export const getSkins = async () => {
  // Return cached skins if we have them (with or without priceMap)
  if (cachedSkins) return cachedSkins;

  // eslint-disable-next-line no-useless-catch
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
      } catch {
        priceMap = {};
      }
    }

    cachedSkins = result.map((skin) => {
      // Extract the raw icon_url hash from the API image field
      const imageHash = extractIconUrlHash(skin.image);
      
      // Build the HD CDN URL using the official Steam Akamai endpoint with /360fx360f
      const imageHD = imageHash
        ? `https://steamcommunity-a.akamaihd.net/economy/image/${imageHash}/360fx360f`
        : (skin.image || "");

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
        image: imageHD,
        icon_url: imageHash, // Store the raw hash for DB storage
        raw: skin,
      };
    });
return cachedSkins;
  } catch (err) {
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