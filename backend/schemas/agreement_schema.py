from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import date
from decimal import Decimal


AgreementType = Literal["SALE", "LEASE"]
SubjectType = Literal["LAND", "FLAT"]
AgreementStatus = Literal[
    "DRAFT",
    "ACTIVE",
    "COMPLETED",
    "DEFAULTED",
    "CANCELLED",
]


# -------------------------------------------------
# PAYMENT SCHEDULE
# -------------------------------------------------

class PaymentScheduleItem(BaseModel):
    amount: Decimal = Field(..., example="250000.00")
    due_in_days: int = Field(..., example=30)


# -------------------------------------------------
# CREATE AGREEMENT
# -------------------------------------------------

class CreateAgreementRequest(BaseModel):
    subject_type: SubjectType          # LAND | FLAT
    subject_id: str                    # record_hash (0x...) or flat_id

    buyer_address: str
    seller_address: str

    total_price: Decimal
    paid_upfront: Decimal

    schedule: List[PaymentScheduleItem]

    agreement_type: AgreementType
    lease_end_date: Optional[date] = None


# -------------------------------------------------
# READ / CREATE RESPONSE
# -------------------------------------------------

class AgreementResponse(BaseModel):
    agreement_id: str
    agreement_hash: str
    status: AgreementStatus
    subject_id: str
    subject_type: SubjectType


# -------------------------------------------------
# ACTION RESPONSE (ACTIVATE / CLOSE)
# -------------------------------------------------

class AgreementActionResponse(BaseModel):
    agreement_id: str
    status: str
    tx_hash: str
