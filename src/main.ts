/* Libraries */
import {EventEmitter} from 'events';
import fetch from 'node-fetch'

export default class SouthernCompanyAPI extends EventEmitter{
	constructor(){
		super();

		this.doStuff();
	}

	private async doStuff(){
		const res = await fetch('https://home.apearson.io/');

		const data = await res.text();

		console.log(data);
	}
}

new SouthernCompanyAPI();
