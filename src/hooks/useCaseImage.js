// ─── useCaseImage.js ─────────────────────────────────────────────────
// Intelligent image loader for case PNG assets with fallback
// Searches /assets/cases/{category_slug}/{case_slug}.png first
// Falls back to default cutout images based on template type
// ───────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

// ─── Default Fallback Images by Template Type ──────────────────────
const DEFAULT_CUTOUTS = {
    anime: "/case_eco.png",
    premium: "/case_premium.png",
    risk: "/case_knife.svg",
    battle: "/case_mid.png",
    holo: "/case_rare.svg",
    standard: "/case_eco.png"
};

// ─── Slugify helper for file paths ─────────────────────────────────
const toSlug = (str) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
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

// ─── Main Hook ─────────────────────────────────────────────────────
const useCaseImage = (caseObj) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const getTemplateType = useCallback((category) => {
        return CATEGORY_TEMPLATE[category] || "battle";
    }, []);

    const getFallbackImage = useCallback((category) => {
        const template = getTemplateType(category);
        return DEFAULT_CUTOUTS[template] || DEFAULT_CUTOUTS.battle;
    }, [getTemplateType]);

    useEffect(() => {
        if (!caseObj) {
            setImageSrc(DEFAULT_CUTOUTS.battle);
            setIsLoading(false);
            return;
        }

        // If the case already has an image, use it directly
        if (caseObj.image || caseObj.imageSrc) {
            setImageSrc(caseObj.image || caseObj.imageSrc);
            setIsLoading(false);
            return;
        }

        const category = (caseObj.category || "").toLowerCase();
        const caseName = caseObj.name || "";
        const categorySlug = toSlug(category);
        const caseSlug = toSlug(caseName);

        // Try to load from /assets/cases/{category}/{case}.png
        const localPath = `/assets/cases/${categorySlug}/${caseSlug}.png`;

        const img = new Image();
        img.onload = () => {
            setImageSrc(localPath);
            setIsLoading(false);
            setHasError(false);
        };
        img.onerror = () => {
            // Fallback to default cutout based on template type
            const fallback = getFallbackImage(category);
            setImageSrc(fallback);
            setIsLoading(false);
            setHasError(true);
        };
        img.src = localPath;

        // Cleanup
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [caseObj, getFallbackImage]);

    return {
        imageSrc,
        isLoading,
        hasError,
        fallbackImage: getFallbackImage(caseObj?.category)
    };
};

export default useCaseImage;
export { DEFAULT_CUTOUTS, CATEGORY_TEMPLATE, toSlug };