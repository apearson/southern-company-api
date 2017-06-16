/* Libraries */
const EventEmitter = require('events');
const axios = require('axios');
const moment = require('moment');

/* URLs */
const urls = {
  loginPage: 'https://webauth.southernco.com/account/login',
  LoginAPI: 'https://webauth.southernco.com/api/login',
  ScJwtToken: 'https://customerservice2.southerncompany.com/Account/LogginValidated/JwtToken',
  ServicePointNumber: 'https://customerservice2api.southerncompany.com/api/account/servicePointNumbers',
  accounts: 'https://customerservice2api.southerncompany.com/api/account/getAllAccounts',
  monthlyData: 'https://customerservice2api.southerncompany.com/api/MyPowerUsage/MonthlyGraph',
  dailyData: 'https://customerservice2api.southerncompany.com/api/MyPowerUsage/DailyGraph'
};

/* Object Class */
module.exports = class SouthernCompanyAPI extends EventEmitter{
  /* Constructor */
  constructor(config){
    /* Constructing parent class */
    super();

    /* Saving config */
    this.config = config;

    /* Starting connection */
    this.connect();
  }

  /* Connection Methods */
  connect(){
    /* Start Login Process and on sucess eimit connected */
    this.login()
      .then(()=>{
        /* Emitting connected */
        this.emit('connected');

        /* Setup Reconnection */
        this.setupReconnect();
      })
      .catch((error)=>{
        /* Emitting error event */
        this.emit('error', error);
      });
  }
  reconnect(){
    /* Start Login Process and on success emit reconnection */
    this.login()
      .then(()=>{
        /* Emitting connected */
        this.emit('reconnected');

        /* Setup Reconnection */
        this.setupReconnect();
      })
      .catch((error)=>{
        /* Emitting error event */
        this.emit('error', error);
      });
  }
  setupReconnect(){
    /* Calulating Session Expiration time and time til expiration */
    const ScJwtTokenBody = this.ScJwtToken.split('.')[1];
    const ScJwtTokenData = JSON.parse(Buffer.from(ScJwtTokenBody, 'base64'));
    const expirationTime = ScJwtTokenData.exp;
    const timeTilExpiration = expirationTime - (new Date() / 1000);

    /* Setting up reconnection for 1 hour before expiration */
    setTimeout(()=>{ this.reconnect(); },(timeTilExpiration - (timeTilExpiration - 3600)) * 1000);
  }

  /* Southern Company Login Method */
  login(){ return new Promise((resolve, reject)=>{
    /* Starting login process */
    this.getRequestVerificationToken()
      .then((RequestVerificationToken)=>{
        /* Saving Token */
        this.RequestVerificationToken = RequestVerificationToken;

        /* Passing token forward */
        return RequestVerificationToken;
      })
      .then((RequestVerificationToken)=>{
        return this.makeLoginRequest(RequestVerificationToken, this.config.username, this.config.password);
      })
      .then((ScWebToken)=>{
        /* Saving Token */
        this.ScWebToken = ScWebToken;

        /* Passing ScWebToken forward */
        return ScWebToken;
      })
      .then(this.makeJwtRequest)
      .then((ScJwtToken)=>{
        /* Saving Token */
        this.ScJwtToken = ScJwtToken;

        /* Passing token forward */
        return ScJwtToken;
      })
      .then(()=> this.getAccounts())
      .then((accounts)=>{
        /* Saving Account */
        this.accounts = accounts;

        return accounts;
      })
      .then((accounts)=> this.getServicePointNumbers(accounts))
      .then(resolve)
      .catch(reject);
  });}

  /* Login Helper Methods */
  getRequestVerificationToken(){ return new Promise((resolve, reject)=>{
    /* Config for request */
    const request = {
      method: 'GET',
      url: urls.loginPage,
      responseType: 'document',
    };

    /* Making request */
    axios(request)
      .then((response)=>{
        /* Creating regex to pull RequestVerificationToken */
        const regex = /webAuth\.aft = '(\S+)'/i;

        /* Searching with regex and getting match */
        const RequestVerificationToken = response.data.match(regex)[1];

        /* Check to see if token exists */
        if(!RequestVerificationToken){
          reject('Failed to get RequestVerificationToken');
        }

        /* Fulfilling Promise */
        resolve(RequestVerificationToken);
      })
      .catch(reject);
  });}
  makeLoginRequest(RequestVerificationToken, username, password){ return new Promise((resolve, reject)=>{
    /* Config for request */
    const request = {
      method: 'POST',
      url: urls.LoginAPI,
      responseType: 'JSON',
      headers:{
        RequestVerificationToken: RequestVerificationToken
      },
      data:{
        username: username,
        password: password,
        params:{
          ReturnUrl: 'null',
        }
      }
    };

    /* Making request */
    axios(request)
      .then((response)=>{
        /* Checking if username or password is incorrect */
        if(response.data.statusCode == 500){
          reject('Incorrect Username/Password');
          return;
        }

        /* Creating regex to pull ScWebToken */
        const regex = /<input type='hidden' name='ScWebToken' value='(\S+)'>/i;

        /* Searching with regex and getting match */
        const ScWebToken = response.data.data.html.match(regex)[1];

        /* Check to see if token exists */
        if(!ScWebToken){
          reject('Failed to get ScWebToken');
        }

        /* Fulfilling Promise */
        resolve(ScWebToken);
      })
      .catch(reject);

  });}
  makeJwtRequest(ScWebToken){ return new Promise((resolve, reject)=>{
    /* Config for request */
    const request = {
      method: 'GET',
      url: urls.ScJwtToken,
      responseType: 'JSON',
      headers:{
        Cookie: `ScWebToken=${ScWebToken}`
      }
    };

    /* Making request */
    axios(request)
      .then((response)=>{
        /* Creating regex to pull ScWebToken */
        const regex = /ScJwtToken=(.*);/i;

        /* Searching with regex and getting match */
        const ScJwtToken = response.headers['set-cookie'][0].match(regex)[1];

        resolve(ScJwtToken);

        /* Check to see if token exists */
        if(!ScJwtToken){
          reject('Failed to get ScJwtToken');
        }

        /* Fulfilling Promise */
        resolve(ScJwtToken);
      })
      .catch(reject);
  });}
  getAccounts(){ return new Promise((resolve, reject)=>{
    /* Config for request */
    const request = {
      method: 'GET',
      url: urls.accounts,
      responseType: 'JSON',
      headers:{
        Authorization: `bearer ${this.ScJwtToken}`
      }
    };

    /* Making request */
    axios(request)
      .then((response)=>{
        /* Holder for accounts */
        let accounts = [];

        /* Pulling usable data */
        response.data.Data.forEach((account)=>{
          let company = 'SCS';

          /* Calulating Company */
          switch(account.Company){
            case 1: company = 'APC'; break;
            case 2: company = 'GPC'; break;
            case 3: company = 'GULF'; break;
            case 4: company = 'MPC'; break;
          }

          /* Generating Account Object and pushing onto accounts array */
          accounts.push({
            name: account.Description,
            primary: account.PrimaryAccount,
            accountNumber: account.AccountNumber,
            premiseNumber: account.PremiseNumber,
            company: company
          });
        });

        /* Filter accounts if needed  */
        if(this.config.account != null){
          accounts = accounts.filter((account)=> account.accountNumber == this.config.account);
        }

        /* Fulfilling Promise */
        resolve(accounts);
      })
      .catch(reject);
  });}
  getServicePointNumbers(accounts){ return new Promise((resolve, reject)=>{
    /*  Requests holder */
    const requests = [];

    /* Looping over all accounts to generate requests */
    accounts.forEach((account)=>{
      /* Creating a new request for account and pushing onto queue */
      const request = {
        method: 'GET',
        url: `${urls.ServicePointNumber}/${account.accountNumber}`,
        responseType: 'JSON',
        headers:{
          Authorization: `bearer ${this.ScJwtToken}`
        }
      };

      /* Making and storing request */
      requests.push(axios(request));
    });

    /* Waiting on all requests */
    axios.all(requests)
      .then((responses)=>{
        /* Looping through all responses to assign service numbers */
        responses.forEach((response, index)=>{
          accounts[index].servicePointNumber = response.data.ServicePointNumber;
          accounts[index].premiseNumber = response.data.PremiseNumber;
        });

        /* Resolving Promise */
        resolve(accounts);
      })
      .catch(reject);
  });}

  /* Data collection methods */
  getMonthlyData(){ return new Promise((resolve, reject)=>{
    /*  Requests holder */
    let requests = [];

    /* Looping over accounts and generating requests */
    this.accounts.forEach((account)=>{
      /* Creating a new request for account and pushing onto queue */
      const request = {
        method: 'POST',
        url: urls.monthlyData,
        responseType: 'JSON',
        headers:{
          Authorization: `bearer ${this.ScJwtToken}`
        },
        data:{
          'accountNumber': account.accountNumber,
          'PremiseNo': account.premiseNumber,
          'OnlyShowCostAndUsage':'false',
          'IsWidget':'false'
        }
      };

      /* Making and storing request */
      requests.push(axios(request));
    });

    /* Waiting on all requests */
    axios.all(requests)
      .then((responses)=>{
        /* Results holder */
        const results = [];

        /* Looping through all responses */
        responses.forEach((response, index)=>{
          /* Parsing data from graphset */
          const data = JSON.parse(response.data.Data.Data).graphset[0];

          /* Resulting Array */
          let result = {
            name: this.accounts[index].name,
            accountNumber: this.accounts[index].accountNumber,
            data: [],
          };

          /* Parse Data if there is data to parse */
          if(data['scale-x'] !== undefined){
            for(let i = 0; i < data['scale-x'].labels.length; i++){
              /* Compiling always available data */
              const month = {
                date: data['scale-x'].labels[i],
                cost: data.series[0].values[i],
                kWh: data.series[1].values[i]
              };

              /* Adding option data */
              if(data.series.length > 2){
                month.bill = data.series[2].values[i];
              }

              /* Saving data */
              result.data.push(month);
            }
          }

          /* Adding result to results holder */
          results.push(result);
        });

        /* Resolving Promise */
        resolve(results);
      })
      .catch(reject);
  });}
  getDailyData(begin, end){ return new Promise((resolve, reject)=>{
    /* Formating start and end date */
    let startDate = moment(begin, 'M/D/Y');
    let endDate = moment(end, 'M/D/Y');

    /* Validating Dates */
    if(startDate.isAfter(endDate)){
      reject('Invalid Dates');
      return;
    }

    /* Correcting for southern company date formatting */
    startDate.subtract(1, 'days');

    /* Requests holder */
    const requests = [];

    /* Looping over all accounts*/
    this.accounts.forEach((account)=>{
      /* Generating account promise */
      requests.push(new Promise((resolve, reject)=>{
        /* Account request holder */
        const accountRequests = [];

        /* Generating Cost Request */
        const costRequest = {
          method: 'POST',
          url: urls.dailyData,
          responseType: 'JSON',
          headers:{
            Authorization: `bearer ${this.ScJwtToken}`
          },
          data:{
            'acctNum':account.accountNumber,
            'StartDate':startDate.format('M/D/Y'),
            'EndDate':endDate.format('M/D/Y'),
            'PremiseNo':account.premiseNumber,
            'ServicePointNo':account.servicePointNumber,
            'DataType':'Cost',
            'OPCO':account.company,
            'intervalBehavior':'Automatic'
          }
        };

        /* Generating Usage Request */
        const usageRequest = {
          method: 'POST',
          url: urls.dailyData,
          responseType: 'JSON',
          headers:{
            Authorization: `bearer ${this.ScJwtToken}`
          },
          data:{
            'acctNum':account.accountNumber,
            'StartDate':startDate.format('M/D/Y'),
            'EndDate':endDate.format('M/D/Y'),
            'PremiseNo':account.premiseNumber,
            'ServicePointNo':account.servicePointNumber,
            'DataType':'Usage',
            'OPCO':account.company,
            'intervalBehavior':'Automatic',
          }
        };

        /* Making and storing cost and usage requests */
        accountRequests.push(axios(costRequest));
        accountRequests.push(axios(usageRequest));

        /* Waiting on cost and usage requests */
        axios.all(accountRequests)
          .then((responses)=>{
            /* Parsing graph data */
            const costData  = JSON.parse(responses[0].data.Data.Data).graphset[0];
            const usageData = JSON.parse(responses[1].data.Data.Data).graphset[0];

            /* Merging Weekday and Weekend data arrays */
            let costDataArray = [];
            let usageDataArray = [];

            /* Parsing data if it exist */
            if(costData.series != null){
              costDataArray = costData.series[1].values.concat(costData.series[2].values);
            }

            if(costData.series != null){
              usageDataArray = usageData.series[1].values.concat(usageData.series[2].values);
            }

            /* Sorting Data Array on dates */
            const normalSort = (a,b)=>{ if(a[0] > b[0]) return 1; if(a[0] > b[0]) return 1; if(a[0] == b[0]) return 0; };
            costDataArray.sort(normalSort);
            usageDataArray.sort(normalSort);

            /* Account result object */
            let result = {
              name: account.name,
              accountNumber: account.accountNumber,
              data: [],
            };

            /* Building result data */
            for(let i = 0; i < costDataArray.length; i++){
              /* Plus one more to correct for southern company date format */
              let currentDate = moment(startDate).add(i + 1, 'days');

              /* Checking that date falls within requested range */
              if(currentDate.isSameOrAfter(startDate) && currentDate.isSameOrBefore(endDate)){

                /* Compiling Data */
                const dayData = {
                  date: currentDate.format('M/D/Y'),
                  cost: costDataArray[i][1],
                  kWh: usageDataArray[i][1],
                };

                /* Removing data if data is partal invalid data */
                if(costDataArray[i][1] == usageDataArray[i][1]){
                  dayData.cost = null;
                  dayData.kWh = null;
                }

                /* Put data into return array */
                result.data.push(dayData);
              }
            }

            resolve(result);
          })
          .catch(reject);

      }));
    });

    /* Waiting on all accounts requests and then fulfilling or rejecting */
    Promise.all(requests).then(resolve).catch(reject);
  });}
};
