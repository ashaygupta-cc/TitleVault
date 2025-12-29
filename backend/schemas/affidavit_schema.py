from pydantic import BaseModel

class VerifyAffidavitSignatureRequest(BaseModel):
    affidavit_hash: str
    signature: str
    signer: str

class VerifyFullRequest(BaseModel):
    record_hash: str
    affidavit_hash: str
    signature: str
    signer: str
