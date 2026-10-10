import os
from pathlib import Path
import requests
from metadata_cleaner import clean_media, inspect_metadata

# Let's test downloading a real Instagram photo and cleaning it
img_url = "https://scontent-poa1-1.cdninstagram.com/v/t51.82787-15/776658713_18361764787300636_2360384877395022872_n.jpg?stp=dst-jpg_e35_tt6&_nc_ht=scontent-poa1-1.cdninstagram.com&_nc_cat=105&_nc_oc=Q6cZ2QElP9Z33F0X2J_Qz4L5f2Q&edm=AOQ1Ao0BAAAA&ccb=7-5&oh=00_AYBqGk0Y8G_x19&oe=66E6A7D9"

# Let's see what happens if we download from CDN or fallback
r = requests.get("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500", headers={'User-Agent': 'Mozilla/5.0'})
raw_test_img = Path("storage/test_raw.jpg")
raw_test_img.parent.mkdir(parents=True, exist_ok=True)
raw_test_img.write_bytes(r.content)

clean_test_img = Path("storage/test_clean.jpg")
res = clean_media(str(raw_test_img), str(clean_test_img), make_brand_new=True)
print("Clean result:", res)

# Inspect cleaned file
inspection = inspect_metadata(str(clean_test_img))
print("Inspection after clean:")
print("  Filename:", inspection["filename"])
print("  Metadata found count:", len(inspection["metadata_found"]))
print("  Risk indicators:", inspection["risk_indicators"])
