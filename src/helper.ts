import fetch from "node-fetch";
import {stringify} from "querystring";
import {LoginResponse} from "./interfaces/responses";

export class ApiHelper{
    constructor(){
        /* Request Verification Token */
        const loginToken = await this.getRequestVerificationToken();

        /* ScWebToken */
        const ScWebToken = await this.getScWebToken(loginToken, this.config.username, this.config.password);
        this.jwt = this.getJwt(ScWebToken)
    }

    public makeApiRequest = async (path: string) => {
        const url = "https://customerservice2api.southerncompany.com/api/MyPowerUsage" + path;

        const response = await fetch(url, {
            method: 'GET',
            headers: {'Content-Type': 'application/json; charset=UTF-8', Authorization: `bearer ${jwt}`}
        });
        if (response.status !== 200) {
            let body;
            try {
                body = await response.text()
            } catch (err) {
                console.error("failed to read response body");
            }
            throw new Error(`Failed to make API request [Code: ${response.status}: ${response.statusText}] ${url}: ${body}`);
        }
        return await response.json();
    }

    /* API methods */
    private async getRequestVerificationToken(){
        /* Grabbing login page */
        const response = await fetch('https://webauth.southernco.com/account/login');

        /* Checking for unsuccessful login */
        if(response.status !== 200){
            throw new Error(`Failed to get request verification token: ${response.statusText} ${await response.text()}`);
        }

        /* Converting login page response to text to search for token */
        const loginPage = await response.text();

        /* Regex to match token on page */
        const regex = /data-aft="(\S+)"/i;

        /* Matching page and finding token */
        let token: string;
        const matches = loginPage.match(regex);
        if(matches && matches.length > 1){
            token = matches[1];
        }
        else{
            throw new Error(`Could not find request verification token on login page`);
        }

        /* Returning request verification token */
        return token;
    }

    private async getScWebToken(requestVerificationToken: string, username: string, password: string){
        /* Checking if there is a valid config */
        if(!this.config)
            throw new Error(`Failed to get ScWebToken: Need a valid config`);

        /* Grab a ScWebToken by log in */
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'RequestVerificationToken': requestVerificationToken,
            },
            body: JSON.stringify({
                username, password, targetPage: 1, params: {ReturnUrl: "null"}} )
        };

        const response = await fetch('https://webauth.southernco.com/api/login', options);

        /* Checking for unsuccessful login */
        if(response.status !== 200)
            throw new Error(`Failed to get ScWebToken: ${response.statusText} ${await response.text()} ${JSON.stringify(options)}`);

        /* Parsing response as JSON to match search response for token */
        const resData: LoginResponse = await response.json();

        /* Regex to match token in response */
        const matchRegex = /NAME='ScWebToken' value='(\S+\.\S+\.\S+)'/mi;

        /* Matching response's form to get ScWebToken */
        const data = matchRegex.exec(resData.data.html);
        const ScWebToken =  data != null ? data[1] : null;

        if(ScWebToken == undefined)
            throw new Error(`Could not find ScWebToken in response`)

        /* Returning ScWebToken */
        return ScWebToken;

    }

    private async getJwt(ScWebToken: string){
        /* Trading ScWebToken for Jwt */
        const swtoptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: stringify({"ScWebToken":ScWebToken})
        };
        const swtresponse = await fetch('https://customerservice2.southerncompany.com/Account/LoginComplete?ReturnUrl=null', swtoptions);

        /* Checking for unsuccessful login */
        if(swtresponse.status !== 200){
            const cook = swtresponse.headers.get('set-cookie');
            throw new Error(`Failed to get secondary ScWebToken: ${swtresponse.statusText} ${cook} ${JSON.stringify(swtoptions)}`);
        }
        /* Regex to parse JWT out of headers */
        const swtregex = /ScWebToken=(\S*);/i;

        /* Parsing response header to get token */
        let swtoken: string;
        let swtcookies = swtresponse.headers.get('set-cookie');
        if(swtcookies){
            const swtmatches = swtcookies.match(swtregex);

            /* Checking for matches */
            if(swtmatches && swtmatches.length > 1){
                swtoken = swtmatches[1];
            }
            else{
                throw new Error(`Failed to get secondary ScWebToken: Could not find any token matches in headers`);
            }
        }
        else{
            throw new Error(`Failed to get secondary ScWebToken: No Cookies were sent back`);
        }
        // Now fetch JWT after secondary ScWebToken
        const options = {
            headers:{
                Cookie: `ScWebToken=${swtoken}`
            }
        };
        const response = await fetch('https://customerservice2.southerncompany.com/Account/LoginValidated/JwtToken', options);

        if(response.status !== 200){
            throw new Error(`Failed to get JWT: ${response.statusText} ${await response.text()} ${JSON.stringify(options)}`);
        }

        /* Regex to parse JWT out of headers */
        const regex = /ScJwtToken=(\S*);/i;

        /* Parsing response header to get token */
        let token: string;
        let cookies = response.headers.get('set-cookie');
        if(cookies){
            const matches = cookies.match(regex);

            /* Checking for matches */
            if(matches && matches.length > 1){
                token = matches[1];
            }
            else{
                throw new Error(`Failed to get JWT: Could not find any token matches in headers`);
            }
        }
        else{
            throw new Error(`Failed to get JWT: No Cookies were sent back`);
        }

        /* Returning JWT */
        return token;
    }

}