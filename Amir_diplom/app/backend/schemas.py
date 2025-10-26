from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ClientBase(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    notes: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ServiceBase(BaseModel):
    name: str
    price: float
    duration: int
    description: Optional[str] = None

class ServiceCreate(ServiceBase):
    pass

class Service(ServiceBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class AppointmentCreate(BaseModel):
    client_name: str
    client_phone: str
    service_id: int
    appointment_date: datetime
    notes: Optional[str] = None

class AppointmentSimple(BaseModel):
    id: int
    client_id: int
    service_id: int
    appointment_date: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class Appointment(BaseModel):
    id: int
    client_id: int
    service_id: int
    appointment_date: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime
    client: Optional[Client] = None
    service: Optional[Service] = None
    
    class Config:
        from_attributes = True

class AppointmentWithDetails(BaseModel):
    id: int
    client_id: int
    service_id: int
    appointment_date: datetime
    status: str
    notes: Optional[str] = None
    created_at: datetime
    client_name: str
    client_phone: str
    service_name: str
    service_price: float
    
    class Config:
        from_attributes = True

class Statistics(BaseModel):
    total_appointments: int
    completed_appointments: int
    pending_appointments: int
    total_revenue: float
    monthly_revenue: float
    popular_services: List[dict]

class AdminSettingsBase(BaseModel):
    business_name: str
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_email: Optional[EmailStr] = None
    working_hours: Optional[str] = None
    notification_reminder_hours: int = 24

class AdminSettings(AdminSettingsBase):
    id: int
    
    class Config:
        from_attributes = True