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
