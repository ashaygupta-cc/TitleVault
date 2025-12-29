# backend/utils/area.py

from shapely.ops import transform
from pyproj import Transformer

_transformer = Transformer.from_crs(
    "EPSG:4326",
    "EPSG:6933",  # Equal-area projection
    always_xy=True
)

def geodesic_area_m2(geom):
    projected = transform(_transformer.transform, geom)
    return abs(projected.area)
