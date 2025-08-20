import Joi from "joi";

export const bookCreateSchema = Joi.object({
  title: Joi.string().min(1).required(),
  author: Joi.string().min(1).required(),
  year: Joi.string().optional(),
  image: Joi.string().uri().allow(null, "").optional(),
  description: Joi.string().allow(null, "").optional()
});

export const bookUpdateSchema = Joi.object({
  title: Joi.string().min(1).optional(),
  author: Joi.string().min(1).optional(),
  year: Joi.string().optional(),
  image: Joi.string().uri().allow(null, "").optional(),
  description: Joi.string().allow(null, "").optional(),
  rentedBy: Joi.string().allow(null).optional()
}).min(1);
