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
API.on('connected', async ()=> {
	console.log('Connected!');

	// const accounts = await API.getAccounts();
	try{
		// const monthlyData = await API.getMonthlyData();
		const startDate = new Date();
		const endDate = new Date();

		startDate.setDate(startDate.getDate() - 7);

		const dailyDate = await API.getDailyData(startDate, endDate);
	}
	catch(e){
		console.error(e);
	}
});