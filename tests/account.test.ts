/* Libraries */
import {SouthernCompanyAPI} from '../src/main';

/* Config */
const config = {
	username: process.env.username,
	password: process.env.password
};

/* Connecting to API */
let API: SouthernCompanyAPI;

/* Setting up API */
beforeAll(() => {
	return new Promise((resolve, reject)=> {
		API = new SouthernCompanyAPI(config);
		API.on('connected', resolve);
	});
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