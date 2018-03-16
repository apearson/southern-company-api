/* Libraries */
import SouthernCompanyAPI from '../src/main';
import { start } from 'repl';

/* Config */
const config = require('../config.json');

/* Creating new API */
const API = new SouthernCompanyAPI({
	username: config.username,
	password: config.password,
	account: config.account,
});

/* Events */
API.on('connected', async (accounts)=> {
	console.log('Connected!');

	console.log(accounts);

	try{
		// const monthlyData = await API.getMonthlyData();
		const startDate = new Date(2018, 2, 11);
		const endDate = new Date();

		const dailyData = await API.getDailyData(startDate, endDate);
		console.log(dailyData);
	}
	catch(e){
		console.error(e);
	}
});