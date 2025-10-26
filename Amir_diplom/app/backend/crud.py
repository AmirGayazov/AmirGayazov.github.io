from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, and_
from . import models, schemas
from datetime import datetime, timedelta
import calendar

async def create_user(db: AsyncSession, user: schemas.UserCreate):
    from .auth import get_password_hash
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def get_user_by_username(db: AsyncSession, username: str):
    result = await db.execute(select(models.User).where(models.User.username == username))
    return result.scalar_one_or_none()

async def create_client(db: AsyncSession, client: schemas.ClientCreate):
    result = await db.execute(select(models.Client).where(models.Client.phone == client.phone))
    existing_client = result.scalar_one_or_none()
    
    if existing_client:
        for key, value in client.dict().items():
            if hasattr(existing_client, key) and value is not None:
                setattr(existing_client, key, value)
        await db.commit()
        await db.refresh(existing_client)
        return existing_client
    else:
        db_client = models.Client(**client.dict())
        db.add(db_client)
        await db.commit()
        await db.refresh(db_client)
        return db_client

async def get_clients(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(models.Client).offset(skip).limit(limit))
    return result.scalars().all()

async def get_client(db: AsyncSession, client_id: int):
    result = await db.execute(select(models.Client).where(models.Client.id == client_id))
    return result.scalar_one_or_none()

async def create_service(db: AsyncSession, service: schemas.ServiceCreate):
    db_service = models.Service(**service.dict())
    db.add(db_service)
    await db.commit()
    await db.refresh(db_service)
    return db_service

async def get_services(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(models.Service).where(models.Service.is_active == True).offset(skip).limit(limit))
    return result.scalars().all()

async def get_service(db: AsyncSession, service_id: int):
    result = await db.execute(select(models.Service).where(models.Service.id == service_id))
    return result.scalar_one_or_none()

async def update_service(db: AsyncSession, service_id: int, service: schemas.ServiceCreate):
    result = await db.execute(select(models.Service).where(models.Service.id == service_id))
    db_service = result.scalar_one_or_none()
    if db_service:
        for key, value in service.dict().items():
            setattr(db_service, key, value)
        await db.commit()
        await db.refresh(db_service)
    return db_service

async def create_appointment(db: AsyncSession, appointment: schemas.AppointmentCreate):
    client_data = schemas.ClientCreate(
        name=appointment.client_name,
        phone=appointment.client_phone
    )
    client = await create_client(db, client_data)
    
    db_appointment = models.Appointment(
        client_id=client.id,
        service_id=appointment.service_id,
        appointment_date=appointment.appointment_date,
        notes=appointment.notes
    )
    db.add(db_appointment)
    await db.commit()
    await db.refresh(db_appointment)
    
    result = await db.execute(
        select(models.Appointment)
        .where(models.Appointment.id == db_appointment.id)
    )
    return result.scalar_one()

async def get_appointments(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.Appointment)
        .options(selectinload(models.Appointment.client), selectinload(models.Appointment.service))
        .offset(skip)
        .limit(limit)
        .order_by(models.Appointment.appointment_date.desc())
    )
    return result.scalars().all()

async def get_appointments_with_details(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(
            models.Appointment,
            models.Client.name.label('client_name'),
            models.Client.phone.label('client_phone'),
            models.Service.name.label('service_name'),
            models.Service.price.label('service_price')
        )
        .join(models.Client)
        .join(models.Service)
        .offset(skip)
        .limit(limit)
        .order_by(models.Appointment.appointment_date.desc())
    )
    return result.all()

async def get_appointments_by_phone(db: AsyncSession, phone: str):
    result = await db.execute(
        select(
            models.Appointment,
            models.Client.name.label('client_name'),
            models.Client.phone.label('client_phone'),
            models.Service.name.label('service_name'),
            models.Service.price.label('service_price')
        )
        .join(models.Client)
        .join(models.Service)
        .where(models.Client.phone == phone)
        .order_by(models.Appointment.appointment_date.desc())
    )
    return result.all()

async def get_all_appointments_with_filters(db: AsyncSession, status: str = None, date_from: str = None, date_to: str = None):
    query = select(
        models.Appointment,
        models.Client.name.label('client_name'),
        models.Client.phone.label('client_phone'),
        models.Service.name.label('service_name'),
        models.Service.price.label('service_price')
    ).join(models.Client).join(models.Service)
    
    if status and status != 'all':
        query = query.where(models.Appointment.status == status)
    
    if date_from:
        date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
        query = query.where(models.Appointment.appointment_date >= date_from_obj)
    
    if date_to:
        date_to_obj = datetime.strptime(date_to + ' 23:59:59', '%Y-%m-%d %H:%M:%S')
        query = query.where(models.Appointment.appointment_date <= date_to_obj)
    
    query = query.order_by(models.Appointment.appointment_date.desc())
    
    result = await db.execute(query)
    return result.all()

async def get_appointment(db: AsyncSession, appointment_id: int):
    result = await db.execute(
        select(models.Appointment)
        .options(selectinload(models.Appointment.client), selectinload(models.Appointment.service))
        .where(models.Appointment.id == appointment_id)
    )
    return result.scalar_one_or_none()

async def update_appointment_status(db: AsyncSession, appointment_id: int, status: str):
    result = await db.execute(
        select(models.Appointment)
        .where(models.Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    if appointment:
        appointment.status = status
        
        if status == "completed":
            service_result = await db.execute(
                select(models.Service).where(models.Service.id == appointment.service_id)
            )
            service = service_result.scalar_one_or_none()
            if service:
                revenue = models.Revenue(
                    service_id=appointment.service_id,
                    appointment_id=appointment.id,
                    service_revenue=service.price,
                    material_costs=0,
                    net_revenue=service.price
                )
                db.add(revenue)
        
        await db.commit()
        await db.refresh(appointment)
        
        detailed_result = await db.execute(
            select(
                models.Appointment,
                models.Client.name.label('client_name'),
                models.Client.phone.label('client_phone'),
                models.Service.name.label('service_name'),
                models.Service.price.label('service_price')
            )
            .join(models.Client)
            .join(models.Service)
            .where(models.Appointment.id == appointment_id)
        )
        return detailed_result.first()
    return None

async def get_statistics(db: AsyncSession):
    total_result = await db.execute(select(func.count(models.Appointment.id)))
    total_appointments = total_result.scalar() or 0
    
    completed_result = await db.execute(
        select(func.count(models.Appointment.id)).where(models.Appointment.status == 'completed')
    )
    completed_appointments = completed_result.scalar() or 0
    
    pending_result = await db.execute(
        select(func.count(models.Appointment.id)).where(models.Appointment.status == 'pending')
    )
    pending_appointments = pending_result.scalar() or 0
    
    revenue_result = await db.execute(select(func.sum(models.Revenue.net_revenue)))
    total_revenue = revenue_result.scalar() or 0
    
    now = datetime.utcnow()
    first_day = datetime(now.year, now.month, 1)
    monthly_revenue_result = await db.execute(
        select(func.sum(models.Revenue.net_revenue)).where(models.Revenue.date >= first_day)
    )
    monthly_revenue = monthly_revenue_result.scalar() or 0
    
    popular_services_result = await db.execute(
        select(
            models.Service.name,
            func.count(models.Appointment.id).label('count')
        )
        .select_from(models.Appointment)
        .join(models.Service)
        .group_by(models.Service.name)
        .order_by(func.count(models.Appointment.id).desc())
        .limit(5)
    )
    popular_services = [{"name": row[0], "count": row[1]} for row in popular_services_result.all()]
    
    return {
        "total_appointments": total_appointments,
        "completed_appointments": completed_appointments,
        "pending_appointments": pending_appointments,
        "total_revenue": total_revenue,
        "monthly_revenue": monthly_revenue,
        "popular_services": popular_services
    }

async def get_admin_settings(db: AsyncSession):
    result = await db.execute(select(models.AdminSettings))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = models.AdminSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings

async def update_admin_settings(db: AsyncSession, settings_data: schemas.AdminSettingsBase):
    result = await db.execute(select(models.AdminSettings))
    settings = result.scalar_one_or_none()
    if settings:
        for key, value in settings_data.dict().items():
            setattr(settings, key, value)
    else:
        settings = models.AdminSettings(**settings_data.dict())
        db.add(settings)
    
    await db.commit()
    await db.refresh(settings)
    return settings