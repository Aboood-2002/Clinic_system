import express from 'express';


import { createPrescription,getAllPrescriptions,getPrescription,updatePrescription,deletePrescription } from '../controllers/prescriptions.controller.js';

import  { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();


router.post('/',authenticate, authorize(['doctor','admin']),createPrescription)

router.get('/', authenticate,getAllPrescriptions);

// Get full prescription (for editing/printing)
router.get('/:id', authenticate, getPrescription);

// Update prescription
router.put('/:id', authenticate,authorize(['doctor','admin']),updatePrescription);

// Delete prescription
router.delete('/:id', authenticate,authorize(['doctor','admin']),deletePrescription);



export default router


