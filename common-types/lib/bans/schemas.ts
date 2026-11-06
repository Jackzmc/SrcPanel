import Type, { type Static } from "typebox";

export const AddBanBodySchema = Type.Object({
    flags: Type.Integer({ default: 0 }),
    expires: Type.Optional(Type.Integer()),
    reason: Type.String(),
    public_reason: Type.Optional(Type.String()),
})

export const EditBanBodySchema = Type.Object({
    flags: Type.Integer({ default: 0 }),
    expires: Type.Optional(Type.Integer()),
    reason: Type.String(),
    public_reason: Type.Optional(Type.String()),
    /** If not set, will keep previous */
    executor: Type.Optional(Type.String()),
})

export const CreateBanAppealQuerySchema = Type.Object({
    message: Type.String({ minLength: 10 })
})

export type APIAddBanRequest = Static<typeof AddBanBodySchema>;
export type APIEditBanRequest = Static<typeof EditBanBodySchema>;

export type APICreateAppealQuery = Static<typeof CreateBanAppealQuerySchema>