# Booking Terms Implementation Review

The initial Booking Terms and Conditions content is an unpublished working draft. It is not legal advice and must not be published until reviewed by qualified Philippine counsel and approved by Kahel Studio.

## Architecture Discovered

- `public.bookings` is the single canonical booking aggregate for website, staff, and loyalty bookings.
- The authenticated Client Portal is under `/portal`; the token-based `/client-portal` is a legacy project portal and is not extended by this implementation.
- Website booking used a client-only checkbox with no server acceptance evidence.
- Loyalty terms had a separate version table but no acceptance record.
- Payments have a modern ledger, while website PayMongo checkout still uses legacy booking-level fields.
- Customer, staff, loyalty, and approval audit logs are append-only and provide patterns reused by the agreement system.

## Decisions Required Before Publication

- Deposit percentage or fixed amount and refund treatment
- Balance due date
- Rescheduling notice, allowed count, and fee
- Cancellation schedule and customer/studio remedies
- No-show treatment and lateness grace period
- Gallery availability and file-retention period
- Included revision rounds and feedback deadline
- Quotation validity
- Travel, access, and permit charges
- Turnaround commitments
- Raw-file policy
- Owner-approved exception process
- Complaint handling and escalation
- Guardian workflow for bookings involving minors
- Booking-specific precedence and material-change reacceptance rules
- Lawful basis and retention for each personal-data purpose

## Legal Review Required

Review against the Data Privacy Act of 2012, National Privacy Commission guidance, applicable Philippine consumer-protection rules, electronic transaction requirements, tax/invoicing obligations, and local business requirements. Counsel must specifically review cancellation, deposits, refunds, limitations, copyright and licenses, minors, force majeure, governing law, and dispute language.

The system intentionally seeds no published terms. Until an approved version is published, new website payment initiation is blocked with a terms-unavailable state.
