# Provider Portal Simulator

A static, client-side simulation of a payer **prior authorization provider portal**, for testing automation agents and RPA flows. The login, MFA, member roster and authorization data are all fake and generated in the browser. Nothing is sent to a server.

## Flow

1. **Login** (`#/login`): any username works with any password of **8+ characters**.
2. **MFA** (`#/mfa`): choose SMS or email. The "sent" code appears in a simulated message toast in the top-right corner (`#sim-mfa-code`). Codes expire after 5 minutes, and 3 wrong attempts send you back to login. Checking **Pause MFA** on the login page skips this step.
3. **Member Search** (`#/members`): a new roster of 40–140 members is generated on every login, plus the fixed member below. Search needs all four fields: **insurance member ID, first name, last name and date of birth** (MM/DD/YYYY or YYYY-MM-DD). Only a member matching every field is returned (names are case-insensitive). No list is shown before a search. Missing fields or an invalid date show an error (`search-error`), and a search with no match shows `no-match`.
4. **Member detail** (`#/members/:id`): the first time you open a member, 0–12 prior auth requests are generated with random statuses. They stay the same until you log out.
5. **Request detail** (`#/members/:id/requests/:authId`): has the payment information grid, the Primary ICD-10 chips and the service line table with **More Info** rows (reason and remark codes, allowed and paid amounts, pend notes). It also shows diagnosis codes and the request history.

Logging out, or 30 minutes of inactivity, clears everything. The next login produces entirely new data.

## Fixed member

This member is in every roster with the same details. Their prior auth requests are still generated at random.

| Insurance member ID | First name | Last name | DOB | Athena patient ID |
|---|---|---|---|---|
| YPS113094227 | Itejere | Chesley | 11/21/1975 | 1100493 |

To add more, edit `fixedMembers` in `assets/data.js`.

## Statuses generated

| Request status | Line status | Adjudication |
|---|---|---|
| Approved | APPROVED | Adjudicated |
| Partially Approved | APPROVED and DENY | Adjudicated |
| Denied | DENY (CARC/RARC codes) | Adjudicated |
| In Clinical Review | PEND | Pended |
| Additional Info Requested | PEND | Pended |
| Received | RECEIVED | In Process |
| Cancelled | VOID | Voided |

The payment amounts are internally consistent: allowed = deductible + copay + coinsurance + paid, adjustment = billed − allowed, and net = paid + interest − recovery.

## Scripted failure cases

| Input | Result |
|---|---|
| Password shorter than 8 characters, or `wrongpassword` | "Invalid username or password." |
| Username containing `locked` | Account locked message |
| Username containing `expired` | Password expired message |
| Wrong MFA code 3 times | Kicked back to login |

## Automation hooks

Key elements have `data-testid` attributes: `username`, `password`, `pause-mfa`, `login-submit`, `login-error`, `mfa-sms`, `mfa-email`, `mfa-send`, `sim-mfa-code`, `otp-0`…`otp-5`, `mfa-submit`, `mfa-error`, `search-id`, `search-first`, `search-last`, `search-dob`, `search-btn`, `search-error`, `no-match`, `member-row` (carries `data-member-id`), `request-row` (carries `data-request-id` and `data-status`), `request-status`, `line-row`, `line-status`, `more-info`, `pay-*` (payment fields) and `logout`.

You can type or paste all six MFA digits into the first box and they will fill the rest. Every page load includes a simulated delay of 0.3–1.4 seconds.

## Running locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Files

- `index.html`: the app shell
- `assets/app.js`: router, authentication, MFA and views
- `assets/generator.js`: random member and request generation (seeded PRNG, Luhn-valid NPIs)
- `assets/data.js`: reference lists (names, plans, CPT/HCPCS, ICD-10, CARC/RARC codes)
- `assets/styles.css`: styles

All people, organizations and identifiers are synthetic.
