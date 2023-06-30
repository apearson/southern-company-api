/* Libraries */
import {SouthernCompanyAPI, SouthernCompanyConfig} from '../src/main';

/* Config */
const config: SouthernCompanyConfig = {
	username: process.env.username as string,
	password: process.env.password as string
};

/* Connecting to API */
let API: SouthernCompanyAPI;

/* Setting up API */
beforeAll(() => {
	API = new SouthernCompanyAPI(config);
});

/* Tests */
test('grabs a list of accounts', async ()=>{
	const accounts = await API.getAccounts();

	if(!(accounts instanceof Array)){
		throw new Error('Returned a none array');
	}
	else if(accounts.length === 0){
		throw new Error('Returned an empty array');
	}
	else{
		return;
	}
});