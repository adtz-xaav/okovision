import type { Dictionary } from "./en";

export const fr: Dictionary = {
  appName: "Okovision",
  login: {
    title: "Connexion",
    email: "Adresse e-mail",
    password: "Mot de passe",
    submit: "Se connecter",
    registerInstead: "Première visite ? Créer le compte propriétaire",
    submitRegister: "Créer le compte",
    backToLogin: "Retour à la connexion",
    error: "Adresse e-mail ou mot de passe invalide.",
    registerError: "Impossible de créer le compte. L'adresse est peut-être déjà utilisée, ou le mot de passe est trop court.",
  },
  session: {
    signedInAs: "Connecté en tant que {email} ({role})",
    logout: "Déconnexion",
  },
  dashboard: {
    placeholder: "Le tableau de bord de la chaudière s'affichera ici.",
  },
};
