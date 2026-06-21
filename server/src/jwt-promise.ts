import JWT from 'jsonwebtoken'

export interface Jwt<T extends JWT.JwtPayload> extends JWT.Jwt {
    payload: T
}

export const JsonWebTokenError = JWT.JsonWebTokenError

// This is an async/await promise wrapper over the jsonwebtoken package which does callback style 
export default {
    /// Verifies a token, returning payload T, erroring on invalid JWT, or incorrect secret
    verify<T extends JWT.JwtPayload>(token: string, secretOrPublicKey: JWT.Secret, options?: JWT.VerifyOptions): Promise<Jwt<T>> {
        return new Promise((resolve, reject) => {
            JWT.verify(token, secretOrPublicKey, {...options, complete: true }, (err, data) => {
                if(err) return reject(err)
                else return resolve(data as Jwt<T>)
            })
        })
    },
    /// Verifies a token, returning null if it fails validation
    async tryVerify<T extends JWT.JwtPayload>(token: string, secretOrPublicKey: JWT.Secret, options?: JWT.VerifyOptions): Promise<Jwt<T>|null> {
        try {
            return await this.verify(token, secretOrPublicKey, options)
        } catch (err) {
            return null
        }
    },
    sign<T extends object>(payload: T, secretOrPrivateKey: JWT.Secret, options: JWT.SignOptions = {}): Promise<string> {
        return new Promise((resolve, reject) => {
            JWT.sign(payload, secretOrPrivateKey, options, (err, data) => {
                if(err) return reject(err)
                else if(!data) return reject(new Error("Empty signature"))
                else return resolve(data)
            })
        })
    }
}