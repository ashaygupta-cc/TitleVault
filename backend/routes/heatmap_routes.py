# backend/routes/heatmap_routes.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from decimal import Decimal

from models import Agreement, AgreementStatus, get_db
from routes.agreement_enforcement_routes import enforce_agreement
from gis.heatmap_utils import (
    resolve_agreement_geometry,
    build_heatmap_feature,
)

router = APIRouter(
    tags=["Heatmaps"]
)

# ======================================================
# AGREEMENT VALUE HEATMAP
# ======================================================

@router.get("/agreements/value")
def agreement_value_heatmap(db: Session = Depends(get_db)):
    agreements = db.query(Agreement).filter(
        Agreement.status == AgreementStatus.ACTIVE
    ).all()

    features = []

    for a in agreements:
        geom = resolve_agreement_geometry(a, db)
        if not geom:
            continue

        total_value = Decimal(
            a.canonical_json.get("total_price", 0)
        )

        features.append(
            build_heatmap_feature(
                agreement=a,
                geom=geom,
                value=total_value,
                metric="agreement_value",
            )
        )

    return {
        "type": "FeatureCollection",
        "metric": "agreement_value",
        "features": features,
    }


# ======================================================
# VALUE DENSITY (₹ / m²)
# ======================================================

@router.get("/agreements/value-density")
def agreement_value_density(db: Session = Depends(get_db)):
    agreements = db.query(Agreement).filter(
        Agreement.status == AgreementStatus.ACTIVE
    ).all()

    features = []

    for a in agreements:
        geom = resolve_agreement_geometry(a, db)
        if not geom or geom.area == 0:
            continue

        total_value = Decimal(
            a.canonical_json.get("total_price", 0)
        )

        density = total_value / Decimal(geom.area)

        features.append(
            build_heatmap_feature(
                agreement=a,
                geom=geom,
                value=density,
                metric="value_density",
            )
        )

    return {
        "type": "FeatureCollection",
        "metric": "value_density",
        "features": features,
    }


# ======================================================
# DEFAULT RISK HEATMAP
# ======================================================

@router.get("/agreements/default-risk")
def agreement_default_risk_heatmap(db: Session = Depends(get_db)):
    agreements = db.query(Agreement).filter(
        Agreement.status == AgreementStatus.ACTIVE
    ).all()

    features = []

    for a in agreements:
        snapshot = enforce_agreement(str(a.id), db)
        if not snapshot.get("default_risk"):
            continue

        geom = resolve_agreement_geometry(a, db)
        if not geom:
            continue

        risk_value = Decimal(
            snapshot["amount_due_till_now"]
        )

        features.append(
            build_heatmap_feature(
                agreement=a,
                geom=geom,
                value=risk_value,
                metric="default_risk",
            )
        )

    return {
        "type": "FeatureCollection",
        "metric": "default_risk",
        "features": features,
    }
