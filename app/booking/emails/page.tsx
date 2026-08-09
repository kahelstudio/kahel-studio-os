import { permanentRedirect } from "next/navigation";

export default function BookingEmailsRedirect() {
  permanentRedirect("/settings/emails");
}
