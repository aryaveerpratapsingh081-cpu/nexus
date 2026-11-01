from typing import List, Optional
from pydantic import BaseModel

class CpuStats(BaseModel):
    usage_percent: float
    core_count: int
    logical_core_count: int
    frequency_mhz: Optional[float] = None

class MemoryStats(BaseModel):
    total_bytes: int
    available_bytes: int
    used_bytes: int
    usage_percent: float
    total_gb: float
    available_gb: float
    used_gb: float

class DiskPartitionStats(BaseModel):
    device: str
    mountpoint: str
    fstype: str
    total_bytes: int
    used_bytes: int
    free_bytes: int
    usage_percent: float
    total_gb: float
    free_gb: float

class SystemStatsResponse(BaseModel):
    timestamp: str
    cpu: CpuStats
    memory: MemoryStats
    disks: List[DiskPartitionStats]
    platform: str
    uptime_seconds: float

