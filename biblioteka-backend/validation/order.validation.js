import Joi from "joi";

export const orderCreateSchema = Joi.object({
  bookId: Joi.string().required()
});

export const orderReturnSchema = Joi.object({
  returnedAt: Joi.date().optional()
});
