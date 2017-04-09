'use Strict';

const EventEmitter = require('events').EventEmitter;
const util = require('util');
const request = require('request');
const moment = require('moment');

const LoginURL = 'https://webauth.southernco.com/login.aspx?WL_Type=E&WL_AppId=OCCEvo&WL_ReturnMethod=FV&WL_Expire=1&ForgotInfoLink=undefined&ForgotPasswordLink=undefined&WL_ReturnUrl=https%3A%2F%2Fcustomerservice2.southerncompany.com%3A443%2FAccount%2FLogginValidated%3FReturnUrl%3D%2FLogin';
const WebTokenURL = 'https://webauth.southernco.com/login.aspx?WL_ReturnUrl=https%3a%2f%2fcustomerservice2.southerncompany.com%3a443%2fAccount%2fLogginValidated%3fReturnUrl%3d%2fLogin';
const JWT_URL = 'https://customerservice2.southerncompany.com/Account/LogginValidated/JwtToken';
const Monthly_Data_URL = 'https://customerservice2api.southerncompany.com/api/MyPowerUsage/MonthlyGraph';
const Daily_Data_URL = 'https://customerservice2api.southerncompany.com/api/MyPowerUsage/DailyGraph';
const Accounts_URL = 'https://customerservice2api.southerncompany.com/api/account/getAllAccounts';
const ServicePointNumbers_URL = 'https://customerservice2api.southerncompany.com/api/account/servicePointNumbers/';

/* Constructor */
function SouthernCompanyAPI(){
  /* Closure */
  const self = this;

  /* Storing Configuration */
  self.JWToken;
  self.accounts = [];

  /* Debug Functions */
  this.printVars = ()=>{
    console.info('JWT:',self.JWToken);
    console.info('Accounts:',self.accounts);
  };

  /* Public Functions */
  this.login = (config)=> new Promise((resolve, reject)=>{
    self.getLoginVars()
      .then((loginVars)=>{
        return self.getScWebToken(loginVars, config.username, config.password);
      })
      .then(self.getJWToken)
      .then((JWToken)=>{
        self.JWToken = JWToken;
        return JWToken;
      })
      .then(self.getAccounts)
      .then(self.getServicePointNumbers)
      .then(()=>{
        self.emit('login');
      })
      .then(resolve)
      .catch(reject);
  });
  this.getAccounts = ()=> new Promise((resolve, reject)=>{
    /* Setting up request */
    const options = {
      url: Accounts_URL,
      method: 'GET',
      auth:{
        'bearer': self.JWToken
      }
    };

    /* Making request */
    request(options, (error, response, body)=>{
      /* Rejecting promise on any error */
      if(error) reject(error);

      /* Parsing data */
      const data = JSON.parse(body).Data;

      /* Pulling usable data */
      data.forEach((account)=>{
        self.accounts.push({
          name: account.Description,
          primary: account.PrimaryAccount,
          accountNumber: account.AccountNumber,
          premiseNumber: account.PremiseNumber
        });
      });

      /* Fulfilling Promise */
      resolve(self.accounts);
    });
  });
  this.getMonthlyData = ()=> new Promise((resolve, reject)=>{
    /* Setting up request */
    var options = {
      url: Monthly_Data_URL,
      method: 'POST',
      auth:{
        'bearer': self.JWToken
      },
      json:{
        'accountNumber':'0000000000',
        'PremiseNo':'000000000',
        'OnlyShowCostAndUsage':'false',
        'IsWidget':'false'
      }
    };

    /* Making Request */
    request(options, (error, response, body)=>{
      /* Rejecting promise on any error */
      if(error) reject(error);

      /* Parsing data */
      const data = JSON.parse(body.Data.Data).graphset[0];

      /* Resulting Array */
      let result = [];

      /* Collecting Data */
      for(let i = 0; i < data['scale-x'].labels.length; i++){
        result.push({
          date: data['scale-x'].labels[i],
          cost: data.series[0].values[i],
          kWh: data.series[1].values[i],
          bill: data.series[2].values[i]
        });
      }
      resolve(result);
    });
  });
  this.getDailyData = (begin, end)=> new Promise((resolve, reject)=>{
    let startDate = moment(begin, 'M/D/Y').subtract(1, 'days');
    let endDate = moment(end, 'M/D/Y');

    /* Setting up Cost request */
    var costOptions = {
      url: Daily_Data_URL,
      method: 'POST',
      auth:{
        'bearer': self.JWToken
      },
      json:{
        'acctNum':0000000000,
        'StartDate':startDate.format('M/D/Y'),
        'EndDate':endDate.format('M/D/Y'),
        'PremiseNo':'000000000',
        'ServicePointNo':'85626337',
        'DataType':'Cost',
        'OPCO':'APC',
        'intervalBehavior':'Automatic',
      }
    };

    /* Setting up Usage request */
    var usageOptions = {
      url: Daily_Data_URL,
      method: 'POST',
      auth:{
        'bearer': self.JWToken
      },
      json:{
        'acctNum':0000000000,
        'StartDate':startDate.format('M/D/Y'),
        'EndDate':endDate.format('M/D/Y'),
        'PremiseNo':'000000000',
        'ServicePointNo':'85626337',
        'DataType':'Usage',
        'OPCO':'APC',
        'intervalBehavior':'Automatic',
      }
    };

    /* Making Request */
    request(costOptions, (costError, costResponse, costBody)=>{
      request(usageOptions, (usageError, usageResponse, usageBody)=>{
        /* Rejecting promise on any error */
        if(costError) reject(costError);
        if(usageError) reject(usageError);

        /* Parsing data */
        const costData  = JSON.parse(costBody.Data.Data).graphset[0];
        const usageData = JSON.parse(usageBody.Data.Data).graphset[0];

        /* Resulting Array */
        let results = [];

        /* Merging Weekday and Weekend data arrays */
        let costDataArray = costData.series[1].values.concat(costData.series[2].values);
        let usageDataArray = usageData.series[1].values.concat(usageData.series[2].values);

        /* Sorting Data Arrays on dates */
        costDataArray.sort((a,b)=>{
          if(a[0] > b[0]) return 1;
          if(a[0] < b[0]) return -1;
          if(a[0] == b[0]) return 0;
        });
        usageDataArray.sort((a,b)=>{
          if(a[0] > b[0]) return 1;
          if(a[0] < b[0]) return -1;
          if(a[0] == b[0]) return 0;
        });

        /* Collecting Data */
        for(let i = 0; i < usageDataArray.length; i++){
          let currentDate = moment(startDate).add(i + 1, 'days');

          //Compile Result
          results.push({
            date: currentDate.format('M/D/Y'),
            cost: costDataArray[i][1],
            kWh: usageDataArray[i][1],
          });
        }

        /* Fulfilling promise */
        resolve(results);
      });
    });
  });


  /* Semi Public Functions */
  this.getLoginVars = ()=> new Promise((resolve, reject)=>{
    request(LoginURL,(error, response, body)=>{
      /* Rejecting Promise on HTTP error */
      if(error) reject(error);

      /* View State */
      const viewstate_regex = /<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="(.*)" \/>/;
      const viewstate_match = body.match(viewstate_regex);
      const viewstate = viewstate_match[1];

      /* Event Validation */
      const event_validation_regex = /<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="(.*)" \/>/;
      const event_validation_match = body.match(event_validation_regex);
      const event_validation = event_validation_match[1];

      /* Fulfilling Promise */
      resolve({viewstate,event_validation});
    });
  });
  this.getScWebToken = (loginVars, username, password)=> new Promise((resolve, reject)=>{
    /* Setting up request */
    var options = {
      url: WebTokenURL,
      method: 'POST',
      form: {
        '__VIEWSTATE': loginVars.viewstate,
        '__VIEWSTATEENCRYPTED': '',
        '__EVENTVALIDATION': loginVars.event_validation,
        'ctl00$MainContent$txtUsername': username,
        'ctl00$MainContent$txtPassword': password,
        'ctl00$MainContent$btnLogin.x': 0,
        'ctl00$MainContent$btnLogin.y': 0
      }
    };

    /* Making request */
    request(options,(error, response, body)=>{
      /* Rejecting promise on HTTP error */
      if(error) reject(error);


      /* Parsing out ScWebToken */
      const ScWebToken_regex = /<INPUT TYPE='hidden' NAME='ScWebToken' value='(>.[0-9a-fA-F]+)'>/;
      const ScWebToken_match = body.match(ScWebToken_regex);
      const ScWebToken = ScWebToken_match[1];

      /* Fulfilling Promise */
      resolve(ScWebToken);
    });

  });
  this.getJWToken = (ScWebToken)=> new Promise((resolve, reject)=>{
    /* Setting up request */
    var options = {
      url: JWT_URL,
      method: 'GET',
      headers: {
        'Cookie':`ScWebToken=${encodeURIComponent(ScWebToken)}`
      }
    };

    /* Making Request */
    request(options, (error, response)=>{
      /* Rejecting promise on any error */
      if(error) reject(error);

      /* Parsing out JWT */
      const ScJWToken_regex = /ScJwtToken=(.*);/;
      const ScJWToken_match = response.headers['set-cookie'][0].match(ScJWToken_regex);
      const ScJWToken = ScJWToken_match[1];

      /* Fulfilling Promise */
      resolve(ScJWToken);
    });
  });
  this.getServicePointNumbers = (accounts)=> new Promise((resolve, reject)=>{
    /* Promise holder */
    let promises = [];

    /* Looping over accounts */
    for(let i = 0; i < accounts.length; i++){
      promises[i] = self.getServicePointNumber(accounts[i]);
    }

    /* Waiting for all promises to complete */
    Promise.all(promises)
      .then((accounts)=>{
        /* Updating stored accounts */
        self.accounts = accounts;

        /* Passing back accounts */
        resolve(self.accounts);
      })
      .catch(reject);
  });
  this.getServicePointNumber = (account)=> new Promise((resolve, reject)=>{
    /* Setting up request */
    var options = {
      url: ServicePointNumbers_URL + account.accountNumber,
      method: 'GET',
      auth:{
        'bearer': self.JWToken
      }
    };

    /* Making Request */
    request(options, (error, response, body)=>{
      /* Rejecting promise on any error */
      if(error) reject(error);

      const data = JSON.parse(body);

      account.servicePointNumber = data.ServicePointNumber;
      account.premiseNumber = data.PremiseNumber;

      /* Fulfilling Promise */
      resolve(account);
    });
  });
}

/* Constructor */
util.inherits(SouthernCompanyAPI, EventEmitter);
module.exports = SouthernCompanyAPI;
