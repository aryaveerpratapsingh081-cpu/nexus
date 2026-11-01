import os
import platform
import time
from datetime import datetime, timezone
from typing import List
import psutil

from app.schemas.system import SystemStatsResponse, CpuStats, MemoryStats, DiskPartitionStats

class SystemService:
    @staticmethod
    def get_system_stats() -> SystemStatsResponse:
        """
        Retrieves real-time hardware and operating system metrics using psutil.
        Distinguishes live measurements and safely skips inaccessible drives.
        """
        # CPU
        cpu_pct = psutil.cpu_percent(interval=None)
        cpu_cores = psutil.cpu_count(logical=False) or 1
        cpu_logical = psutil.cpu_count(logical=True) or 1
        cpu_freq = None
        try:
            freq_info = psutil.cpu_freq()
            if freq_info:
                cpu_freq = round(freq_info.current, 1)
        except Exception:
            pass

        cpu_stats = CpuStats(
            usage_percent=round(cpu_pct, 1),
            core_count=cpu_cores,
            logical_core_count=cpu_logical,
            frequency_mhz=cpu_freq
        )

        # Memory
        mem = psutil.virtual_memory()
        mem_stats = MemoryStats(
            total_bytes=mem.total,
            available_bytes=mem.available,
            used_bytes=mem.used,
            usage_percent=round(mem.percent, 1),
            total_gb=round(mem.total / (1024 ** 3), 2),
            available_gb=round(mem.available / (1024 ** 3), 2),
            used_gb=round(mem.used / (1024 ** 3), 2)
        )

        # Disks
        disk_stats: List[DiskPartitionStats] = []
        try:
            partitions = psutil.disk_partitions(all=False)
            seen_mounts = set()
            for part in partitions:
                # Avoid duplicates or invalid mountpoints
                if not part.mountpoint or part.mountpoint in seen_mounts:
                    continue
                seen_mounts.add(part.mountpoint)
                
                # Filter out cdrom or zero-length devices on Windows
                if "cdrom" in part.opts or part.fstype == "":
                    continue

                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    disk_stats.append(DiskPartitionStats(
                        device=part.device,
                        mountpoint=part.mountpoint,
                        fstype=part.fstype,
                        total_bytes=usage.total,
                        used_bytes=usage.used,
                        free_bytes=usage.free,
                        usage_percent=round(usage.percent, 1),
                        total_gb=round(usage.total / (1024 ** 3), 2),
                        free_gb=round(usage.free / (1024 ** 3), 2)
                    ))
                except (PermissionError, OSError):
                    # Ignore drives that are not ready (e.g. empty SD card reader)
                    continue
        except Exception:
            pass

        # Uptime
        boot_time = psutil.boot_time()
        uptime = round(time.time() - boot_time, 1)

        return SystemStatsResponse(
            timestamp=datetime.now(timezone.utc).isoformat(),
            cpu=cpu_stats,
            memory=mem_stats,
            disks=disk_stats,
            platform=f"{platform.system()} {platform.release()} ({platform.machine()})",
            uptime_seconds=uptime
        )

