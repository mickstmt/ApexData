"""
F1 Service - Business logic for F1 data operations
"""
import fastf1
import pandas as pd
from typing import Optional


class F1Service:
    """Service class for F1 data operations"""

    def __init__(self):
        pass

    def get_session(self, year: int, event: str, session_type: str):
        """Load and return a session"""
        session = fastf1.get_session(year, event, session_type)
        session.load()
        return session

    def get_driver_fastest_lap(self, session, driver: str):
        """Get fastest lap for a driver in a session"""
        laps = session.laps.pick_driver(driver)
        if laps.empty:
            return None
        return laps.pick_fastest()

    def get_telemetry_for_lap(self, lap):
        """Get telemetry data for a specific lap"""
        return lap.get_telemetry()

    def calculate_lap_statistics(self, laps: pd.DataFrame):
        """Calculate statistics for a set of laps"""
        valid_laps = laps[laps['LapTime'].notna()]

        if valid_laps.empty:
            return None

        stats = {
            "total_laps": len(laps),
            "valid_laps": len(valid_laps),
            "fastest_time": valid_laps['LapTime'].min(),
            "slowest_time": valid_laps['LapTime'].max(),
            "average_time": valid_laps['LapTime'].mean(),
            "median_time": valid_laps['LapTime'].median(),
            "std_deviation": valid_laps['LapTime'].std(),
        }

        return stats
