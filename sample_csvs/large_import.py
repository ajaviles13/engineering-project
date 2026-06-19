#!/usr/bin/env python3
"""Generate a large CSV for performance testing."""
import csv
import random
from datetime import date, timedelta

descriptions = [
    "Amazon Purchase", "Uber Ride", "Netflix Subscription", "Starbucks Coffee",
    "Whole Foods Market", "Target Store", "Walmart Supercenter", "Shell Gas Station",
    "CVS Pharmacy", "Chipotle Mexican Grill", "Payroll Direct Deposit", "Rent Payment",
    "Electric Bill", "Internet Service", "Apple iTunes", "Spotify Premium",
    "Gym Membership", "Doctor Visit Copay", "Dental Cleaning", "Home Depot",
    "Flight Booking", "Hotel Stay", "Restaurant Dinner", "Grocery Store",
    "Gas Station", "Parking Fee", "Software Subscription", "Insurance Premium"
]

with open("large_5000.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["date", "description", "amount"])

    start = date(2023, 1, 1)
    for i in range(5000):
        d = start + timedelta(days=random.randint(0, 540))
        desc = random.choice(descriptions)
        if "Payroll" in desc:
            amount = round(random.uniform(3000, 8000), 2)
        elif "Rent" in desc:
            amount = round(-random.uniform(1200, 3000), 2)
        else:
            amount = round(-random.uniform(5, 500), 2)
        writer.writerow([d.isoformat(), desc, amount])

print("Generated large_5000.csv with 5000 rows")
