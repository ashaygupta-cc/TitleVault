from shapely.geometry import Polygon
from shapely.ops import unary_union

def validate_subdivision(parent_coords, child_polygons):
    parent = Polygon(parent_coords)

    print("🔍 Parent area:", parent.area)

    children = [Polygon(p) for p in child_polygons]

    for idx, c in enumerate(children):
        if not c.within(parent):
            raise ValueError(f"Child {idx} outside parent")

    union = unary_union(children)

    if union.area > parent.area:
        raise ValueError("Child area exceeds parent")

    if abs(union.area - sum(c.area for c in children)) > 1e-6:
        raise ValueError("Overlapping child polygons")

    print("✅ Subdivision geometry valid")
