/* Importing config */
const config = {
  username: process.env.username,
  password: process.env.password,
  startDate: process.env.startDate,
  endDate: process.env.endDate
};


/* Importing Class */
const SoCo = require('./../main.js');

/* Initializing Class */
const SouthernCompany = new SoCo();

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
});

// /* Importing Class */
// const SoCo = require('./main.js');

// /* Initializing Class */
// const AlabamaPower = new SoCo(config);

// /* Staring Login timer */
// console.time('Connected!');
// console.time('Monthly Data');
// console.time('Daily Data');

// /* Listening for events */
// AlabamaPower.on('error', console.error);
// AlabamaPower.on('connected', ()=>{
//   console.timeEnd('Connected!');
//   console.info('RequestVerificationToken:', AlabamaPower.RequestVerificationToken, '\n');
//   console.info('ScWebToken:', AlabamaPower.ScWebToken, '\n');
//   console.info('ScJwtToken:', AlabamaPower.ScJwtToken, '\n');
//   console.info('Accounts:', AlabamaPower.accounts, '\n');

//   /* Getting Monthly Data */
//   AlabamaPower.getMonthlyData().catch(console.error)
//     .then((data)=>{
//       console.timeEnd('Monthly Data');
//       console.info(JSON.stringify(data));
//     });

//   /* Getting Daily Data */
//   AlabamaPower.getDailyData(config.startDate, config.endDate)
//     .then((data)=>{
//       console.timeEnd('Daily Data');
//       console.info(JSON.stringify(data));
//     })
//     .catch((error)=>{
//       console.error(`Alabama Power Error: ${error}`);
//     });
// });

// AlabamaPower.on('reconnected', ()=>{
//   console.log('Reconnected!');
// })
