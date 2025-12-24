# Monetization & Pricing

## Plans

### FREE (梅)
- **Price**: 0 JPY
- **Chat Limit**: 5 messages / day (with short-term cooldown logic).
- **Voice Upload Limit**: 2 files / day.
- **Voice Duration Limit**: 20 minutes per file (Truncated).
- **Storage Limit**: 5 files (Knowledge).

### STANDARD (竹)
- **Price**: 980 JPY / Month
- **Chat Limit**: 100 messages / day.
- **Voice Upload Limit**: Unlimited count.
- **Voice Duration Limit**: 90 minutes per file.
- **Monthly Voice Quota**: 1800 minutes (30 hours) / month.
- **Storage Limit**: 200 files.

### PREMIUM (松)
- **Price**: 1980 JPY / Month
- **Chat Limit**: 200 messages / day.
- **Voice Upload Limit**: Unlimited count.
- **Voice Duration Limit**: 180 minutes per file (3 hours).
- **Monthly Voice Quota**: 6000 minutes (100 hours) / month.
- **Storage Limit**: 1000 files.

## Add-ons (Tickets)
- **Voice Ticket**: 300 JPY
    - Grants **+90 minutes** of voice processing balance.
    - One-time purchase.

## Referral Program
- **Mechanism**:
    - User shares link.
    - Referee signs up & uploads first voice memo.
    - **Status**: Updated to "COMPLETED" upon referee's first voice upload.
- **Campaign Mode (LAUNCH)**:
    - **Referee Reward**: 30 Days of STANDARD Plan (Full).
    - **Referrer Reward**:
        - 1st Success: 30 Days of STANDARD Plan.
        - 2nd+ Success: 7 Days of STANDARD TRIAL Plan.

## Payment Infrastructure
- **Provider**: Stripe
- **Modes**: Subscription (Recurring), Payment (One-time).
- **Webhooks**: Handles subscription states, trial mapping, and ticket provisioning.
