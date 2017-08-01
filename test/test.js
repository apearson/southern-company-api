/* Config */
const config = {
  username: process.env.username,
  password: process.env.password,
  startDate: process.env.startDate,
  endDate: process.env.endDate
};

/* Importing Class */
const SoCo = require('./../src/main.js');

/* Initializing Class */
let SouthernCompany = new SoCo();

/* Internal Functions */
describe('getRequestVerificationToken()', ()=>{
  it('should respond with a request verification token', async ()=>{
    /* Getting token from API */
    SouthernCompany.RequestVerificationToken = await SouthernCompany.getRequestVerificationToken();

    /* Testing to make sure some token exists */
    if(SouthernCompany.RequestVerificationToken.length === 0){
      throw new Error('ScWebToken does not exist');
    }
    else{
      return SouthernCompany.RequestVerificationToken;
    }
  });
});
describe('makeLoginRequest()', ()=>{
  it('should respond with a Southern Company web token', async ()=>{
    /* Getting token from API */
    SouthernCompany.ScWebToken = await SouthernCompany.makeLoginRequest(SouthernCompany.RequestVerificationToken, config.username, config.password);

    /* Testing to make sure some token exists */
    if(SouthernCompany.ScWebToken.length === 0){
      throw new Error('ScWebToken does not exist');
    }
    else{
      return SouthernCompany.ScWebToken;
    }
  });
});
describe('makeJwtRequest()', ()=>{
  it('should respond with a Southern Company JWT', async ()=>{
    /* Getting token from API */
    SouthernCompany.ScJwtToken = await SouthernCompany.makeJwtRequest(SouthernCompany.ScWebToken);

    /* Testing to make sure some token exists */
    if(SouthernCompany.ScJwtToken.length === 0){
      throw new Error('ScJwtToken does not exist');
    }
    else{
      return SouthernCompany.ScJwtToken;
    }
  });
});
describe('getAccounts()', ()=>{
  it('should respond with at least one Southern Company account', async ()=>{
    /* Getting account from API */
    SouthernCompany.accounts = await SouthernCompany.getAccounts();

    /* Testing to make sure some accounts exist */
    if(SouthernCompany.accounts.length === 0){
      throw new Error('No account were returned');
    }
    else{
      return SouthernCompany.accounts;
    }
  });
});

/* Testing login methods */
describe('login()', ()=>{
  it('should attempt a login and return available accounts', async ()=>{
    /* Setting up creds */
    SouthernCompanyLogin = new SoCo();
    SouthernCompanyLogin.config.username = config.username;
    SouthernCompanyLogin.config.password = config.password;

    /* Attempting login */
    const accounts = await SouthernCompanyLogin.login();

    /* Testing to make sure some accounts exist */
    if(accounts.length === 0){
      throw new Error('No account were returned');
    }
    else{
      return accounts;
    }

  });
});
describe('setupReconnect()', ()=>{
  it('should setting up a reconnect based on current login and return a timer', ()=>{
    /* Attempting to setup reconnect */
    let reconnectTimer = SouthernCompany.setupReconnect();

    /* Checking to make sure it returned a timer */
    if(reconnectTimer != null){
      return reconnectTimer;
    }
    else{
      throw new Error('No reconnect timer was returned');
    }
  });
});
describe('connect()', ()=>{
  it('should attempt a connection and emit a "connected" event', function(done){
    /* Setting up test */
    this.timeout(5000);
    
    /* Setting up creds */
    SouthernCompanyConnect = new SoCo();
    SouthernCompanyConnect.config.username = config.username;
    SouthernCompanyConnect.config.password = config.password;

    /* Attaching event listener and calling done */
    SouthernCompanyConnect.on('connected', ()=>{
      done();
    });

    /* Attempting login */
    SouthernCompanyConnect.connect();
  });
});

/* Testing Constructor */
describe('Constructor()', ()=>{
  it('should construct an object and emit a "connected" event when connected', function(done){
    /* Setting up test */
    this.timeout(5000);

    /* Setting up object with a config */
    SouthernCompanyConstructor = new SoCo(config);

    /* Attaching event listener and calling done */
    SouthernCompanyConstructor.on('connected', ()=>{
      done();
    });
  });
});

/* Data Methods */
describe('getMonthlyData()', ()=>{
  it('should respond with an array of account objects with a proptery of data that contains monthly data', async ()=>{
    /* Getting monthly data from from API */
    const data = await SouthernCompany.getMonthlyData();

    /* Testing to make sure some token exists */
    if(data.length > 0){
      if('name' in data[0] && 'accountNumber' in data[0] && 'data' in data[0]){
        return data;
      }
      else{
        throw new Error('Object returned is malformed');
      }
    }
    else{
      throw new Error('No account were returned');
    }
  });
});
describe('getDailyData()', ()=>{
  it('should respond with an array of days ', async ()=>{
    /* Getting monthly data from from API */
    const data = await SouthernCompany.getDailyData(config.startDate, config.endDate);

    /* Testing to make sure some token exists */
    if(data.length > 0){
      if('name' in data[0] && 'accountNumber' in data[0] && 'data' in data[0]){
        return data;
      }
      else{
        throw new Error('Object returned is malformed');
      }
    }
    else{
      throw new Error('No account were returned');
    }
  });

  it('should catch when the end date is before the start date', async ()=>{
    try{
      /* Getting monthly data from API using malformed dates */
      const data = await SouthernCompany.getDailyData(config.endDate, config.startDate);

      /* If data is returned correctly then test fails */
      throw new Error('Returned data with malformed dates');
    }
    catch(error){
      if(error == 'Invalid Dates'){
        return true;
      }
      else{
        throw error;
      }
    }
  });
});