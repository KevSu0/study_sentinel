#!/usr/bin/env python3
"""
PWA Icon Generator for Study Sentinel
Generates all required PWA icons and notification assets.
"""

import os
from PIL import Image, ImageDraw, ImageFont
import json

def create_base_icon(size, bg_color="#4F46E5", text="SS"):
    """Create a base icon with background color and text."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background
    margin = size // 8
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        fill=bg_color,
        radius=size // 6
    )
    
    # Add text
    try:
        # Try to use a system font
        font_size = size // 3
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2
    
    draw.text((x, y), text, fill="white", font=font)
    
    return img

def create_notification_icon(size, icon_type, bg_color="#10B981"):
    """Create notification icons for different purposes."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    margin = size // 8
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        fill=bg_color,
        radius=size // 6
    )
    
    # Simple icons using shapes
    center = size // 2
    
    if icon_type == "study":
        # Book icon
        book_width = size // 2
        book_height = size // 3
        x = (size - book_width) // 2
        y = (size - book_height) // 2
        draw.rectangle([x, y, x + book_width, y + book_height], fill="white")
        draw.line([x + book_width//2, y, x + book_width//2, y + book_height], fill=bg_color, width=2)
        
    elif icon_type == "streak":
        # Fire icon
        flame_height = size // 2
        flame_width = size // 3
        points = [
            (center, center - flame_height//2),
            (center - flame_width//2, center + flame_height//2),
            (center + flame_width//2, center + flame_height//2)
        ]
        draw.polygon(points, fill="white")
        
    elif icon_type == "summary":
        # Chart icon
        bar_width = size // 8
        bar_spacing = size // 12
        start_x = size // 4
        heights = [size//3, size//2, size//4, size//2, size//3]
        for i, height in enumerate(heights):
            x = start_x + i * (bar_width + bar_spacing)
            y = center - height//2
            draw.rectangle([x, y, x + bar_width, y + height], fill="white")
    
    return img

def generate_pwa_icons():
    """Generate all required PWA icons."""
    icons = [
        {"name": "icon-16x16.png", "size": 16, "color": "#4F46E5"},
        {"name": "icon-32x32.png", "size": 32, "color": "#4F46E5"},
        {"name": "icon-72x72.png", "size": 72, "color": "#4F46E5"},
        {"name": "icon-96x96.png", "size": 96, "color": "#4F46E5"},
        {"name": "icon-128x128.png", "size": 128, "color": "#4F46E5"},
        {"name": "icon-144x144.png", "size": 144, "color": "#4F46E5"},
        {"name": "icon-152x152.png", "size": 152, "color": "#4F46E5"},
        {"name": "icon-180x180.png", "size": 180, "color": "#4F46E5"},
        {"name": "icon-192x192.png", "size": 192, "color": "#4F46E5"},
        {"name": "icon-384x384.png", "size": 384, "color": "#4F46E5"},
        {"name": "icon-512x512.png", "size": 512, "color": "#4F46E5"},
    ]
    
    for icon in icons:
        img = create_base_icon(icon["size"], icon["color"], "SS")
        img.save(f"public/icons/{icon['name']}")
        print(f"Created {icon['name']}")

def generate_notification_icons():
    """Generate notification icons."""
    icons = [
        {"name": "icon.png", "size": 192, "color": "#10B981", "text": "SS"},
        {"name": "badge.png", "size": 72, "color": "#EF4444", "text": "!"},
        {"name": "study.png", "size": 64, "color": "#3B82F6", "type": "study"},
        {"name": "streak.png", "size": 64, "color": "#F59E0B", "type": "streak"},
        {"name": "summary.png", "size": 64, "color": "#8B5CF6", "type": "summary"},
    ]
    
    for icon in icons:
        if "type" in icon:
            img = create_notification_icon(icon["size"], icon["type"], icon["color"])
        else:
            img = create_base_icon(icon["size"], icon["color"], icon["text"])
        img.save(f"public/icons/{icon['name']}")
        print(f"Created {icon['name']}")

def generate_apple_startup_image():
    """Generate Apple startup image."""
    width, height = 1125, 2436
    img = Image.new('RGB', (width, height), "#4F46E5")
    draw = ImageDraw.Draw(img)
    
    # Add app name and logo
    try:
        font = ImageFont.truetype("arial.ttf", 80)
    except:
        font = ImageFont.load_default()
    
    # Logo
    logo_size = 200
    logo_x = (width - logo_size) // 2
    logo_y = (height - logo_size) // 2 - 100
    draw.rounded_rectangle(
        [logo_x, logo_y, logo_x + logo_size, logo_y + logo_size],
        fill="white",
        radius=40
    )
    
    # Text
    text = "Study Sentinel"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = (width - text_width) // 2
    text_y = logo_y + logo_size + 50
    draw.text((text_x, text_y), text, fill="white", font=font)
    
    img.save("public/icons/apple-startup-1125x2436.png")
    print("Created apple-startup-1125x2436.png")

def generate_screenshots():
    """Generate screenshot images for PWA manifest."""
    # Desktop screenshot (1280x720)
    desktop_img = Image.new('RGB', (1280, 720), "#1c192c")
    draw = ImageDraw.Draw(desktop_img)
    
    # Draw a simple app interface mockup
    header_height = 80
    draw.rectangle([0, 0, 1280, header_height], fill="#4F46E5")
    
    try:
        font = ImageFont.truetype("arial.ttf", 40)
        small_font = ImageFont.truetype("arial.ttf", 24)
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    draw.text((40, 25), "Study Sentinel", fill="white", font=font)
    
    # Draw some mock content
    draw.text((40, 120), "Today's Study Progress", fill="white", font=small_font)
    draw.rectangle([40, 160, 600, 200], fill="#7c3aed", outline="white", width=2)
    draw.text((60, 175), "Mathematics: 2h 30m", fill="white", font=small_font)
    
    draw.rectangle([40, 220, 600, 260], fill="#7c3aed", outline="white", width=2)
    draw.text((60, 235), "Physics: 1h 45m", fill="white", font=small_font)
    
    desktop_img.save("public/icons/screenshot-desktop.png")
    print("Created screenshot-desktop.png")
    
    # Mobile screenshot (375x667)
    mobile_img = Image.new('RGB', (375, 667), "#1c192c")
    draw = ImageDraw.Draw(mobile_img)
    
    # Draw mobile interface mockup
    header_height = 60
    draw.rectangle([0, 0, 375, header_height], fill="#4F46E5")
    
    try:
        font = ImageFont.truetype("arial.ttf", 24)
        small_font = ImageFont.truetype("arial.ttf", 18)
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    draw.text((20, 18), "Study Sentinel", fill="white", font=font)
    
    # Draw mobile content
    draw.text((20, 100), "Today's Study", fill="white", font=small_font)
    draw.rectangle([20, 130, 335, 170], fill="#7c3aed", outline="white", width=2)
    draw.text((30, 145), "Mathematics: 2h 30m", fill="white", font=small_font)
    
    draw.rectangle([20, 180, 335, 220], fill="#7c3aed", outline="white", width=2)
    draw.text((30, 195), "Physics: 1h 45m", fill="white", font=small_font)
    
    mobile_img.save("public/icons/screenshot-mobile.png")
    print("Created screenshot-mobile.png")

def generate_browserconfig():
    """Generate browserconfig.xml for Windows tiles."""
    config = '''<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="/icons/icon-70x70.png"/>
      <square150x150logo src="/icons/icon-150x150.png"/>
      <square310x310logo src="/icons/icon-310x310.png"/>
      <TileColor>#4F46E5</TileColor>
    </tile>
  </msapplication>
</browserconfig>'''
    
    with open("public/icons/browserconfig.xml", "w") as f:
        f.write(config)
    print("Created browserconfig.xml")

def main():
    """Generate all missing assets."""
    print("Generating PWA icons and assets...")
    
    # Change to the correct directory
    os.chdir("C:\\Users\\HP\\Music\\Copiolet\\study_sentinel")
    
    # Generate all assets
    generate_pwa_icons()
    generate_notification_icons()
    generate_apple_startup_image()
    generate_screenshots()
    generate_browserconfig()
    
    print("\nAll assets generated successfully!")
    print("Generated files:")
    
    # List generated files
    if os.path.exists("public/icons"):
        files = os.listdir("public/icons")
        for file in sorted(files):
            file_path = os.path.join("public/icons", file)
            if os.path.isfile(file_path):
                size = os.path.getsize(file_path)
                print(f"  • {file} ({size} bytes)")

if __name__ == "__main__":
    main()