import JWT from 'jsonwebtoken'

// This is an async/await promise wrapper over the jsonwebtoken package which does callback style 
export default {
    verify(token: string, secretOrPublicKey: JWT.Secret, options?: JWT.VerifyOptions): Promise<JWT.Jwt> {
        return new Promise((resolve, reject) => {
            JWT.verify(token, secretOrPublicKey, options, (err: Error, data: JWT.Jwt) => {
                if(err) return reject(err)
                else return resolve(data)
            })
        })
    },
    sign(payload: string | object | Buffer, secretOrPrivateKey: JWT.Secret, options?: JWT.SignOptions): Promise<string> {
        return new Promise((resolve, reject) => {
            JWT.sign(payload, secretOrPrivateKey, options, (err: Error, data: string) => {
                if(err) return reject(err)
                else return resolve(data)
            })
        })
    }
}