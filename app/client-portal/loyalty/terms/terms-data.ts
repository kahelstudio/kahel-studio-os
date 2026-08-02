export type LoyaltyTerm = {
  title: string;
  body: string;
};

export const LOYALTY_TERMS = {
  programName: "Kahel Studio Loyalty Rewards",
  version: "1.0",
  effectiveDate: "2026-09-01",
  disclaimer: "Initial terms for business and legal review. Kahel Studio should have qualified counsel review and approve these terms before the loyalty program is offered to clients.",
  terms: [
    { title: "1. Earning a reward", body: "A customer earns one complimentary Solo Session after completing eight eligible paid bookings." },
    { title: "2. Completed bookings", body: "Only bookings marked completed or fulfilled count. Kahel Studio currently records the final delivered state as Completed." },
    { title: "3. Excluded bookings", body: "Cancelled, no-show, fully refunded, complimentary, internal, test, duplicate, and administratively excluded bookings do not count." },
    { title: "4. Reward sessions", body: "The complimentary reward session does not count toward the next reward." },
    { title: "5. Included service", body: "The reward covers only the approved standard Solo Session inclusions." },
    { title: "6. Additional charges", body: "Upgrades, additional people, add-ons, prints, extra edits, and other services are charged separately unless explicitly included." },
    { title: "7. Account ownership", body: "The reward is linked to the earning customer's account." },
    { title: "8. No transfer or cash value", body: "The reward is non-transferable and cannot be exchanged for cash, credit, or another service." },
    { title: "9. Booking availability", body: "Redemption is subject to studio availability and the normal booking process." },
    { title: "10. Other promotions", body: "A reward cannot be combined with another promotion unless Kahel Studio explicitly permits it." },
    { title: "11. Booking policies", body: "Cancellation, rescheduling, and no-show policies apply to the reward booking. Cancelled and no-show reward bookings require staff review before a reward is reinstated or cancelled." },
    { title: "12. Validity", body: "Rewards issued under this version do not expire. Any future validity period will be shown clearly only after Kahel Studio approves and publishes it." },
    { title: "13. Corrections", body: "Kahel Studio may correct fraudulent, duplicate, or incorrectly credited bookings while preserving an audit record." },
    { title: "14. Program changes", body: "Material changes apply according to the published effective date and will not silently remove an already earned reward." },
    { title: "15. Questions", body: "Customers who believe their progress is incorrect may contact Kahel Studio." },
  ] satisfies LoyaltyTerm[],
} as const;
