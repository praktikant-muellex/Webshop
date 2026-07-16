interface NamedPerson {
  firstName: string | null;
  lastName: string | null;
  nickname?: string | null;
}

/** "Vorname Nachname" plus an optional "(Spitzname)" to tell same-named employees apart. */
export function employeeLabel(person: NamedPerson): string {
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || "Unbekannt";
  return person.nickname ? `${name} (${person.nickname})` : name;
}
