export interface Dictionary {
  appName: string;
  login: {
    title: string;
    email: string;
    password: string;
    submit: string;
    registerInstead: string;
    submitRegister: string;
    backToLogin: string;
    error: string;
    registerError: string;
  };
  session: {
    signedInAs: string;
    logout: string;
  };
  nav: {
    history: string;
    live: string;
    graphs: string;
    synthesis: string;
    sensors: string;
  };
  history: {
    sensorLabel: string;
    noSensors: string;
    from: string;
    to: string;
    timestamp: string;
    value: string;
    noReadings: string;
    selectSensorPrompt: string;
  };
  live: {
    label: string;
    value: string;
    setValue: string;
    setSuccess: string;
    noTags: string;
  };
  sensors: {
    title: string;
    key: string;
    label: string;
    unit: string;
    correction: string;
    csvColumn: string;
    csvColumnHint: string;
    add: string;
    importFromBoiler: string;
    importResult: string;
    save: string;
    cancel: string;
    edit: string;
    delete: string;
    keyError: string;
    duplicateError: string;
    boilerConnectionTitle: string;
    boilerHost: string;
    boilerHostHint: string;
    boilerUsername: string;
    boilerPassword: string;
    boilerPasswordUnchanged: string;
    boilerCredentialsHint: string;
    saveConnection: string;
    connectionSaved: string;
    runIngestNow: string;
    runIngestResult: string;
    recentRuns: string;
    noRuns: string;
    liveTagsTitle: string;
    liveTagPath: string;
    liveTagWritable: string;
    liveTagDivisor: string;
    liveTagAdd: string;
    liveTagHint: string;
  };
  graphs: {
    title: string;
    select: string;
    noGraphs: string;
    manageTitle: string;
    sensorCount: string;
    add: string;
    name: string;
    sensorsInGraph: string;
    coefficient: string;
    addSensor: string;
  };
  synthesis: {
    title: string;
    mode: string;
    modeSeason: string;
    modeRange: string;
    season: string;
    noSeasons: string;
    noData: string;
    month: string;
    day: string;
    tcExtMax: string;
    tcExtMin: string;
    conso: string;
    dju: string;
    nbCycle: string;
    efficiency: string;
    runTitle: string;
    runNow: string;
    runResult: string;
    configTitle: string;
    configSaved: string;
    configHint: string;
    roleNone: string;
    outdoorTempSensor: string;
    augerRunSensor: string;
    augerPauseSensor: string;
    burnerCycleSensor: string;
    pelletWeightPerMinute: string;
    referenceTemp: string;
    houseSurface: string;
    seasonsTitle: string;
    seasonAdd: string;
    siloEventsTitle: string;
    siloEventAdd: string;
    quantityKg: string;
    note: string;
  };
}

export const en: Dictionary = {
  appName: "Okovision",
  login: {
    title: "Sign in",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    registerInstead: "First time here? Create the owner account",
    submitRegister: "Create account",
    backToLogin: "Back to sign in",
    error: "Invalid email or password.",
    registerError: "Could not create the account. The email may already be in use, or the password is too short.",
  },
  session: {
    signedInAs: "Signed in as {email} ({role})",
    logout: "Log out",
  },
  nav: {
    history: "History",
    live: "Live",
    graphs: "Graphs",
    synthesis: "Reports",
    sensors: "Sensors",
  },
  history: {
    sensorLabel: "Sensor",
    noSensors: "No sensors configured yet. Ask an admin to map one under Sensors.",
    from: "From",
    to: "To",
    timestamp: "Time",
    value: "Value",
    noReadings: "No readings for this sensor in the selected range.",
    selectSensorPrompt: "Choose a sensor to see its readings.",
  },
  live: {
    label: "Value",
    value: "Current",
    setValue: "Set",
    setSuccess: "Sent to the boiler.",
    noTags: "No live values configured yet. Ask an admin to map one under Sensors.",
  },
  sensors: {
    title: "Sensor mapping",
    key: "Key",
    label: "Label",
    unit: "Unit",
    correction: "Correction",
    csvColumn: "CSV column",
    csvColumnHint: "0-based position in the boiler's daily CSV, after the date/time columns. Leave blank if not fed from the CSV log.",
    add: "Add sensor",
    importFromBoiler: "Import from boiler",
    importResult: "Imported {created} sensor(s), skipped {skipped} already-mapped column(s).",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    keyError: "Use lowercase letters, digits, and underscores only.",
    duplicateError: "A sensor with this key or CSV column already exists.",
    boilerConnectionTitle: "Boiler connection",
    boilerHost: "Boiler host or IP",
    boilerHostHint: "The Okofen boiler's address on your local network, e.g. 192.168.1.50.",
    boilerUsername: "Boiler login username",
    boilerPassword: "Boiler login password",
    boilerPasswordUnchanged: "unchanged",
    boilerCredentialsHint: "The boiler's own web UI login (not your Okovision account) — needed for live values and control. Leave both blank to keep history-only.",
    saveConnection: "Save",
    connectionSaved: "Saved.",
    runIngestNow: "Pull data from the boiler now",
    runIngestResult: "Considered {dates} day(s), wrote {readings} reading(s).",
    recentRuns: "Recent ingestion runs",
    noRuns: "No ingestion runs yet.",
    liveTagsTitle: "Live values",
    liveTagPath: "Boiler tag",
    liveTagWritable: "Writable",
    liveTagDivisor: "Divisor",
    liveTagAdd: "Add live value",
    liveTagHint: "The real tag path on the boiler, e.g. CAPPL:LOCAL.oekomode. The boiler sends raw scaled integers (e.g. 94 for 9.4°C) — divisor converts to and from the real value.",
  },
  graphs: {
    title: "Graphs",
    select: "Graph",
    noGraphs: "No graphs configured yet. Ask an admin to create one below.",
    manageTitle: "Manage graphs",
    sensorCount: "Sensors",
    add: "Add graph",
    name: "Name",
    sensorsInGraph: "Sensors in this graph",
    coefficient: "Coefficient",
    addSensor: "Add sensor",
  },
  synthesis: {
    title: "Synthesis",
    mode: "View",
    modeSeason: "By season",
    modeRange: "Custom range",
    season: "Season",
    noSeasons: "No seasons configured yet. Ask an admin to create one below.",
    noData: "No synthesis data for this range yet — run it below, or wait for the next scheduled ingest.",
    month: "Month",
    day: "Day",
    tcExtMax: "Outdoor max (°C)",
    tcExtMin: "Outdoor min (°C)",
    conso: "Pellets (kg)",
    dju: "Degree-days",
    nbCycle: "Burner cycles",
    efficiency: "g/DJU/m²",
    runTitle: "Run synthesis now",
    runNow: "Run",
    runResult: "{days} day(s) computed.",
    configTitle: "Synthesis settings",
    configSaved: "Saved.",
    configHint: "Pick which mapped sensor plays each role. Leave a role blank to skip that metric until it's mapped.",
    roleNone: "— none —",
    outdoorTempSensor: "Outdoor temperature sensor",
    augerRunSensor: "Auger run-time sensor",
    augerPauseSensor: "Auger pause-time sensor",
    burnerCycleSensor: "Burner cycle-count sensor",
    pelletWeightPerMinute: "Pellet weight per minute of auger run (g)",
    referenceTemp: "Degree-day reference temperature (°C)",
    houseSurface: "Heated floor area (m²)",
    seasonsTitle: "Seasons",
    seasonAdd: "Add season",
    siloEventsTitle: "Silo deliveries",
    siloEventAdd: "Add delivery",
    quantityKg: "Quantity (kg)",
    note: "Note",
  },
};
