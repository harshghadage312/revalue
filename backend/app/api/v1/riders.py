from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, status, Query
from app.schemas.riders import (
    RiderRegisterRequest, RiderProfileResponse, RiderStatusUpdateRequest,
    RiderLocationUpdateRequest, JobReportFailureRequest, JobPickupConfirmRequest,
    JobDeliveryOtpVerifyRequest
)
from app.services.rider_service import RiderService
from app.services.auth_service import require_role, get_current_user

router = APIRouter(prefix="/riders", tags=["Delivery Partners (Riders)"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_delivery_partner(req: RiderRegisterRequest):
    """
    Public registration endpoint for new delivery partners.
    Creates account with 'rider' role and queues application for administrator review.
    """
    return RiderService.register_rider(req)


@router.get("/me/profile")
def get_my_rider_profile(current_user: Dict[str, Any] = Depends(require_role("rider"))):
    """
    Retrieves the authenticated delivery partner's profile and application verification status.
    """
    return RiderService.get_profile_by_user(current_user["id"])


@router.put("/me/status")
def toggle_availability_status(
    req: RiderStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role("rider"))
):
    """
    Toggles delivery partner operational availability (online/offline).
    Requires approved application status.
    """
    return RiderService.update_online_status(current_user["id"], req.is_online)


@router.post("/me/location")
def update_current_location(
    req: RiderLocationUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role("rider"))
):
    """
    Updates delivery partner's latest geographical coordinates or service pincode.
    Used for proximity matching and dispatching.
    """
    return RiderService.update_location(current_user["id"], req)


@router.get("/me/jobs/available")
def list_available_jobs(current_user: Dict[str, Any] = Depends(require_role("rider"))):
    """
    Fetches open delivery job offers within the rider's active service areas.
    """
    return RiderService.list_available_jobs(current_user["id"])


@router.get("/me/jobs/active")
def get_current_active_job(current_user: Dict[str, Any] = Depends(require_role("rider"))):
    """
    Retrieves the currently assigned active delivery in progress.
    """
    job = RiderService.get_active_job(current_user["id"])
    return {"active_job": job}


@router.post("/me/jobs/{job_id}/accept")
def accept_delivery_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(require_role("rider"))
):
    """
    Atomically accepts an available delivery job assignment.
    Prevents race conditions between multiple delivery partners.
    """
    return RiderService.accept_job(current_user["id"], job_id)


@router.post("/me/jobs/{job_id}/reject")
def decline_delivery_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(require_role("rider"))
):
    """
    Declines an offered job. Opens assignment for other eligible riders in the area.
    """
    return RiderService.reject_job(current_user["id"], job_id)


@router.post("/me/jobs/{job_id}/arrived-pickup")
def mark_arrived_at_pickup(
    job_id: str,
    current_user: Dict[str, Any] = Depends(require_role("rider"))
):
    """
    Marks that the delivery partner has physically arrived at the seller pickup location.
    """
    return RiderService.mark_arrived_pickup(current_user["id"], job_id)


@router.post("/me/jobs/{job_id}/pickup")
def confirm_parcel_pickup(
    job_id: str,
    req: Optional[JobPickupConfirmRequest] = None,
    current_user: Dict[str, Any] = Depends(require_role("rider"))
):
    """
    Confirms physical package handover from the seller.
    Transitions order to in_transit and issues buyer delivery verification OTP.
    """
    notes = req.notes if req else None
    return RiderService.confirm_pickup(current_user["id"], job_id, notes=notes)


@router.post("/me/jobs/{job_id}/start-delivery")
def start_out_for_delivery(
    job_id: str,
    current_user: Dict[str, Any] = Depends(require_role("rider"))
):
    """
    Transitions job status to out_for_delivery on the final doorstep leg.
    """
    return RiderService.start_delivery(current_user["id"], job_id)


@router.post("/me/jobs/{job_id}/verify-delivery-otp")
def verify_doorstep_otp(
    job_id: str,
    req: JobDeliveryOtpVerifyRequest,
    current_user: Dict[str, Any] = Depends(require_role("rider"))
):
    """
    Verifies buyer's 6-digit delivery OTP to securely complete the delivery.
    Unlocks rider compensation eligibility and triggers the 48-Hour Buyer Inspection Window.
    """
    return RiderService.verify_delivery_otp_and_complete(
        user_id=current_user["id"],
        job_id=job_id,
        entered_otp=req.entered_otp,
        notes=req.notes
    )


@router.post("/me/jobs/{job_id}/report-failure")
def report_delivery_failure(
    job_id: str,
    req: JobReportFailureRequest,
    current_user: Dict[str, Any] = Depends(require_role("rider"))
):
    """
    Reports a delivery failure or exception (e.g. buyer unavailable, address incorrect, damaged parcel).
    """
    return RiderService.report_failure(
        user_id=current_user["id"],
        job_id=job_id,
        reason=req.reason,
        notes=req.notes
    )


@router.get("/me/earnings")
def get_rider_earnings_summary(current_user: Dict[str, Any] = Depends(require_role("rider"))):
    """
    Returns recorded delivery partner earnings, completed deliveries, and payout statuses.
    """
    return RiderService.get_rider_earnings(current_user["id"])


@router.get("/me/history")
def get_rider_job_history(current_user: Dict[str, Any] = Depends(require_role("rider"))):
    """
    Returns historical list of handled delivery assignments.
    """
    return RiderService.get_rider_history(current_user["id"])
