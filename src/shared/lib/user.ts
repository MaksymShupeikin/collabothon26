// shortcut: mock signed-in user, as on main; read from the comdirect session once a backend exists.
// The persona (Lena, Kaya, Helga) only shapes the sandbox scenario; the account holder is always this user.
import { dict } from "./i18n.ts";

export const USER = { name: "Max Mustermann", salutation: "Mr Mustermann", initials: "MM", email: "max.muster@gmail.com" };
dict({ "Mr Mustermann": "Herr Mustermann" });
