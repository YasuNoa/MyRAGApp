# Monetization & Pricing

## Plans

### FREE (梅)
- **Price**: 0 JPY
- **Chat Limit**: 10 messages / cooldown period (1 hour cooldown if exceeded? Logic suggests 1h rolling or manual reset check).
- **Voice Limit**: 5 files / day.
- **Voice Duration Limit**: 20 minutes per file (Truncated).
- **Storage**: ?

### STANDARD (竹)
- **Price**: 980 JPY / Month (approx)
- **Chat Limit**: 100 messages / day (Resets at JST midnight).
- **Voice Limit**: Unlimited count.
- **Voice Duration Limit**: 90 minutes per file.
- **Monthly Voice Quota**: 1800 minutes / month.

### PREMIUM (松)
- **Price**: 1980 JPY / Month (approx)
- **Chat Limit**: 200 messages / day.
- **Voice Limit**: Unlimited count.
- **Voice Duration Limit**: 180 minutes per file (3 hours).
- **Monthly Voice Quota**: 6000 minutes / month.

## Add-ons (Tickets)
- **Voice Ticket**: 300 JPY (Sales logic in `checkout/route.ts` implies price ID `TICKET_90`).
    - Grants **+90 minutes** (or 270? DB logic `purchasedVoiceBalance: 90` says 90, comment says "+270 mins for 300 yen"). *Code `checkout/route.ts` creates session, `webhook` adds 90 mins.*
    - One-time purchase.

## Referral Program
- **Mechanism**:
    - User shares link.
    - Referee signs up & uploads first voice memo.
    - **Referee Reward**: 30 Days of STANDARD Plan (Trial).
    - **Referrer Reward**: ? (Likely same or extension, logic needs confirmation in `process_referral_reward`).

## Payment Infrastructure
- **Provider**: Stripe
- **Modes**: Subscription (Recurring), Payment (One-time).
- **Webhooks**: comprehensive handling of subscription states and trial mapping.
