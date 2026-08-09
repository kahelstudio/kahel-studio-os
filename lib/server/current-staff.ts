import "server-only";

import { headers } from "next/headers";
import { getStaffPrincipal } from "./staff-auth";

export async function getCurrentStaffPrincipal() {
  const incoming = await headers();
  const pathname = incoming.get("x-pathname") ?? "/";
  return getStaffPrincipal(new Request(`http://kahel.local${pathname}`, { headers: incoming }));
}
