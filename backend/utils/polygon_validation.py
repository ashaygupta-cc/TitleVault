# backend/utils/polygon_validation.py

from shapely.geometry import Polygon
from shapely.ops import unary_union
from utils.area import geodesic_area_m2


def validate_subdivision(
    parent_polygon_coords,
    children_polygons_coords,
    tolerance=0.01,  # 1%
):
    parent_poly = Polygon(parent_polygon_coords)
    parent_area = geodesic_area_m2(parent_poly)

    child_polys = [Polygon(c) for c in children_polygons_coords]

    # ---- containment
    for p in child_polys:
        if not parent_poly.contains(p):
            raise ValueError("Child polygon is outside parent boundary")

    # ---- overlap detection
    union = unary_union(child_polys)
    union_area = geodesic_area_m2(union)

    if union_area > parent_area * (1 + tolerance):
        raise ValueError("Subdivision polygons overlap")

    # ---- conservation check
    if union_area < parent_area * (1 - tolerance):
        return {
            "residual_required": True,
            "parent_area": parent_area,
            "children_area": union_area,
            "residual_area": parent_area - union_area,
            "union": union,
        }

    return {
        "residual_required": False,
        "parent_area": parent_area,
        "children_area": union_area,
        "union": union,
    }
