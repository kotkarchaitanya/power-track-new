// Default initial dataset for PowerTrack
window.POWERTRACK_INITIAL_DATA = {
  systemStatus: {
    status: "Available",
    statusText: "POWER AVAILABLE",
    description: "Normal 3-phase electricity supply active across all village feeders. No active load shedding currently in progress.",
    lastUpdated: new Date().toISOString(),
    isUnplanned: false,
    nextCutTime: "10:00 PM",
    nextCutDuration: "1 Hour",
    nextCutRestoration: "11:00 PM",
    nextRestorationTime: "11:00 PM",
    targetRestorationCountdown: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString()
  },
  unplannedOutage: {
    active: false,
    startTime: "04:15 PM",
    reason: "11kV Feeder Cable Breakdown near North Substation",
    affectedArea: "Wadgaon North Feeder & Industrial Zone",
    expectedRestoration: "06:30 PM",
    targetTimestamp: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    additionalInfo: "Emergency repair squad deployed on site with conductor replacement kit."
  },
  affectedArea: {
    name: "Wadgaon Central, Market Yard & Substation Feeder 02",
    village: "Wadgaon Khurd & Rural Sub-division",
    status: "Electricity Available",
    reason: "Normal operational grid state; next scheduled maintenance at 10:00 PM",
    expectedRestoration: "11:00 PM",
    latitude: 18.5204,
    longitude: 73.8567,
    zoom: 14,
    radiusMeters: 1200
  },
  schedules: [
    {
      id: "sch-1",
      date: new Date().toISOString().split('T')[0],
      startTime: "06:00 AM",
      endTime: "09:00 AM",
      status: "Available",
      duration: "3 Hours",
      description: "Morning Domestic & Agricultural Supply",
      expectedRestoration: "09:00 AM"
    },
    {
      id: "sch-2",
      date: new Date().toISOString().split('T')[0],
      startTime: "09:00 AM",
      endTime: "11:00 AM",
      status: "Unavailable",
      duration: "2 Hours",
      description: "Scheduled Morning Load Shedding (Zone 1)",
      expectedRestoration: "11:00 AM"
    },
    {
      id: "sch-3",
      date: new Date().toISOString().split('T')[0],
      startTime: "11:00 AM",
      endTime: "03:00 PM",
      status: "Available",
      duration: "4 Hours",
      description: "Daytime Commercial & Domestic Power Supply",
      expectedRestoration: "03:00 PM"
    },
    {
      id: "sch-4",
      date: new Date().toISOString().split('T')[0],
      startTime: "03:00 PM",
      endTime: "05:00 PM",
      status: "Unavailable",
      duration: "2 Hours",
      description: "Scheduled Afternoon Load Shedding",
      expectedRestoration: "05:00 PM"
    },
    {
      id: "sch-5",
      date: new Date().toISOString().split('T')[0],
      startTime: "05:00 PM",
      endTime: "10:00 PM",
      status: "Available",
      duration: "5 Hours",
      description: "Evening Peak Supply Available",
      expectedRestoration: "10:00 PM"
    },
    {
      id: "sch-6",
      date: new Date().toISOString().split('T')[0],
      startTime: "10:00 PM",
      endTime: "11:00 PM",
      status: "Unavailable",
      duration: "1 Hour",
      description: "Night Substation Feeder Line Maintenance",
      expectedRestoration: "11:00 PM"
    },
    {
      id: "sch-7",
      date: new Date().toISOString().split('T')[0],
      startTime: "11:00 PM",
      endTime: "06:00 AM",
      status: "Available",
      duration: "7 Hours",
      description: "Night Uninterrupted Domestic Supply",
      expectedRestoration: "06:00 AM"
    }
  ],
  notices: [
    {
      id: "not-1",
      title: "Emergency Substation Transformer Overhaul",
      date: new Date().toISOString().split('T')[0],
      time: "02:00 PM",
      priority: "High",
      description: "Electricity supply may experience brief technical fluctuations or temporary unavailability between 10:00 PM and 11:00 PM tonight due to critical 33/11kV transformer maintenance work."
    },
    {
      id: "not-2",
      title: "Monsoon Tree Trimming Along 11kV Feeder Line",
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      time: "10:30 AM",
      priority: "Medium",
      description: "Preventive vegetation clearance near high tension wires will be carried out across Wadgaon rural stretch. Please stay clear of ground operations."
    },
    {
      id: "not-3",
      title: "Agricultural Pump Feeder Operating Hours Revised",
      date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      time: "09:00 AM",
      priority: "Normal",
      description: "Agricultural 3-phase power supply timetable for the week of October 5 to October 12 will provide 8 hours daily rotation (Shift A: Day, Shift B: Night)."
    },
    {
      id: "not-4",
      title: "24/7 Village Electricity Complaint Helpline Active",
      date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
      time: "08:00 AM",
      priority: "Normal",
      description: "For broken wires, spark reports, or local fuse failures, call the village round-the-clock emergency line at 1800-233-3435 or contact local wireman."
    }
  ],
  history: [
    {
      id: "hist-1",
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      startTime: "03:00 PM",
      endTime: "05:12 PM",
      duration: "2h 12m",
      type: "Scheduled Load Shedding",
      area: "Wadgaon North Feeder & Market Area"
    },
    {
      id: "hist-2",
      date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      startTime: "11:20 AM",
      endTime: "01:35 PM",
      duration: "2h 15m",
      type: "Unplanned Power Cut",
      area: "Shivaji Nagar & School Colony"
    },
    {
      id: "hist-3",
      date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
      startTime: "08:00 AM",
      endTime: "12:15 PM",
      duration: "4h 15m",
      type: "Maintenance",
      area: "Substation 03 Transformer Bay"
    },
    {
      id: "hist-4",
      date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
      startTime: "06:15 PM",
      endTime: "07:45 PM",
      duration: "1h 30m",
      type: "Emergency Outage",
      area: "East Village Agriculture Feeder"
    },
    {
      id: "hist-5",
      date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      startTime: "02:00 PM",
      endTime: "04:00 PM",
      duration: "2h 00m",
      type: "Scheduled Load Shedding",
      area: "All Village Sectors"
    }
  ],
  importantNotes: [
    "Scheduled load shedding timings may change without prior notice due to state grid frequency variations or emergency load dispatch instructions.",
    "Restoration times provided are estimated targets; actual restoration may vary by 15 to 30 minutes depending on field safety clearance.",
    "During power cuts, please switch off high-surge electrical appliances (motor pumps, ACs, refrigerators) to prevent voltage surge damage upon restoration.",
    "Always assume downed electrical wires are live. Do not approach fallen cables and report immediately to 1800-233-3435.",
    "PowerTrack is updated continuously by substation electrical engineers. Check regularly for real-time announcements."
  ],
  authorizedAdmins: [
    "kotkarchaitanya18@gmail.com"
  ],
  adminRequests: [],
  adminSettings: {
    googleMapsApiKey: "",
    mapProvider: "leaflet",
    defaultVillageName: "Wadgaon Village & Rural Electric Sub-Division"
  }
};
