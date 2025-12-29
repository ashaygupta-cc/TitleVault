from pydantic import BaseModel
from typing import List, Optional


class MerkleRootResponse(BaseModel):
    merkle_root: Optional[str]
    count: int


class MerkleProofItem(BaseModel):
    hash: str
    position: str  # "left" or "right"


class MerkleProofResponse(BaseModel):
    record_hash: str
    index: int
    proof: List[str]
    root: str

class MerkleVerifyRequest(BaseModel):
    record_hash: str
    index: int
    proof: list[str]
    root: str


class MerkleVerifyResponse(BaseModel):
    valid: bool
    computed_root: str
    expected_root: str

class MerkleVerifyPublicRequest(BaseModel):
    leaf: str          
    proof: list[str]   
    index: int
    root: str         


class MerkleVerifyPublicResponse(BaseModel):
    valid: bool
    computed_root: str
