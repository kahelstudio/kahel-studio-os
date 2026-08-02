import { ACCOUNTS_BY_ID, BOOKINGS_BY_REF } from "@/lib/sample-data";

const booking = BOOKINGS_BY_REF["KS-2026-0142"];
const account = ACCOUNTS_BY_ID[booking.accountId];

export const CLIENT_PORTAL = {
  booking,
  account,
  projectRef: booking.linkedProjectRef ?? `PRJ-${booking.ref.slice(3)}`,
  clientName: account.name.replace(" Deveza", ""),
  gallery: {
    photoCount: 247,
    deliveredOn: "21 Jun 2026",
    expiresOn: "21 Dec 2026",
  },
} as const;

export type ClientPortalConfig = {
  published: boolean;
  email: string;
  accessCode: string;
};

export const CLIENT_PORTAL_DEFAULT_CONFIG: ClientPortalConfig = {
  published: true,
  email: account.contacts[0]?.email ?? "",
  accessCode: "BM-09AUG",
};
