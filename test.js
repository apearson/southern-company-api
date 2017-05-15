/* Importing config */
const config = require('./config.json');

/* Importing Class */
const SoCo = require('./main.js');

/* Initializing Class */
const AlabamaPower = new SoCo(config);

/* Staring Login timer */
console.time('Logged In');

/* Listening for events */
AlabamaPower.on('error', console.error);
AlabamaPower.on('login', ()=>{
  console.timeEnd('Logged In');
  console.info('RequestVerificationToken:', AlabamaPower.RequestVerificationToken, '\n');
  console.info('ScWebToken:', AlabamaPower.ScWebToken, '\n');
  console.info('ScJwtToken:', AlabamaPower.ScJwtToken, '\n');
  console.info('Accounts:', AlabamaPower.accounts, '\n');

  /* Getting Monthly Data */
  AlabamaPower.getMonthlyData().catch(console.error)
    .then((data)=>{
      console.info('Monthly Data');
      console.info(JSON.stringify(data));
      console.info();
    });

  /* Getting Daily Data */
  AlabamaPower.getDailyData(config.startDate, config.endDate).catch(console.error)
    .then((data)=>{
      console.info('Daily Data');
      console.info(JSON.stringify(data));
      console.info();
    });
});
