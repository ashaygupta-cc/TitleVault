"""PDF Affidavit Verification Routes"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from uuid import UUID
from models import get_db, PropertyRecord, FlatUnit, Agreement, AuditLog
from affidavit.pdf_verifier import verify_pdf_affidavit
from web3 import Web3
from deps.auth import get_current_user
from datetime import datetime
from utils.activity_logger import log_user_activity

router = APIRouter(tags=["PDF Verification"])


@router.post("/verify-pdf-registry")
async def verify_registry_affidavit_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Verify a registry affidavit PDF by extracting fields
    and comparing against blockchain records.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "File must be a PDF")

    try:
        pdf_bytes = await file.read()
        
        # Run verification
        result = verify_pdf_affidavit(pdf_bytes)
        
        # Debug logging
        print("\n" + "="*60)
        print("🔍 PDF VERIFICATION DEBUG - REGISTRY")
        print("="*60)
        print(f"Extracted fields:")
        print(f"  - affidavit_hash: {result['extracted_fields'].get('affidavit_hash', 'N/A')}")
        print(f"  - owner_address: {result['extracted_fields'].get('owner_address', 'N/A')}")
        print(f"  - signature: {result['extracted_fields'].get('signature', 'N/A')}")
        if result['extracted_fields'].get('signature'):
            sig = result['extracted_fields'].get('signature')
            print(f"  - signature length: {len(sig)}")
        print(f"Verification checks:")
        for check_name, check_result in result['verification_checks'].items():
            print(f"  - {check_name}: {check_result.get('passed', False)}")
            if not check_result.get('passed') and check_result.get('error'):
                print(f"    Error: {check_result['error']}")
        print("="*60 + "\n")
        
        if not result["success"]:
            raise HTTPException(400, f"PDF read failed: {', '.join(result['errors'])}")

        # Try to fetch database record if hash was extracted
        extracted_hash = result["extracted_fields"].get("affidavit_hash")
        if extracted_hash:
            # Try to find matching record by hash
            clean_hash = extracted_hash[2:] if extracted_hash.startswith("0x") else extracted_hash
            try:
                record = db.query(PropertyRecord).filter(
                    PropertyRecord.record_hash == bytes.fromhex(clean_hash)
                ).first()
                
                if record:
                    db_data = {
                        "affidavit_hash": "0x" + record.record_hash.hex(),
                        "owner_address": record.owner_address or "",
                    }
                    result["database_record_found"] = True
                    result["verification_checks"]["hash_matches_database"] = {
                        "passed": True,
                        "pdf_value": extracted_hash,
                        "database_value": db_data["affidavit_hash"],
                    }
            except:
                result["database_record_found"] = False

        # Log activity if user is authenticated
        if current_user:
            log_user_activity(
                db, current_user, "verified_registry_affidavit",
                metadata={
                    "filename": file.filename,
                    "hash_extracted": extracted_hash,
                    "verification_passed": result.get("verification_checks", {}).get("signature_valid", {}).get("passed", False),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"PDF verification error: {str(e)}")


@router.post("/verify-pdf-flat")
async def verify_flat_affidavit_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Verify a flat affidavit PDF by extracting fields
    and comparing against database records.
    """
    print(f"\n[PDF VERIFY FLAT] Endpoint called, current_user: {current_user}")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "File must be a PDF")

    try:
        pdf_bytes = await file.read()
        
        # Run verification
        result = verify_pdf_affidavit(pdf_bytes)
        
        # Debug logging
        print("\n" + "="*60)
        print("🔍 PDF VERIFICATION DEBUG - FLAT")
        print("="*60)
        print(f"Extracted fields:")
        print(f"  - affidavit_hash: {result['extracted_fields'].get('affidavit_hash', 'N/A')}")
        print(f"  - owner_address: {result['extracted_fields'].get('owner_address', 'N/A')}")
        print(f"  - signature: {result['extracted_fields'].get('signature', 'N/A')}")
        if result['extracted_fields'].get('signature'):
            sig = result['extracted_fields'].get('signature')
            print(f"  - signature length: {len(sig)}")
        print(f"Verification checks:")
        for check_name, check_result in result['verification_checks'].items():
            print(f"  - {check_name}: {check_result.get('passed', False)}")
            if not check_result.get('passed') and check_result.get('error'):
                print(f"    Error: {check_result['error']}")
        print("="*60 + "\n")
        
        if not result["success"]:
            raise HTTPException(400, f"PDF read failed: {', '.join(result['errors'])}")

        # Try to fetch database record if flat_id was extracted
        extracted_flat_id = result["extracted_fields"].get("flat_id")
        if extracted_flat_id:
            try:
                flat = db.query(FlatUnit).filter(
                    FlatUnit.flat_id.cast(str) == extracted_flat_id
                ).first()
                
                if flat:
                    result["database_record_found"] = True
                    result["verification_checks"]["flat_id_matches_database"] = {
                        "passed": True,
                        "pdf_value": extracted_flat_id,
                        "database_value": str(flat.flat_id),
                    }
                else:
                    result["database_record_found"] = False
            except:
                result["database_record_found"] = False

        # Log activity if user is authenticated
        if current_user:
            log_user_activity(
                db, current_user, "verified_flat_affidavit",
                metadata={
                    "filename": file.filename,
                    "flat_id_extracted": extracted_flat_id,
                    "verification_passed": result.get("verification_checks", {}).get("signature_valid", {}).get("passed", False),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"PDF verification error: {str(e)}")


@router.post("/verify-pdf-agreement")
async def verify_agreement_affidavit_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Verify an agreement affidavit PDF by extracting fields
    and comparing against database records.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "File must be a PDF")

    try:
        pdf_bytes = await file.read()
        
        # Run verification
        result = verify_pdf_affidavit(pdf_bytes)
        
        # Debug logging
        print("\n" + "="*60)
        print("🔍 PDF VERIFICATION DEBUG - AGREEMENT")
        print("="*60)
        print(f"Extracted fields:")
        print(f"  - affidavit_hash: {result['extracted_fields'].get('affidavit_hash', 'N/A')}")
        print(f"  - owner_address: {result['extracted_fields'].get('owner_address', 'N/A')}")
        print(f"  - signature: {result['extracted_fields'].get('signature', 'N/A')}")
        if result['extracted_fields'].get('signature'):
            sig = result['extracted_fields'].get('signature')
            print(f"  - signature length: {len(sig)}")
        print(f"Verification checks:")
        for check_name, check_result in result['verification_checks'].items():
            print(f"  - {check_name}: {check_result.get('passed', False)}")
            if not check_result.get('passed') and check_result.get('error'):
                print(f"    Error: {check_result['error']}")
        print("="*60 + "\n")
        
        if not result["success"]:
            raise HTTPException(400, f"PDF read failed: {', '.join(result['errors'])}")

        # Try to fetch database record if agreement_id was extracted
        extracted_agreement_id = result["extracted_fields"].get("agreement_id")
        if extracted_agreement_id:
            try:
                agreement = db.query(Agreement).filter(
                    Agreement.agreement_id.cast(str) == extracted_agreement_id
                ).first()
                
                if agreement:
                    result["database_record_found"] = True
                    result["verification_checks"]["agreement_id_matches_database"] = {
                        "passed": True,
                        "pdf_value": extracted_agreement_id,
                        "database_value": str(agreement.agreement_id),
                    }
                else:
                    result["database_record_found"] = False
            except:
                result["database_record_found"] = False

        # Log activity if user is authenticated
        if current_user:
            log_user_activity(
                db, current_user, "verified_agreement_affidavit",
                metadata={
                    "filename": file.filename,
                    "agreement_id_extracted": extracted_agreement_id,
                    "verification_passed": result.get("verification_checks", {}).get("signature_valid", {}).get("passed", False),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"PDF verification error: {str(e)}")
