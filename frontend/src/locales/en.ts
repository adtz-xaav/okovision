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
};
