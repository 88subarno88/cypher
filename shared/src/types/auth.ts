// the client sends to POST /auth/register
export interface RegisterDTO{
    username:string;
    password:string;
    publicKeyB64:string;
}

// the client sends to POST /auth/login
export interface LoginDTO{
    username:string;
    password:string;
}

// data inside a JWT access token when decoded
export interface TokenPayload{
    userId:string;
    username:string;
    iat?:number;            //issued at time
    exp?:number;            //expired at time
}

// what the client sends to POST /auth/refresh
export interface RefreshRequest{
    refreshToken:string;
}


// what the server sends BACK after a successful login
export interface AuthResponse{
    accessToken:string;
    refreshToken:string;
    user:
    {id:string;
    username:string;
    }
}
