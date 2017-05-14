# Southern Company API

## How Authentication Works
1. Login Page is loaded
  * Method: GET
  * URL: https://webauth.southernco.com/account/login
2. Grab the RequestVerificationToken from the login Page
  * RequestVerificationToken can be found at the bottom of the page in a script tag.  Inside the tag the RequestVerificationToken is assigned to webauth.aft
3. Login Request is initialed
  * Method: POST
  * URL: https://webauth.southernco.com/api/login
  * Headers:
    * RequestVerificationToken: RequestVerificationToken from last request
    * Content-Type: application/json
  * Body (JSON Object):
    * username: {username}
    * password: {password}
    * params:  
      * ReturnUrl: null
4. Grab the ScWebToken from the JSON response. Can be found in the response.data.html as a value on a hidden input with the name ScWebToken

5. This Southern Company Web Token can be traded in for a Southern Company JSON Web Token (ScJwtToken) that can be used with the API.
  * Method: GET
  * URL: https://customerservice2.southerncompany.com/Account/LogginValidated/JwtToken
  * Headers:
    * Cookie: ScWebToken={ScWebToken}
6. Grab the ScJwtToken from the response's cookies
  * Cookie's name is ScJwtToken and contains the ScJwtToken
  * This ScJwtToken can be used to authenticate all other API requests.
