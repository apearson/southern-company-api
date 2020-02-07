/* Libraries */
import {SouthernCompanyAPI, SouthernCompanyConfig} from '../src/main';

/* Config */
const config: SouthernCompanyConfig = {
	username: process.env.username as string,
	password: process.env.password as string
};

/* Tests */
test('emits a connected event when connected', ()=>{
	return new Promise((resolve, reject)=>{
		/* Connecting to API */
		let API = new SouthernCompanyAPI(config);

		/* On connected, cancel timeout, and resolve */
		API.on('connected', resolve);
	})
});