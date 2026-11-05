import Type, { type Static } from "typebox";

export const AddBanBodySchema = Type.Object({
    flags: Type.Optional(Type.Integer()),
    expires: Type.Optional(Type.Integer()),
    reason: Type.Optional(Type.String()),
    public_reason: Type.Optional(Type.String()),
})

export const EditBanBodySchema = Type.Object({
    flags: Type.Optional(Type.Integer()),
    expires: Type.Optional(Type.Integer()),
    reason: Type.Optional(Type.String()),
    public_reason: Type.Optional(Type.String()),
    
    executor: Type.Optional(Type.String()),
})

export type APIAddBanRequest = Static<typeof AddBanBodySchema>;
export type APIEditBanRequest = Static<typeof EditBanBodySchema>;
