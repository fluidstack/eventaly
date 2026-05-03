import * as Contacts from "expo-contacts";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";

export type DeviceContact = {
  id: string;
  name: string;
  firstName: string;
  phone?: string;
  email?: string;
};

export type ContactPermissionState =
  | "unknown"
  | "granted"
  | "denied"
  | "restricted"
  | "unsupported";

function normalize(c: Contacts.Contact): DeviceContact | null {
  const name = (c.name || [c.firstName, c.lastName].filter(Boolean).join(" ") || "").trim();
  if (!name) return null;
  const phone = c.phoneNumbers?.find((p) => !!p.number)?.number?.replace(/\s+/g, "") ?? undefined;
  const email = c.emails?.find((e) => !!e.email)?.email ?? undefined;
  const rawId = (c as unknown as { id?: string; lookupKey?: string }).id
    ?? (c as unknown as { lookupKey?: string }).lookupKey
    ?? `${name}-${phone ?? email ?? Math.random().toString(36).slice(2)}`;
  return {
    id: String(rawId),
    name,
    firstName: (c.firstName || name.split(/\s+/)[0] || name).trim(),
    phone,
    email,
  };
}

export function useContacts() {
  const [permission, setPermission] = useState<ContactPermissionState>(
    Platform.OS === "web" ? "unsupported" : "unknown",
  );
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (Platform.OS === "web") {
      setPermission("unsupported");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
        sort: Contacts.SortTypes.FirstName,
      });
      const normalized = data
        .map(normalize)
        .filter((c): c is DeviceContact => c !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      setContacts(normalized);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load contacts";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const request = useCallback(async () => {
    if (Platform.OS === "web") {
      setPermission("unsupported");
      return "unsupported" as const;
    }
    const res = await Contacts.requestPermissionsAsync();
    if (res.status === "granted") {
      setPermission("granted");
      await load();
      return "granted" as const;
    }
    if (res.status === "denied") {
      setPermission("denied");
      return "denied" as const;
    }
    setPermission("restricted");
    return "restricted" as const;
  }, [load]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      const res = await Contacts.getPermissionsAsync();
      if (res.status === "granted") {
        setPermission("granted");
        await load();
      } else if (res.status === "denied") {
        setPermission("denied");
      } else {
        setPermission("unknown");
      }
    })();
  }, [load]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  return { permission, contacts, loading, error, request, reload: load, openSettings };
}
