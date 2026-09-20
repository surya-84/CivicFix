from fastapi import APIRouter, Query
from services.gis_service import lookup_ward, get_department_for_category

router = APIRouter()


@router.get("/lookup")
def ward_lookup(lat: float = Query(...), lng: float = Query(...)):
    return lookup_ward(lat, lng)


@router.get("/department")
def department_lookup(
    category: str = Query(...),
    ward: str     = Query(...),
):
    return {"department": get_department_for_category(category, ward)}
