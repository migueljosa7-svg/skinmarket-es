// ─── useCaseImage.js ─────────────────────────────────────────────────
// Intelligent image loader for case PNG assets with fallback
// Uses pure onError event handling (no HEAD pre-flight requests that cause 404s)
// ───────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";

// ─── Default Fallback Images by Template Type ──────────────────────
const DEFAULT_CUTOUTS = {
    anime: "/case_eco.png",
    premium: "/case_premium.png",
    risk: "/case_knife.svg",
    battle: "/case_mid.png",
    holo: "/case_rare.svg",
    standard: "/case_eco.png"
};

// ─── Category to template type mapping ─────────────────────────────
const CATEGORY_TEMPLATE = {
    limited_edition: "premium",
    bestsellers: "battle",
    holo_cases: "holo",
    brainrot_cases: "anime",
    battle_cases: "battle",
    case_battles: "battle",
    premium_cases: "premium",
    risk_zone: "risk",
    anime_cases: "anime",
    sticker_cases: "battle",
    weapon_cases: "battle",
    kings_cases: "premium",
    farm_cases: "battle",
    our_specials: "anime",
    community_cases: "battle",
    cajas_gratis: "battle",
    gold_area: "premium",
    youtubers_cases: "anime",
    // Legacy categories
    económica: "battle",
    intermedia: "battle",
    premium: "premium",
    limited: "premium",
    risk: "risk",
    daily: "battle",
    anime: "anime",
    brainrot: "anime",
    holo: "holo",
    battle: "battle",
    standard: "battle"
};

// ─── Case Image Mapping by Name (for unique per-case PNG cutouts) ──
const CASE_SPECIFIC_IMAGES = {
    // LIMITED EDITION
    "RED SILK": "/case_covert.svg",
    "DOPPLER EFFECT": "/case_covert.svg",
    "EMERALD VEIN": "/case_knife.svg",
    "CORAL BLADE": "/case_knife.svg",
    "SACRED LOTUS": "/case_legendary.svg",
    "FEEL THE DRAGON": "/case_legendary.svg",
    // BESTSELLERS
    "STRIKE": "/case_eco.png",
    "ROYAL": "/case_mid.png",
    "STORM": "/case_mid.png",
    "JOKER": "/case_premium.png",
    "DAPHNE": "/case_premium.png",
    "FLAME": "/case_vip.svg",
    // HOLO CASES
    "HYPER": "/case_rare.svg",
    "DART": "/case_rare.svg",
    "AQUA": "/case_rare.svg",
    "POLYCHROME": "/case_rare.svg",
    "MARBLED": "/case_rare.svg",
    "ENGRAVE": "/case_vip.svg",
    "JAINA": "/case_vip.svg",
    "KATANA": "/case_vip.svg",
    "MANTIS": "/case_knife.svg",
    "ANDERS": "/case_knife.svg",
    "STRANGE": "/case_knife.svg",
    "DAVID": "/case_legendary.svg",
    // PREMIUM CASES
    "SERPENT": "/case_premium.png",
    "CHEAP KNIVES": "/case_knife.svg",
    "ARROW": "/case_covert.svg",
    "VEST": "/case_covert.svg",
    "VICE": "/case_covert.svg",
    "BLOODSHOT": "/case_covert.svg",
    "LORE": "/case_covert.svg",
    "PREMIUM KNIVES": "/case_knife.svg",
    "BUTTERFLY": "/case_knife.svg",
    "EMERALD": "/case_legendary.svg",
    "SPORT": "/case_legendary.svg",
    "PANDORA": "/case_legendary.svg",
    // RISK ZONE
    "TIGER": "/case_knife.svg",
    "MASK": "/case_knife.svg",
    "ADRENALINE": "/case_knife.svg",
    "RADIANT": "/case_knife.svg",
    "LOTUS": "/case_knife.svg",
    // ANIME
    "FLAMES": "/case_eco.png",
    "SKETCH": "/case_eco.png",
    "DOUBLE SLASH": "/case_eco.png",
    "HOT DAY": "/case_mid.png",
    "CRIMSON RED": "/case_mid.png",
    "PHASED": "/case_mid.png",
    "PINK STAR": "/case_premium.png",
    "ONI": "/case_premium.png",
    "EDGE": "/case_premium.png",
    "ENDLESS JOURNEY": "/case_covert.svg",
    "NIGHT CALLS": "/case_covert.svg",
    // KINGS CASES
    "DAGGERS": "/case_eco.png",
    "ENERGY": "/case_eco.png",
    "TECH": "/case_eco.png",
    "1% PROFIT": "/case_eco.png",
    "1% KNIFE": "/case_knife.svg",
    "SPARK": "/case_mid.png",
    "TOKEN": "/case_mid.png",
    "SIGNAL": "/case_mid.png",
    "SWAP": "/case_premium.png",
    "CAPITAL": "/case_premium.png",
    "PERFECT": "/case_premium.png",
    "LORD": "/case_premium.png",
    "SMART": "/case_premium.png",
    "ROCKET": "/case_premium.png",
    "REVOLUTION": "/case_premium.png",
    "SHARP": "/case_covert.svg",
    "SYNERGY": "/case_covert.svg",
    "ASIIMOV": "/case_covert.svg",
    // GOLD AREA
    "GOLD DIGGER": "/case_vip.svg",
    "FOSTER": "/case_vip.svg",
    "SHARK": "/case_vip.svg",
    "SAMURAI": "/case_legendary.svg",
    "RECON": "/case_legendary.svg",
    // YOUTUBERS
    "HEATONCS": "/case_premium.png",
    "CACHORRO": "/case_premium.png",
    "AMPETER": "/case_premium.png",
    "POKER": "/case_premium.png",
    "BLACK": "/case_covert.svg",
    "TARIFA": "/case_covert.svg",
};

// ─── Main Hook ─────────────────────────────────────────────────────
const useCaseImage = (caseObj) => {
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);

    const getTemplateType = useCallback((category) => {
        return CATEGORY_TEMPLATE[category] || "battle";
    }, []);

    const getFallbackImage = useCallback((category) => {
        const template = getTemplateType(category);
        return DEFAULT_CUTOUTS[template] || DEFAULT_CUTOUTS.battle;
    }, [getTemplateType]);

    const getImageSrc = useCallback(() => {
        if (!caseObj) return DEFAULT_CUTOUTS.battle;

        // If the case already has an image, use it directly
        if (caseObj.image || caseObj.imageSrc) {
            return caseObj.image || caseObj.imageSrc;
        }

        // Check if there's a case-specific image mapping
        const caseName = caseObj.name || "";
        if (CASE_SPECIFIC_IMAGES[caseName]) {
            return CASE_SPECIFIC_IMAGES[caseName];
        }

        // Fallback to default cutout based on template type
        const category = (caseObj.category || "").toLowerCase();
        return getFallbackImage(category);
    }, [caseObj, getFallbackImage]);

    // Handler for img onError - uses pure event handler, no HEAD requests
    const onImageError = useCallback((e) => {
        const img = e && e.target;
        if (!img) return;

        // Prevent infinite loops
        if (img.src.indexOf('data:image/svg+xml') === 0) return;

        // Get the fallback based on category
        const category = (caseObj?.category || "").toLowerCase();
        const fallback = getFallbackImage(category);

        // Count attempts to prevent loop
        const tryCount = parseInt(img.getAttribute('data-try') || '0', 10);
        if (tryCount >= 2) {
            // Final fallback: SVG data URL (no 404)
            const svgFallback = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                    <rect width="200" height="200" fill="#0f1115" rx="16"/>
                    <text x="100" y="110" font-size="14" text-anchor="middle" fill="#ffffff44" font-family="monospace">${caseObj?.name || 'CASE'}</text>
                </svg>`
            )}`;
            img.src = svgFallback;
            img.onerror = null;
            setHasError(true);
            setIsLoading(false);
            return;
        }

        img.setAttribute('data-try', String(tryCount + 1));

        // If current src has a decent path but failed, try the default fallback
        if (img.src !== fallback) {
            img.src = fallback;
            setHasError(true);
        } else {
            // Fallback also failed, use SVG placeholder
            const svgFallback = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
                    <rect width="200" height="200" fill="#0f1115" rx="16"/>
                    <text x="100" y="110" font-size="14" text-anchor="middle" fill="#ffffff44" font-family="monospace">${caseObj?.name || 'CASE'}</text>
                </svg>`
            )}`;
            img.src = svgFallback;
            img.onerror = null;
            setHasError(true);
        }
        setIsLoading(false);
    }, [caseObj, getFallbackImage]);

    const imageSrc = getImageSrc();

    return {
        imageSrc,
        isLoading,
        hasError,
        onImageError,
        fallbackImage: getFallbackImage(caseObj?.category)
    };
};

export default useCaseImage;
export { DEFAULT_CUTOUTS, CATEGORY_TEMPLATE, CASE_SPECIFIC_IMAGES };
