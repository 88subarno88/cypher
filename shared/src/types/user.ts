//  returned by GET /users/search for each search result
export interface UserProfile{
    id:string;
    username:string;
}

// returned by GET /keys/:userId
export interface PublicKeyResponse{
     publicKeyB64:string;
}
