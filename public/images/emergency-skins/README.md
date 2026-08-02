# Emergency Skins Directory

This directory contains fallback images for skins that fail to load from Steam CDNs.

## Structure
- Place skin images here using the skin ID as filename
- Supported formats: .png, .webp, .jpg
- Example: 123456789.png for skin ID 123456789

## How to Add Emergency Skins

1. Identify the skin ID from your database (inventario.item_id)
2. Download the skin image from Steam or other sources
3. Rename the file to match the skin ID
4. Place it in this directory

## Naming Convention
- Format: {skin_id}.{ext}
- Example: AWP-Dragon-Lore-12345.png

## Notes
- Images should be optimized (max 500KB each)
- Use WebP format for better compression
- Maximum 100 emergency skins recommended
- The system will automatically use these when Steam CDNs fail