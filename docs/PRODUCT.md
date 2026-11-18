# AfterVisit product spec

This file is the source of truth for every later feature.

## Product

AfterVisit is a time-boxed follow-up chat between a clinic and a patient after an in-person visit.

## Roles

- **Doctor:** answers follow-ups from an inbox, and can open them.
- **Reception:** opens follow-ups, answers admin questions, flags clinical ones for the doctor.
- **Patient or caregiver:** no account; enters through a private link.

## Core flow

1. Reception or a doctor opens a follow-up: patient name, phone, window length (3, 7 or 14 days), one-line visit note, assigned doctor.
2. The app generates a private link, shown once. Staff copy it or share it by WhatsApp, SMS or email (from their own mail app; the email address is not stored).
3. The patient opens the link in a mobile browser, confirms the last 4 digits of their phone, accepts a consent line, and chats. They can send text and photos.
4. Staff see all open follow-ups in one inbox: unread first, days remaining on each, visit note pinned in the conversation.
5. When the window ends the chat becomes read-only for the patient, with two buttons: Book a visit and Extend follow-up.

## Rules

- A follow-up is open only between its start and end time. The server enforces this, not the UI.
- A patient link gives access to that one follow-up only.
- Staff see only their own clinic's follow-ups.
- Every patient screen shows: Not for emergencies, with the clinic phone number.
- No AI-generated replies or medical advice anywhere.
- Extend follow-up uses a mock payment for now and reopens the window for 7 days. It is only for follow-ups that ran out of time; one that staff closed early cannot be extended.
- The patient link is shown to staff once. If it is lost, staff generate a new one, and the old link stops working.
- After 5 wrong tries at the last 4 digits, a link is locked for 15 minutes.

## Out of scope for now

Native apps, real payments, appointment booking, prescriptions, multi-clinic admin, analytics.
