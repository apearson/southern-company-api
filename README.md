# Southern Company API
[![Github Actions](https://github.com/apearson/southern-company-api/actions/workflows/integration.yml/badge.svg)](https://github.com/apearson/southern-company-api/actions/workflows/integration.yml)
[![npm](https://img.shields.io/npm/dt/southern-company-api.svg)](https://www.npmjs.com/package/southern-company-api)
[![license](https://img.shields.io/npm/l/southern-company-api.svg)](https://github.com/apearson/southern-company-api/blob/master/LICENSE.md)

Node.js Library to access utility data from Southern Company power utilities (Alabama Power, Georgia Power, Mississippi Power)

## Looking for a maintainer

This project is no longer maintained. Southern Company recently changed its login (ForgeRock) and usage APIs, which broke this library. A working fix is in [PR #180](https://github.com/apearson/southern-company-api/pull/180). If you fork, start from there.

If you'd like to maintain it, or take it over as a fork, please [open an issue](https://github.com/apearson/southern-company-api/issues/new) or leave a comment. Once an actively maintained fork exists, this README and the npm package's deprecation message will point to it.

**Recommended fork:**

> None so far

## Example
```typescript
/* Importing Library */
import {SouthernCompanyAPI} from 'southern-company-api';
/* Or requiring for a script */
var SouthernCompanyAPI = require('../southern-company-api').SouthernCompanyAPI;

/* Instantiating API */
const SouthernCompany = new SouthernCompanyAPI({
  username: 'username',
  password: 'password',
  accounts: ['123123123']
});

const accounts = await API.getAccounts();
console.log("Accounts", JSON.stringify(accounts));

/* Grabbing Monthly Data */
const data = await API.getMonthlyData();
console.log("Monthly Data", JSON.stringify(data));

/* GettiGrabbingng Daily Data */
const servicePointNumber = accounts[0].servicePoints[0].servicePointNumber;
const startDate = new Date(2020, 2, 1);
const endDate = new Date();
const dailyData = await SouthernCompany.getDailyData(startDate, endDate, servicePointNumber);
```

## API

### Login
Login by passing username and password as a config object when instantiating.
```typescript
/* Instantiating API */
const API = new SouthernCompanyAPI({
  username: 'username',
  password: 'password'
});
```

Set `debug: true` on that config, or export `SOUTHERN_COMPANY_DEBUG=1`, to log each authentication and usage step. The log includes HTTP status, endpoint paths, and cookie names. Passwords, tokens, cookie values, and JWTs are not written.

### Data methods
#### getMonthlyData()
**Description**
This method collects monthly bill data for each account. The usage API is queried for the last 24 months, which is the range the portal requests.

**Arguments**
  * None

**Returns**
  * Promise

**Promise Return**
  * `data` Each index of array is an account retrieved
      * `name` Name of the account
      * `accountNumber` Account number
      * `data` Each object of array is a month of data
        * `date` M/YYYY of data
        * `cost` Total energy cost for the month
        * `kWh` Total amount of kWh used during the month
        * `bill` Amount billed for the month
  * `error` Description of error

**Example**
```typescript
/* Getting Monthly Data */
const monthlyData = await API.getMonthlyData();

/* Printing monthly data */
console.info('Monthly Data', JSON.stringify(monthlyData));

/* Result */
[{
  "accountNumber": 0000000000,
  "data":[
    {"startDate": "2024-02-16T00:00:00.000Z", "endDate": "2024-03-19T00:00:00.000Z", "cost":66.66,"kWh":416},
    {"startDate": "2024-03-19T00:00:00.000Z", "endDate": "2024-04-17T00:00:00.000Z",,"cost":62.23,"kWh":380},
    {"startDate": "2024-04-17T00:00:00.000Z", "endDate": "2024-05-17T00:00:00.000Z",,"cost":65.42,"kWh":406}
  ]
}]
```


#### getDailyData()
**Description**
This method collects daily data from the `startDate` provided to the `endDate` provided, inclusive of both dates.

**Arguments**
  * `startDate` First date (Date) to include in collection
  * `endDate` Last date (Date) to include in collection
  * `servicePointNumber` Service point number of the meter to collect data for

**Returns**
  * Promise

**Promise Return**
  * `data` Each index of array is an account retrieved
      * `name` Name of the account
      * `accountNumber` Account number
      * `hasData` `false` if the utility has no data for the requested range (e.g. it falls outside the retention window); `data` will be empty in that case. `true` otherwise.
      * `data` Each object of array is a day of data
        * `date` M/D/YYYY of data
        * `kWh` Total amount of kWh used during the date
        * `cost` Total energy cost for the date

**Example**
```typescript
/* Getting Daily Data */
const startDate = new Date(2017, 05, 01);
const endDate = new Date(2017, 05, 02);
const dailyData = await SouthernCompany.getDailyData(startDate, endDate, servicePointNumber);

/* Printing daily data */
console.info('Daily Data', JSON.stringify(data));

/* Result */
[{
  "accountNumber": 0000000000,
  "hasData": true,
  "data":[
    {"date":"2017-05-01T06:00:00.000Z", "cost":2.17, "kWh":12.76},
    {"date":"2017-05-02T06:00:00.000Z", "cost":77, "kWh":77}
  ]
}]
```


#### getHourlyData()
**Description**
This method collects hourly data from the `startDate` provided to the `endDate` provided, inclusive of both dates. A single call covers the whole range — there's no need to loop per day.

Hourly data is retained by the utility for roughly 3.6 years, considerably deeper than the ~33-day window offered by the portal's own CSV export.

**Arguments**
  * `startDate` First date (Date) to include in collection
  * `endDate` Last date (Date) to include in collection
  * `servicePointNumber` Service point number of the meter to collect data for

**Returns**
  * Promise

**Promise Return**
  * `data` Each index of array is an account retrieved
      * `accountNumber` Account number
      * `hasData` `false` if the utility has no data for the requested range (e.g. it falls outside the retention window); `data` will be empty in that case. `true` otherwise.
      * `data` Each object of array is an hour of data
        * `date` Local timestamp of the hour, transmitted with no UTC offset
        * `kWh` Total amount of kWh used during the hour
        * `cost` Total energy cost for the hour
        * `temp` Temperature during the hour, if reported

**Example**
```typescript
/* Getting Hourly Data */
const startDate = new Date(2026, 06, 24);
const endDate = new Date(2026, 06, 24);
const hourlyData = await SouthernCompany.getHourlyData(startDate, endDate, servicePointNumber);

/* Printing hourly data */
console.info('Hourly Data', JSON.stringify(hourlyData));

/* Result */
{
  "accountNumber": 0000000000,
  "hasData": true,
  "data":[
    {"date":"2026-07-24T16:00:00.000Z", "cost":0.31, "kWh":1.2, "temp":91}
  ]
}
```


## How Authentication Works
Southern Company's customer portal now signs in through ForgeRock, then trades that session for the portal JWT. The library follows the same redirects a browser does:

1. Start at the portal login URL, which redirects to WebAuth with app id `pr-occ-forgerock`.
  * `Method` GET
  * `URL` `https://customerservice2.southerncompany.com/Account/Login?returnUrl=/Billing/Home&company=SCS&appId=pr-occ-forgerock`
2. WebAuth starts an OpenID Connect authorization-code login (PKCE is held in the WebAuth session cookies) and redirects to ForgeRock.
  * `URL` `https://customerlogin.southernco.com/am/oauth2/authorize`
  * Journey `occSecureLogin` in realm `/alpha`
3. Submit the username and password to the ForgeRock authentication API.
  * `Method` POST
  * `URL` `https://customerlogin.southernco.com/am/json/realms/root/realms/alpha/authenticate?authIndexType=service&authIndexValue=occSecureLogin`
  * The first response is a `NameCallback` and `PasswordCallback`. Send those values back with the `authId`.
  * A successful response contains a ForgeRock `tokenId`. That value is sent as the session cookie named in ForgeRock `serverinfo` (not `iPlanetDirectoryPro`).
4. Repeat the authorize request with that session cookie. ForgeRock returns an auto-posted form (`code` and `state`) to `https://webauth.southernco.com/SPA/signin-forgerock-oidc-authcode`.
5. Post that form with the WebAuth cookies from step 2 and follow redirects back to `customerservice2`.
6. Read `ScJwtToken` from the response **header** of `https://customerservice2.southerncompany.com/Account/LoginValidated/JwtToken` (the portal no longer relies on the `ScJwtToken` set-cookie for this call). Use it as `Authorization: Bearer` on later requests.

Account list and usage data now come from the Ascend APIs the portal uses:

* Accounts: `https://occaccountapi.southerncompany.com/api/v1/Cap/` and `/api/v1/Accounts/{accountId}/Summary`
* Usage: `https://occmypowerusageapi.southerncompany.com/api/v1/MyPowerUsage/UsageGraphData/{serviceAgreementId}/{Monthly|Daily|Hourly}`

`getAccounts()`, `getMonthlyData()`, `getDailyData()`, and `getHourlyData()` keep the same arguments and return shapes. `servicePointNumber` is the meter's service point id from the account summary.

## Nicor Gas (LDC 7)

Nicor Gas uses a **cookie-based session** instead of the JWT flow used by the Southern Company electric utilities. Credentials are submitted directly to the Southern Company customer portal (`customerportal.southerncompany.com`), and all subsequent requests are authenticated via browser-style cookies.

### Login (Nicor)
```typescript
import { NicorAPI } from 'southern-company-api';

const API = new NicorAPI({
  username: 'username',
  password: 'password'
});

await API.login();
```

### getNicorUsageHistory()
**Description**
Fetches meter reading history and daily usage data from the Nicor Gas portal for the authenticated account.

**Arguments**
  * None

**Returns**
  * Promise

**Promise Return**
  * `accountId` Account number as a string
  * `projectedBill` Low-end projected bill amount for the current billing period (number)
  * `usageHistory` Each object is one billing period
      * `Date` Billing read date (MM/DD/YYYY)
      * `MeterReading` Cumulative meter reading
      * `ReadingDetails` `"Actual"` or `"Estimated"`
      * `CCfs` Usage in CCF for the period
      * `Therms` Usage in Therms for the period
      * `DaysUsed` Number of days in the billing period
  * `dailyUsage` Each object is one day of usage across all available billing periods
      * `date` JavaScript `Date` object for the day
      * `dayOfWeek` e.g. `"Monday"`
      * `therms` Therms consumed
      * `cost` Dollar cost for the day
      * `avgTemp` Average temperature (°F)
      * `meterRead` Cumulative meter read value
      * `readType` `"ACTUAL"` or `"ESTIMATED"`
      * `billingPeriod` Billing period range string, e.g. `"3/30/26-4/24/26"`

**Example**
```typescript
import { NicorAPI } from 'southern-company-api';

const API = new NicorAPI({ username: 'username', password: 'password' });
await API.login();

const data = await API.getNicorUsageHistory();

console.info('Account ID:', data.accountId);
console.info('Projected Bill:', data.projectedBill);

/* Billing period rollups */
console.info('Usage History', JSON.stringify(data.usageHistory));

/* Result */
[
  { "Date": "03/30/2026", "MeterReading": "3454.000000", "ReadingDetails": "Actual", "CCfs": 95, "Therms": 99.75, "DaysUsed": 31 },
  { "Date": "02/27/2026", "MeterReading": "3359.000000", "ReadingDetails": "Actual", "CCfs": 151, "Therms": 158.55, "DaysUsed": 30 }
]

/* Per-day records */
console.info('Daily Usage', JSON.stringify(data.dailyUsage));

/* Result */
[
  { "date": "2026-04-23T04:00:00.000Z", "dayOfWeek": "Thursday", "therms": 1.05, "cost": 2.88, "avgTemp": 58, "meterRead": 3493, "readType": "ACTUAL", "billingPeriod": "3/30/26-4/24/26" },
  { "date": "2026-04-22T04:00:00.000Z", "dayOfWeek": "Wednesday", "therms": 1.05, "cost": 2.88, "avgTemp": 67, "meterRead": 3492, "readType": "ACTUAL", "billingPeriod": "3/30/26-4/24/26" }
]
```
