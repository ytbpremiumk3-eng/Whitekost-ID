from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PIN = "060896"
USER_PIN = "010735"

TOKEN_TO_ROLE = {
    "kost-admin-token-060896": "admin",
    "kost-viewer-token-010735": "user",
}
PIN_TO_TOKEN = {
    ADMIN_PIN: "kost-admin-token-060896",
    USER_PIN: "kost-viewer-token-010735",
}


def build_room_list():
    rooms = []
    for prefix in ("A", "B", "C", "D"):
        for i in range(1, 12):  # 1..11
            rooms.append(f"{prefix}{i}")
    for floor in (1, 2, 3, 4):  # 101..106, 201..206, ...
        for i in range(1, 7):
            rooms.append(f"{floor}0{i}")
    return rooms  # total 44 + 24 = 68? let's check: 4*11=44 + 4*6=24 = 68

# User said 67 total but math gives 68 -> per user's ranges A1-A11(11) x4=44, 101-106(6) x4=24, total 68.
# We honor the ranges the user listed.
ROOMS = build_room_list()

app = FastAPI(title="Kost KTP Manager")
api_router = APIRouter(prefix="/api")


class LoginRequest(BaseModel):
    pin: str


class LoginResponse(BaseModel):
    token: str
    role: str


class Room(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nomor_kamar: str
    is_occupied: bool = False
    nama_penghuni: str = ""
    foto_ktp: str = ""
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class RoomUpdate(BaseModel):
    is_occupied: Optional[bool] = None
    nama_penghuni: Optional[str] = None
    foto_ktp: Optional[str] = None


async def get_current_role(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Token tidak ditemukan")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Format Authorization tidak valid")
    token = parts[1]
    role = TOKEN_TO_ROLE.get(token)
    if not role:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    return role


async def require_admin(role: str = Depends(get_current_role)) -> str:
    if role != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak: khusus admin")
    return role


@app.on_event("startup")
async def seed_rooms():
    existing = await db.rooms.count_documents({})
    if existing == 0:
        docs = [Room(nomor_kamar=n).model_dump() for n in ROOMS]
        await db.rooms.insert_many(docs)
    else:
        # ensure any newly-added rooms exist
        existing_docs = await db.rooms.find({}, {"_id": 0, "nomor_kamar": 1}).to_list(1000)
        existing_set = {d["nomor_kamar"] for d in existing_docs}
        missing = [Room(nomor_kamar=n).model_dump() for n in ROOMS if n not in existing_set]
        if missing:
            await db.rooms.insert_many(missing)


def sort_key(nomor: str):
    # Sort A1..A11 numerically, then B, C, D, then 101..406
    if nomor and nomor[0].isalpha():
        return (0, nomor[0], int(nomor[1:]))
    return (1, "", int(nomor))


@api_router.get("/")
async def root():
    return {"message": "Kost KTP Manager API"}


@api_router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    pin = (payload.pin or "").strip()
    token = PIN_TO_TOKEN.get(pin)
    if not token:
        raise HTTPException(status_code=401, detail="PIN salah")
    role = TOKEN_TO_ROLE[token]
    return LoginResponse(token=token, role=role)


@api_router.get("/auth/me")
async def me(role: str = Depends(get_current_role)):
    return {"role": role}


@api_router.get("/rooms", response_model=List[Room])
async def list_rooms(role: str = Depends(get_current_role)):
    docs = await db.rooms.find({}, {"_id": 0}).to_list(1000)
    # Viewer sees only occupied rooms
    if role == "user":
        docs = [d for d in docs if d.get("is_occupied")]
    docs.sort(key=lambda d: sort_key(d["nomor_kamar"]))
    return [Room(**d) for d in docs]


@api_router.put("/rooms/{nomor_kamar}", response_model=Room)
async def update_room(
    nomor_kamar: str,
    payload: RoomUpdate,
    _: str = Depends(require_admin),
):
    existing = await db.rooms.find_one({"nomor_kamar": nomor_kamar}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Kamar tidak ditemukan")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}

    # If setting to empty, always clear name & foto
    if updates.get("is_occupied") is False:
        updates["nama_penghuni"] = ""
        updates["foto_ktp"] = ""

    # If marking occupied, require name + foto in the payload OR existing
    merged_preview = {**existing, **updates}
    if merged_preview.get("is_occupied"):
        if not (merged_preview.get("nama_penghuni") and merged_preview.get("foto_ktp")):
            raise HTTPException(
                status_code=400,
                detail="Nama penghuni dan foto KTP wajib untuk kamar terisi",
            )

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.rooms.update_one({"nomor_kamar": nomor_kamar}, {"$set": updates})
    merged = {**existing, **updates}
    return Room(**merged)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
