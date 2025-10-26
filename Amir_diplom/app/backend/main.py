from fastapi import FastAPI, Depends, HTTPException, status, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from . import crud, schemas, database, models
from typing import List, Optional
from datetime import datetime, timedelta
from .auth import get_current_user, get_current_active_user, authenticate_user, create_access_token, get_password_hash
from .config import settings

app = FastAPI(title="Salon Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend"), name="static")

templates = Jinja2Templates(directory="frontend")

@app.on_event("startup")
async def startup():
    await database.init_db()
    async with database.AsyncSessionLocal() as db:
        result = await db.execute(select(models.User).where(models.User.username == "admin"))
        user = result.scalar_one_or_none()
        if not user:
            admin_user = models.User(
                username="admin",
                email="admin@salon.com",
                hashed_password=get_password_hash("admin123"),
                is_admin=True
            )
            db.add(admin_user)
            await db.commit()

        result = await db.execute(select(models.Service))
        services = result.scalars().all()
        if not services:
            demo_services = [
                models.Service(
                    name="Стрижка женская",
                    price=1500.0,
                    duration=60,
                    description="Стрижка и укладка"
                ),
                models.Service(
                    name="Стрижка мужская", 
                    price=800.0,
                    duration=30,
                    description="Стрижка машинкой или ножницами"
                ),
                models.Service(
                    name="Окрашивание",
                    price=2500.0,
                    duration=120,
                    description="Окрашивание волос"
                ),
                models.Service(
                    name="Маникюр",
                    price=1000.0,
                    duration=60,
                    description="Классический маникюр"
                ),
            ]
            for service in demo_services:
                db.add(service)
            await db.commit()

@app.post("/token")
async def login_for_access_token(
    username: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(database.get_db)
):
    user = await authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register")
async def register_user(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(database.get_db)
):
    result = await db.execute(select(models.User).where(models.User.username == username))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    new_user = models.User(
        username=username,
        email=email,
        hashed_password=get_password_hash(password),
        is_admin=False
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": new_user.id,
        "username": new_user.username,
        "is_admin": new_user.is_admin
    }

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(get_current_active_user)):
    return current_user

@app.post("/clients/", response_model=schemas.Client)
async def create_client(client: schemas.ClientCreate, db: AsyncSession = Depends(database.get_db)):
    return await crud.create_client(db=db, client=client)

@app.get("/clients/", response_model=List[schemas.Client])
async def read_clients(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(database.get_db)):
    clients = await crud.get_clients(db, skip=skip, limit=limit)
    return clients

@app.post("/services/", response_model=schemas.Service)
async def create_service(service: schemas.ServiceCreate, db: AsyncSession = Depends(database.get_db)):
    return await crud.create_service(db=db, service=service)

@app.get("/services/", response_model=List[schemas.Service])
async def read_services(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(database.get_db)):
    services = await crud.get_services(db, skip=skip, limit=limit)
    return services

@app.post("/appointments/", response_model=schemas.AppointmentSimple)
async def create_appointment(appointment: schemas.AppointmentCreate, db: AsyncSession = Depends(database.get_db)):
    print(f"Received appointment data: {appointment.dict()}")
    try:
        result = await crud.create_appointment(db=db, appointment=appointment)
        print(f"Appointment created successfully: {result.id}")
        return result
    except Exception as e:
        print(f"Error creating appointment: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/appointments/", response_model=List[schemas.Appointment])
async def read_appointments(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(database.get_db)):
    appointments = await crud.get_appointments(db, skip=skip, limit=limit)
    return appointments

@app.get("/appointments-with-details/")
async def read_appointments_with_details(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(database.get_db)):
    appointments = await crud.get_appointments_with_details(db, skip=skip, limit=limit)
    return [
        {
            "id": appointment.Appointment.id,
            "client_id": appointment.Appointment.client_id,
            "service_id": appointment.Appointment.service_id,
            "appointment_date": appointment.Appointment.appointment_date,
            "status": appointment.Appointment.status,
            "notes": appointment.Appointment.notes,
            "created_at": appointment.Appointment.created_at,
            "client_name": appointment.client_name,
            "client_phone": appointment.client_phone,
            "service_name": appointment.service_name,
            "service_price": appointment.service_price
        }
        for appointment in appointments
    ]

# История записей для клиента по телефону
@app.get("/client-appointments/{phone}")
async def get_client_appointments(phone: str, db: AsyncSession = Depends(database.get_db)):
    appointments = await crud.get_appointments_by_phone(db, phone)
    return [
        {
            "id": appointment.Appointment.id,
            "client_id": appointment.Appointment.client_id,
            "service_id": appointment.Appointment.service_id,
            "appointment_date": appointment.Appointment.appointment_date,
            "status": appointment.Appointment.status,
            "notes": appointment.Appointment.notes,
            "created_at": appointment.Appointment.created_at,
            "client_name": appointment.client_name,
            "client_phone": appointment.client_phone,
            "service_name": appointment.service_name,
            "service_price": appointment.service_price
        }
        for appointment in appointments
    ]

# Все записи для админа с фильтрацией
@app.get("/admin/all-appointments/")
async def get_all_appointments(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: AsyncSession = Depends(database.get_db)
):
    appointments = await crud.get_all_appointments_with_filters(db, status, date_from, date_to)
    return [
        {
            "id": appointment.Appointment.id,
            "client_id": appointment.Appointment.client_id,
            "service_id": appointment.Appointment.service_id,
            "appointment_date": appointment.Appointment.appointment_date,
            "status": appointment.Appointment.status,
            "notes": appointment.Appointment.notes,
            "created_at": appointment.Appointment.created_at,
            "client_name": appointment.client_name,
            "client_phone": appointment.client_phone,
            "service_name": appointment.service_name,
            "service_price": appointment.service_price
        }
        for appointment in appointments
    ]

@app.put("/appointments/{appointment_id}/status")
async def update_appointment_status(appointment_id: int, status_data: dict, db: AsyncSession = Depends(database.get_db)):
    status = status_data.get('status')
    if not status:
        raise HTTPException(status_code=400, detail="Status is required")
    
    result = await crud.update_appointment_status(db=db, appointment_id=appointment_id, status=status)
    if result:
        appointment_data = {
            "id": result.Appointment.id,
            "client_id": result.Appointment.client_id,
            "service_id": result.Appointment.service_id,
            "appointment_date": result.Appointment.appointment_date,
            "status": result.Appointment.status,
            "notes": result.Appointment.notes,
            "created_at": result.Appointment.created_at,
            "client_name": result.client_name,
            "client_phone": result.client_phone,
            "service_name": result.service_name,
            "service_price": result.service_price
        }
        return appointment_data
    else:
        raise HTTPException(status_code=404, detail="Appointment not found")

@app.get("/statistics/")
async def get_statistics(db: AsyncSession = Depends(database.get_db)):
    return await crud.get_statistics(db)

@app.get("/admin/settings/", response_model=schemas.AdminSettings)
async def get_settings(db: AsyncSession = Depends(database.get_db)):
    return await crud.get_admin_settings(db)

@app.put("/admin/settings/", response_model=schemas.AdminSettings)
async def update_settings(settings_data: schemas.AdminSettingsBase, db: AsyncSession = Depends(database.get_db)):
    return await crud.update_admin_settings(db=db, settings_data=settings_data)

@app.get("/settings/", response_model=schemas.AdminSettings)
async def get_public_settings(db: AsyncSession = Depends(database.get_db)):
    return await crud.get_admin_settings(db)

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/admin", response_class=HTMLResponse)
async def read_admin(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def read_login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/register", response_class=HTMLResponse)
async def read_register(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.post("/demo-data")
async def create_demo_data(db: AsyncSession = Depends(database.get_db)):
    services = [
        schemas.ServiceCreate(
            name="Стрижка женская",
            price=1500.0,
            duration=60,
            description="Стрижка и укладка"
        ),
        schemas.ServiceCreate(
            name="Стрижка мужская",
            price=800.0,
            duration=30,
            description="Стрижка машинкой или ножницами"
        ),
        schemas.ServiceCreate(
            name="Окрашивание",
            price=2500.0,
            duration=120,
            description="Окрашивание волос"
        ),
        schemas.ServiceCreate(
            name="Маникюр",
            price=1000.0,
            duration=60,
            description="Классический маникюр"
        ),
    ]
    
    for service_data in services:
        await crud.create_service(db, service_data)
    
    return {"message": "Demo data created successfully"}