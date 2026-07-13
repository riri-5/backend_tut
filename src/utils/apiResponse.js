class apiResponse
{
    constructor(statusCode, data, message = "Success")
    {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }

    /* info response 100-199
       success response 200-299
       redirect response 300-399
       client error response 400-499
       server error response 500-599
       these are all server status codes
    */ 
}