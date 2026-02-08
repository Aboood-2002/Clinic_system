import prisma from '../prismaClient.js';
import asyncHandler from 'express-async-handler'
import { io } from '../socket/socket.js';


export const addToQueue = asyncHandler(async (req, res) => {
  const { patientId, reason, priority = 'normal', visitType = 'examination' } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  const validPriorities = ['normal', 'high', 'urgent'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }

  const validVisitTypes = ['consultation', 'examination'];
  if (!validVisitTypes.includes(visitType)) {
    return res.status(400).json({ error: 'Invalid visitType' });
  }

  try {
    const maxPosition = await prisma.queue.aggregate({
      where: { status: { in: ['waiting', 'in_progress'] } },
      _max: { position: true },
    });
    const position = (maxPosition._max.position || 0) + 1;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create queue entry
      const queueEntry = await tx.queue.create({
        data: {
          patientId,
          position,
          reason: reason || null,
          priority,
          status: 'waiting',
        },
        include: {
          patient: { select: { name: true, phone: true, nationalID: true, age: true, gender: true } },
        },
      });

      // 2. Auto-create pending visit
      const visit = await tx.visit.create({
        data: {
          patientId,
          doctorUsername: "Dr. Ahmed Hassan",
          status: 'pending',
          chiefComplaint: reason || null,
          visitType,
        },
      });

      // 3. Auto-create empty prescription for this visit (0 medications)
      const prescription = await tx.prescription.create({
        data: {
          visitId: visit.id,
          additionalNotes: null,  // Empty
        },
      });

      return { queueEntry, visit, prescription };
    });

    res.status(201).json({
      message: 'Patient added to queue, visit and empty prescription created',
      queue: result.queueEntry,
      visit: result.visit,
      prescription: result.prescription,
    });
    io.emit('queueUpdated');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add to queue' });
  }
});


export const getAllQueues = asyncHandler(async (req, res) => {
  try {
    const queue = await prisma.queue.findMany({
      where: { status: { in: ['waiting', 'in_progress'] } },
      include: {
        patient: { select: { name: true, phone: true, age: true, gender: true } },
      },
      orderBy: [
        { priority: 'desc' },  // urgent > high > normal
        { position: 'asc' },
      ],
    });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// START VISIT
export const updateStartQueue = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await prisma.queue.update({
      where: { id: parseInt(id) },
      data: { status: 'in_progress' },
      include: { patient: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// COMPLETE VISIT
export const updateCompleteQueue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const queueId = parseInt(id);

  if (isNaN(queueId)) {
    return res.status(400).json({ error: 'Invalid queue ID' });
  }

  try {
    // Use a transaction to update both queue and visit atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update queue status to 'completed'
      const updatedQueue = await tx.queue.update({
        where: { id: queueId },
        data: { status: 'completed' },
        include: { patient: { select: { id: true, name: true } } },
      });

      // 2. Find the associated pending visit for this patient
      // (Most recent pending visit — safe for one-doctor clinic)
      const pendingVisit = await tx.visit.findFirst({
        where: {
          patientId: updatedQueue.patientId,
          status: 'pending',
        },
        orderBy: { visitDate: 'desc' },
      });

      let updatedVisit = null;

      // 3. If a pending visit exists → mark it as completed
      if (pendingVisit) {
        updatedVisit = await tx.visit.update({
          where: { id: pendingVisit.id },
          data: { status: 'completed' },
          include: {
            patient: { select: { name: true } },
          },
        });
      }

      return { updatedQueue, updatedVisit };
    });

    res.json({
      message: 'Queue and visit completed successfully',
      queue: result.updatedQueue,
      visit: result.updatedVisit || null, // null if no pending visit found
    });
  } catch (error) {
    console.error('Complete queue error:', error);
    res.status(500).json({ error: 'Failed to complete queue and visit' });
  }
});



export const deleteFromQueue = asyncHandler(async (req, res) => {
  const queueId = parseInt(req.params.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const queueEntry = await tx.queue.findUnique({
        where: { id: queueId },
        include: { patient: true },
      });

      if (!queueEntry) throw new Error('Queue entry not found');

      // 1. Delete queue entry
      await tx.queue.delete({ where: { id: queueId } });

      // 2. Find associated visit
      const visit = await tx.visit.findFirst({
        where: {
          patientId: queueEntry.patientId,
          status: { in: ['pending', 'in_progress'] },
        },
        orderBy: { visitDate: 'desc' },
      });

      if (visit) {
        // 3. Delete associated prescription
        await tx.prescription.deleteMany({
          where: { visitId: visit.id },
        });

        // 4. Update visit status to 'cancelled' (don't delete)
        const updatedVisit = await tx.visit.update({
          where: { id: visit.id },
          data: { status: 'cancelled' },
        });

        return updatedVisit;
      }

      return null;
    });

    res.json({
      message: 'Patient removed from queue, prescription deleted, and visit cancelled',
      cancelledVisit: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove from queue' });
  }
});
