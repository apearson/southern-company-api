/* Importing config */
const config = require('./config.json');

/* Importing Class */
const SoCo = require('./main.js');

/* Initializing Class */
const AlabamaPower = new SoCo(config);

/* Staring Login timer */
console.time('Connected!');
console.time('Monthly Data');
console.time('Daily Data');

/* Listening for events */
AlabamaPower.on('error', console.error);
AlabamaPower.on('connected', ()=>{
  console.timeEnd('Connected!');
  console.info('RequestVerificationToken:', AlabamaPower.RequestVerificationToken, '\n');
  console.info('ScWebToken:', AlabamaPower.ScWebToken, '\n');
  console.info('ScJwtToken:', AlabamaPower.ScJwtToken, '\n');
  console.info('Accounts:', AlabamaPower.accounts, '\n');

  /* Getting Monthly Data */
  AlabamaPower.getMonthlyData().catch(console.error)
    .then((data)=>{
      console.timeEnd('Monthly Data');
      console.info(JSON.stringify(data));
    });

  /* Getting Daily Data */
  AlabamaPower.getDailyData(config.startDate, config.endDate)
    .then((data)=>{
      console.timeEnd('Daily Data');
      console.info(JSON.stringify(data));
    })
    .catch((error)=>{
      console.error(`Alabama Power Error: ${error}`);
    });
});

AlabamaPower.on('reconnected', ()=>{
  console.log('Reconnected!');
})
