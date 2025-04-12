# Southern Company API
[![Github Actions](https://github.com/apearson/southern-company-api/actions/workflows/integration.yml/badge.svg)](https://github.com/apearson/southern-company-api/actions/workflows/integration.yml)
[![npm](https://img.shields.io/npm/dt/southern-company-api.svg)](https://www.npmjs.com/package/southern-company-api)
[![license](https://img.shields.io/npm/l/southern-company-api.svg)](https://github.com/apearson/southern-company-api/blob/master/LICENSE.md)

Node.js Library to access utility data from Southern Company power utilities (Alabama Power, Georgia Power, Mississippi Power)

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

### Data methods
#### getMonthlyData()
**Description**
This method collects all monthly data on all accounts from the earliest available to the last complete month of data.

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
This method collects daily data from the `startDate` provided to the `endDate` provided.

**Arguments**
  * `startDate` First date (Date) to include in collection
  * `endDate` Last date (Date) to include in collection

**Returns**
  * Promise

**Promise Return**
  * `data` Each index of array is an account retrieved
      * `name` Name of the account
      * `accountNumber` Account number
      * `data` Each object of array is a month of data
        * `date` M/D/YYYY of data
        * `kWh` Total amount of kWh used during the date
        * `cost` Total energy cost for the date

**Example**
```typescript
/* Getting Daily Data */
const startDate = new Date(2017, 05, 01);
const endDate = new Date(2017, 05, 02);
const dailyData = await SouthernCompany.getDailyData(startDate, endDate);

/* Printing daily data */
console.info('Daily Data', JSON.stringify(data));

/* Result */
[{
  "accountNumber": 0000000000,
  "data":[
    {"date":"2017-05-01T06:00:00.000Z", "cost":2.17, "kWh":12.76},
    {"date":"2017-05-02T06:00:00.000Z", "cost":77, "kWh":77}
  ]
}]
```


## How Authentication Works
1. Login Page is loaded
  * `Method` GET
  * `URL` https://webauth.southernco.com/account/login
2. Grab the `RequestVerificationToken` from the login Page
  * `RequestVerificationToken` can be found at the bottom of the page in a script tag.  Inside the tag the `RequestVerificationToken` is assigned to `webauth.aft`
3. Login Request is initialized
  * `Method` POST
  * `URL` https://webauth.southernco.com/api/login
  * `Headers`
    * `RequestVerificationToken`: `RequestVerificationToken`
    * `Content-Type`: application/json
  * `Body` (JSON Object):
    * `username`: `username`
    * `password`: `password`
    * `params`
      * `ReturnUrl` 'null'
4. Grab the `ScWebToken` from the JSON response. Can be found in the `response.data.html` as a value on a hidden input with the name ScWebToken
5. Grab the new `ScWebToken` from the set cookies from a secondary LoginComplete request.
6. This secondary Southern Company Web Token can be traded in for a Southern Company JSON Web Token (`ScJwtToken`) that can be used with the API.
  * `Method` GET
  * `URL` https://customerservice2.southerncompany.com/Account/LoginValidated/JwtToken
  * `Headers`
    * `Cookie` ScWebToken=`ScWebToken`
7. Grab the `ScJwtToken` from the response's cookies
  * Cookie's name is ScJwtToken and contains the ScJwtToken
  * This `ScJwtToken` can be used to authenticate all other API requests.
