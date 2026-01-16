import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { addToQueueSchema } from '../validations/queue.validation.js';

const router = express.Router();


import {addToQueue,getAllQueues,updateCompleteQueue,updateStartQueue,deleteFromQueue} from '../controllers/queues.controller.js'


router.post('/', authenticate, validate(addToQueueSchema), addToQueue);

router.get('/',authenticate,getAllQueues)

// START VISIT
router.patch('/:id/start', authenticate,updateStartQueue );

// COMPLETE VISIT
router.patch('/:id/complete', authenticate,updateCompleteQueue );


router.delete('/:id',authenticate,deleteFromQueue)




export default router