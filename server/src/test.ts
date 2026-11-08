import Type, { type Static } from "typebox"
import Schema from 'typebox/schema'
 

const ConfigProvidersSchema = Type.Object({
  client_id: Type.String(),
  client_secret: Type.String(),
  token_url: Type.String(),
  revoke_url: Type.String(),
  user_url: Type.String(),
  authorize_url: Type.String(),
  avatar_url_format: Type.String()
})

const ConfigSchema = Type.Object({ 
  general: Type.Object({
    listen: Type.Object({
      host: Type.String({ default: '0.0.0.0', format: "hostname" }),
      port: Type.Integer({ exclusiveMinimum: 0, exclusiveMaximum: 65535, default: 8081 })
    }),
    public_url: Type.String({ format: "url" })
  }),
  links: Type.Optional(Type.Object({
    steamGroup: Type.Optional(Type.String()),
    discord: Type.Optional(Type.String()),
    fluxer: Type.Optional(Type.String()),
  })),
  /** Link to github.com/jackzmc/l4d2-stats-plugin website, without /api prefix.  */
  statsUrl: Type.Optional(Type.String()),
  notice: Type.Optional(Type.Object({
    enabled: Type.Boolean(),
    text: Type.String(),
    class: Type.Optional(Type.String())
  })),
  providers: Type.Record(Type.String(), ConfigProvidersSchema, { default: { } })
})

const test: Static<typeof ConfigSchema> = {
    general: {
        listen: {
            host: '0.0.0.0.0',
            port: 8081
        },
        public_url: 'http://localhost:8081'
    },
    providers: {}
}

const schema = Schema.Compile(ConfigSchema)


const validator = Schema.Compile(ConfigSchema)
console.log('check', validator.Check(test))
console.log('parse', validator.Parse(test))
console.log('errors', Schema.Errors(ConfigSchema, test))