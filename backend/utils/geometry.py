import json
from shapely.geometry import Polygon as ShapelyPolygon, MultiPolygon
from shapely.ops import unary_union


def aggregate_child_polygons(children):
    """
    Aggregate child polygons into a single geometry.

    Returns:
        List of [lon, lat] coordinates representing the exterior boundary,
        or None if no valid polygons exist.
    """

    if not children:
        return None

    polygons = []

    for c in children:
        canonical = json.loads(c.canonical_json)
        coords = canonical.get("polygon")

        if coords and len(coords) >= 4:
            polygons.append(ShapelyPolygon(coords))

    if not polygons:
        return None

    union = unary_union(polygons)

    # Handle MultiPolygon safely
    if isinstance(union, MultiPolygon):
        union = max(union.geoms, key=lambda g: g.area)

    return list(union.exterior.coords)
