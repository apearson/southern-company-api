# Southern Company API
[![Travis](https://img.shields.io/travis/apearson/southern-company-api.svg)](https://travis-ci.org/apearson/southern-company-api) [![Coveralls](https://img.shields.io/coveralls/apearson/southern-company-api.svg)](https://coveralls.io/github/apearson/southern-company-api)
[![npm](https://img.shields.io/npm/dt/southern-company-api.svg)](https://www.npmjs.com/package/southern-company-api)
[![license](https://img.shields.io/npm/l/southern-company-api.svg)](https://github.com/apearson/southern-company-api/blob/master/LICENSE.md)


## Example
```typescript
/* Importing Library */
import {SouthernCompanyAPI} from 'southern-company-api';

/* Instantiating API */
const SouthernCompany = new SouthernCompanyAPI({
  username: 'username',
  password: 'password',
  accounts: ['123123123']
});

/* Listening for login success */
SouthernCompany.on('connected', ()=>{
  console.info('Connected...');

  /* Getting Monthly Data */
  const monthlyData = await SouthernCompany.getMonthlyData();

  /* Printing Monthly Data */
  console.info('Monthly Data', JSON.stringify(data));

  /* Getting Daily Data */
  const startDate = new Date(2017, 05, 01);
  const endDate = new Date();
  const dailyData = await SouthernCompany.getDailyData(startDate, endDate);

  /* Printing daily data */
  console.info('Daily Data', JSON.stringify(data));
});

/* Listening for any errors */
SouthernCompany.on('error', console.error);
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

### Events
The instantiated object extends the [EventEmitter](https://nodejs.org/api/events.html) class built into node. To listen for events use the `.on(eventName, listener)` method.

Current Events:
  * connected (On connection success)
  * reconnected (On reconnection success)
  * error (On login failure)

```typescript
/* Listening for connection success */
API.on('connected', ()=>{
  console.info('Connected...');
});

/* Listening for connection success */
API.on('reconnected', ()=>{
  console.info('Reconnected...');
});


/* Listening for any errors */
API.on('error', (error)=>{
  console.error('An error occured', error);
});
```

### Data methods
#### getMonthlyData()
**Description**
This method collects all monthly data on all accounts from the time they were opened to the last complete month of data.

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
  "name":"Apartment",
  "accountNumber":0000000000,
  "data":[
    {"date":"2017-03-01T06:00:00.000Z","cost":66.66,"kWh":416,"bill":87},
    {"date":"2017-04-01T06:00:00.000Z","cost":62.23,"kWh":380,"bill":87},
    {"date":"2017-05-01T06:00:00.000Z","cost":65.42,"kWh":406,"bill":87}
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
        * `cost` Total energy cost for the date
        * `kWh` Total amount of kWh used during the date

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
  "name":"Apartment",
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

5. This Southern Company Web Token can be traded in for a Southern Company JSON Web Token (`ScJwtToken`) that can be used with the API.
  * `Method` GET
  * `URL` https://customerservice2.southerncompany.com/Account/LogginValidated/JwtToken
  * `Headers`
    * `Cookie` ScWebToken=`ScWebToken`
6. Grab the `ScJwtToken` from the response's cookies
  * Cookie's name is ScJwtToken and contains the ScJwtToken
  * This `ScJwtToken` can be used to authenticate all other API requests.
