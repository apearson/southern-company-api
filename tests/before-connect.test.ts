/* Libraries */
import {SouthernCompanyAPI, SouthernCompanyConfig} from '../src/main';

/* Config */
const config: SouthernCompanyConfig = {
	username: process.env.username,
	password: process.env.password
};

/* Tests */
test('fails fast to grab a list of accounts before login', async ()=>{
	/* Connecting to API */
	const API = new SouthernCompanyAPI(config);
	try{
		const accounts = await API.getAccounts();
		throw new Error('Got something from accounts before login');
	}
	catch(e){
		return;
	}
});