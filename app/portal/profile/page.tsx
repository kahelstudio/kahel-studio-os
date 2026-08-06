export const dynamic = "force-dynamic";

import { ProfileForm } from "@/components/customer-auth/profile-form";
import { getPortalProfile } from "@/lib/server/customer-portal-data";
export default async function PortalProfilePage() { const profile = await getPortalProfile(); return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><h1 className="font-display text-4xl font-semibold">Profile</h1><p className="mt-2 text-text-secondary">Update contact details. Your verified email cannot be changed here.</p><p className="mt-8 text-sm font-semibold">Verified email</p><p className="mt-1 mb-5 text-text-secondary">{profile.email}</p><ProfileForm firstName={profile.firstName} lastName={profile.lastName} mobile={profile.mobile} /></main>; }
