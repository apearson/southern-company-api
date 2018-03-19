/* Libraries */
import SouthernCompanyAPI from '../src/main';

/* Config */
const config = require('../config.json');

test('emits a connected event when connected', ()=>{
	return new Promise((resolve, reject)=>{
		/* Connecting to API */
		let API = new SouthernCompanyAPI(config);

		/* On connected, cancel timeout, and resolve */
		API.on('connected', resolve);
	})
});