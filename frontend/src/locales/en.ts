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
  dashboard: {
    placeholder: string;
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
  dashboard: {
    placeholder: "The boiler dashboard will appear here.",
  },
};
