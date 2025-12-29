# area_worker.py
import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from shapely.geometry import shape
from shapely.ops import transform
import pyproj
from functools import partial
from config import settings
from models import PropertyRecord

DATABASE_URL = settings.DATABASE_URL
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


# ---------------------------------------
# UTM zone logic
# ---------------------------------------
def utm_zone(longitude):
    return int((longitude + 180) / 6) + 1


def utm_crs_for_lonlat(lon, lat):
    zone = utm_zone(lon)
    if lat >= 0:
        return f"+proj=utm +zone={zone} +datum=WGS84 +units=m +no_defs +type=crs"
    else:
        return f"+proj=utm +zone={zone} +south +datum=WGS84 +units=m +no_defs +type=crs"


# ---------------------------------------
# Accurate projected area computation
# ---------------------------------------
def compute_projected_area(geojson_geom):
    geom_shape = shape(geojson_geom)

    # Determine CRS based on centroid
    centroid = geom_shape.centroid
    lon, lat = centroid.x, centroid.y

    utm_crs = pyproj.CRS(utm_crs_for_lonlat(lon, lat))

    transformer = pyproj.Transformer.from_crs(
        pyproj.CRS("EPSG:4326"), utm_crs, always_xy=True
    )

    projected = transform(transformer.transform, geom_shape)
    return projected.area  # m²


# ---------------------------------------
# Main Batch Worker
# ---------------------------------------
def run_once(limit=50):
    session = Session()

    # Fetch only uncomputed records
    records = (
        session.query(PropertyRecord)
        .filter(PropertyRecord.area_m2 == None)
        .limit(limit)
        .all()
    )

    for r in records:
        try:
            canonical = r.canonical_json
            coords = canonical.get("polygon")

            if not coords:
                print(f"Skipping {r.id} (no polygon)")
                continue

            # Wrap polygon into valid GeoJSON
            geojson_geom = {
                "type": "Polygon",
                "coordinates": [coords]  # polygon array must be nested
            }

            # Compute accurate area
            area = compute_projected_area(geojson_geom)

            # Update using raw SQL (ORM alone won't handle geometry correctly)
            session.execute(
                text("""
                    UPDATE property_records
                    SET area_m2 = :area,
                        geom = ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)
                    WHERE id = :id
                """),
                {
                    "area": float(area),
                    "geojson": json.dumps(geojson_geom),
                    "id": str(r.id)
                }
            )

            print(f"Updated record {r.id} — Area = {area:.2f} m²")

        except Exception as e:
            print(f"Error processing {r.id} → {e}")

    session.commit()
    session.close()


if __name__ == "__main__":
    run_once()
