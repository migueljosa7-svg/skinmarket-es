// src/components/LiveDrops.jsx
import { useState, useEffect, useRef } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { getRarityColor } from "../constants/colors";
import { StorageService } from "../services/StorageService";
import { getPlaceholderImage, handleImageError } from "../services/ImageService";
import { onSocketEvent } from "../services/socket";

const MAX_DROPS = 15;

const BOT_NAMES = [
  "CSGO_Pro", "CryptoKing", "SkinHunter", "Viper", "Zeus",
  "Shadow_Ninja", "LuckyStrike", "NeonRider", "Phoenix_ES", "AlphaGamer"
];

// Module-level constant — avoids recreating the array every 8s inside the interval
const SAMPLE_SKINS = [
  { name: "M4A1-S | Printstream", price: 145.00, rarity: "Covert" },
  { name: "Desert Eagle | Printstream", price: 65.00, rarity: "Covert" },
  { name: "AK-47 | Inheritance", price: 120.00, rarity: "Covert" },
  { name: "AWP | Chromatic Aberration", price: 38.00, rarity: "Classified" },
  { name: "USP-S | Printstream", price: 85.00, rarity: "Covert" },
  { name: "★ Specialist Gloves | Fade", price: 850.00, rarity: "Extraordinary" }
];

export default function LiveDrops() {
  const [drops, setDrops] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    // 1. Subscribe to socket.io "live-drop" events using the shared socket service
    const unsubSocket = onSocketEvent("live-drop", (dropData) => {
      const formatted = {
        id: dropData.id || `drop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: dropData.item?.name || "Skin",
        price: dropData.item?.price || 10,
        rarity: dropData.item?.rarity || "Mil-Spec",
        user: dropData.user || "Jugador",
        image: dropData.item?.image || ""
      };
      setDrops((prev) => [formatted, ...prev].slice(0, MAX_DROPS));
    });

    // 2. Subscribe to StorageService live drops (local fallback)
    //    Use optional chaining to handle null data (e.g. after logout)
    const unsubStorage = StorageService.subscribe((data) => {
      // After logout, data is null — handle gracefully without crashing
      if (!data) {
        setDrops([]);
        return;
      }
      const formatted = (data?.liveDrops || []).map((d) => ({
        id: d?.id || `drop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: d?.item?.name || "Skin",
        price: d?.item?.price || 10,
        rarity: d?.item?.rarity || "Mil-Spec",
        user: d?.user || "Jugador",
        image: d?.item?.image || ""
      }));
      if (formatted.length > 0) {
        setDrops((prev) => {
          const merged = [...formatted, ...prev];
          const unique = merged.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
          return unique.slice(0, MAX_DROPS);
        });
      }
    });

    // 3. Background community drop generator (simulated for demo)
    intervalRef.current = setInterval(() => {
      const randomUser = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const picked = SAMPLE_SKINS[Math.floor(Math.random() * SAMPLE_SKINS.length)];
      StorageService.addLiveDrop({
        user: randomUser,
        item: { ...picked, image: "" },
        caseName: "Live Feed"
      });
    }, 8000);

    return () => {
      // Cleanup: unsubscribe from socket event, storage subscription, clear interval
      unsubSocket();
      unsubStorage();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        height: "75px",
        background: "#0c0d10",
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
        borderBottomColor: "rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: "15px",
        overflow: "hidden",
        position: "relative",
        zIndex: 100
      }}
    >
      <div
        style={{
          background: "rgba(245,172,59,0.1)",
          color: "#f5ac3b",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "0.7rem",
          fontWeight: "900",
          letterSpacing: "1px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}
      >
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
        LIVE DROPS
      </div>

      <div style={{ display: "flex", gap: "10px", flex: 1, overflow: "hidden" }}>
        <AnimatePresence mode="popLayout">
          {drops.slice(0, 10).map((drop) => {
            const color = getRarityColor(drop.rarity);
            return (
              <Motion.div
                key={drop.id}
                initial={{ opacity: 0, x: -30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                style={{
                  height: "55px",
                  minWidth: "170px",
                  background: "rgba(255,255,255,0.02)",
                  borderWidth: "1px 1px 3px 1px",
                  borderStyle: "solid",
                  borderColor: `rgba(255,255,255,0.05) rgba(255,255,255,0.05) ${color} rgba(255,255,255,0.05)`,
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 10px",
                  gap: "8px",
                  flexShrink: 0,
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(45deg, ${color}15 0%, transparent 100%)`,
                    zIndex: 0
                  }}
                />
                <img
                  src={drop.image || getPlaceholderImage(drop.name)}
                  alt={drop.name}
                  onError={(e) => handleImageError(e, drop)}
                  style={{
                    width: "40px",
                    height: "40px",
                    objectFit: "contain",
                    zIndex: 1,
                    filter: `drop-shadow(0 0 5px ${color})`,
                    opacity: drop.image ? 1 : 0.3
                  }}
                />
                <div style={{ zIndex: 1, overflow: "hidden", flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: "800",
                      color: "white",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {drop.name}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                    <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", fontWeight: "700" }}>{drop.user}</div>
                    <div style={{ fontSize: "0.7rem", color: "#f5ac3b", fontWeight: "900" }}>€{Number(drop.price).toFixed(2)}</div>
                  </div>
                </div>
              </Motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}