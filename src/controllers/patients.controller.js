import prisma from '../prismaClient.js';
import asyncHandler from 'express-async-handler'
import { paginate } from '../utils/pagination.js'

// CREATE
export const createPatient = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.create({
    data: req.body
  });
  res.json(patient);
});

// READ ALL
export const getPatients = asyncHandler(async (req, res) => {
const patients = await paginate(prisma.patient, {
    orderBy: { createdAt: 'desc' },
  }, req);

  res.json(patients);
});

// READ ONE
export const getPatientById = asyncHandler(async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { visits: true, queues: true },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE
export const updatePatient = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.update({
    where: { id: Number(req.params.id) },
    data: req.body
  });
  res.json(patient);
});

// DELETE
export const deletePatient = asyncHandler(async (req, res) => {
  await prisma.patient.delete({
    where: { id: Number(req.params.id) }
  });
  res.json({ message: 'Patient deleted' });
});
