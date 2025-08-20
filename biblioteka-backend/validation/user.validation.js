import Joi from "joi";

export const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid("user","admin").optional(),
  favorites: Joi.array().items(Joi.string()).default([])
}).min(1);
