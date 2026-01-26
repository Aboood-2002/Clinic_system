import Joi from 'joi';

export const createPatientSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Name must be at least 3 characters',
    'any.required': 'Name is required',
  }),
  age: Joi.number().integer().min(0).max(120).optional(),
  gender: Joi.string().valid('Male', 'Female','male','female', 'Other').optional(),
  phone: Joi.string().pattern(/^01[0-9]{9}$/).required().messages({
    'string.pattern.base': 'Phone must be a valid Egyptian mobile number (01xxxxxxxxx)',
    'any.required': 'Phone is required',
  }),
  address: Joi.string().max(200).optional(),
  email: Joi.string().email().optional(),
  bloodType: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
  nationalID: Joi.string().pattern(/^[0-9]{14}$/).optional().messages({
    'string.pattern.base': 'National ID must be a 14-digit number',
  }),
});

export const updatePatientSchema = createPatientSchema.fork(
  ['name', 'phone'], // these become optional on update
  (schema) => schema.optional()
);