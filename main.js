/* Libraries */
const EventEmitter = require('events');
const axios = require('axios');
const moment = require('moment');

/* URLs */
const urls = {
  loginPage: 'https://webauth.southernco.com/account/login',
  LoginAPI: 'https://webauth.southernco.com/api/login',
  ScJwtToken: 'https://customerservice2.southerncompany.com/Account/LogginValidated/JwtToken',
  AccountDetails: 'https://customerservice2api.southerncompany.com/api/account/getAccountDetailLight',
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

    /* Starting connection if there is a config, no config means testing */
    if(this.config != null){
      this.connect();
    }
    else{
      this.config = {};
    }
  }

  /* Connection Methods */
  async connect(){
    try{
      /* Start Login Process and on sucess eimit connected */
      await this.login();

      /* Emitting connected */
      this.emit('connected');

      /* Setup Reconnection */
      this.setupReconnect();
    }
    catch(err){
      /* Emitting error event */
      this.emit('error', err);
    }
  }
  async reconnect(){
    try{
      /* Start Login Process and on success emit reconnection */
      await this.login();

      /* Emitting connected */
      this.emit('reconnected');

      /* Setup Reconnection */
      this.setupReconnect();
    }
    catch(error){
      /* Emitting error event */
      this.emit('error', error);
    }
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
  async login(){
    try{
      /* Getting request verification token from login page */
      this.RequestVerificationToken = await this.getRequestVerificationToken();

      /* Login Request */
      this.ScWebToken = await this.makeLoginRequest(this.RequestVerificationToken, this.config.username, this.config.password);

      /* Trading ScWebToken for ScJwtToken */
      this.ScJwtToken = await this.makeJwtRequest(this.ScWebToken);

      /* Getting accounts */
      this.accounts = await this.getAccounts();
    }
    catch(error){
      throw error;
    }
  }

  /* Login Helper Methods */
  async getRequestVerificationToken(){
    /* Config for request */
    const request = {
      method: 'GET',
      url: urls.loginPage,
      responseType: 'document',
    };

    try{
      /* Making request */
      const response = await axios(request);

      /* Creating regex to pull RequestVerificationToken */
      const regex = /webAuth\.aft = '(\S+)'/i;

      /* Searching with regex and getting match */
      const RequestVerificationToken = response.data.match(regex)[1];

      /* Check to see if token exists */
      if(!RequestVerificationToken){
        throw new Error('Failed to get RequestVerificationToken');
      }

      /* Returning token */
      return RequestVerificationToken;
    }
    catch(error){
      throw error;
    }
  }
  async makeLoginRequest(RequestVerificationToken, username, password){
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

    try{
      /* Making request */
      const response = await axios(request);

      /* Checking if username or password is incorrect */
      if(response.data.statusCode == 500){
        throw new Error('Incorrect Username/Password');
      }

      /* Creating regex to pull ScWebToken */
      const regex = /<input type='hidden' name='ScWebToken' value='(\S+)'>/i;

      /* Searching with regex and getting match */
      const ScWebToken = response.data.data.html.match(regex)[1];

      /* Check to see if token exists */
      if(!ScWebToken){
        throw new Error('Failed to get ScWebToken');
      }

      /* Returning Token */
      return ScWebToken;
    }
    catch(error){
      throw error;
    }
  }
  async makeJwtRequest(ScWebToken){
    /* Config for request */
    const request = {
      method: 'GET',
      url: urls.ScJwtToken,
      responseType: 'JSON',
      headers:{
        Cookie: `ScWebToken=${ScWebToken}`
      }
    };

    try{
      /* Making request */
      const response = await axios(request);

      /* Creating regex to pull ScWebToken */
      const regex = /ScJwtToken=(.*);/i;

      /* Searching with regex and getting match */
      const ScJwtToken = response.headers['set-cookie'][0].match(regex)[1];

      /* Check to see if token exists */
      if(!ScJwtToken){
        throw new Error('Failed to get ScJwtToken');
      }

      /* Returning token */
      return ScJwtToken;
    }
    catch(error){
      throw error;
    }
  }
  async getAccounts(){
    /* Config for request */
    const request = {
      method: 'GET',
      url: urls.accounts,
      responseType: 'JSON',
      headers:{
        Authorization: `bearer ${this.ScJwtToken}`
      }
    };

    try{
      /* Making request */
      const response = await axios(request);

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
          company: company
        });
      });

      /* Filter accounts if needed  */
      if(this.config.account != null){
        accounts = accounts.filter((account)=> account.accountNumber == this.config.account);
      }

      /* Returning accounts */
      return accounts;
    }
    catch(error){
      throw error;
    }
  }

  /* Data collection methods */
  async getMonthlyData(){
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
          'OnlyShowCostAndUsage':'false',
          'IsWidget':'false'
        }
      };

      /* Making and storing request */
      requests.push(axios(request));
    });

    try{
      /* Waiting on all requests */
      const responses = await axios.all(requests);

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

      /* Returning daily data */
      return results ;
    }
    catch(error){
      throw error;
    }
  }

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
            'accountNumber':account.accountNumber,
            'StartDate':startDate.format('M/D/Y'),
            'EndDate':endDate.format('M/D/Y'),
            'DataType':'Cost',
            'OPCO':account.company,
            'intervalBehavior':'Automatic',
            'width': 1
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
            'accountNumber':account.accountNumber,
            'StartDate':startDate.format('M/D/Y'),
            'EndDate':endDate.format('M/D/Y'),
            'DataType':'Usage',
            'OPCO':account.company,
            'intervalBehavior':'Automatic',
            'width': 1
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

            /* Pulling data from data series */
            if(costData.series != null){
              costData.series.forEach((series)=>{
                if(series.text == 'Regular Usage' || series.text == 'Weekend'){
                  costDataArray = costDataArray.concat(series.values);
                }
              });
            }
            if(usageData.series != null){
              usageData.series.forEach((series)=>{
                if(series.text == 'Regular Usage' || series.text == 'Weekend'){
                  usageDataArray = usageDataArray.concat(series.values);
                }
              });
            }

            /* Sorting Data Array on dates */
            const normalSort = (a,b)=>{ if(a[0] > b[0]) return 1; if(a[0] < b[0]) return -1; if(a[0] == b[0]) return 0; };
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
