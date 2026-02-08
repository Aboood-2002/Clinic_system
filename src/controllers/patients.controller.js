import prisma from '../prismaClient.js';
import asyncHandler from 'express-async-handler'

// CREATE
export const createPatient = asyncHandler(async (req, res) => {
  const {
    name,
    age: rawAge,
    gender,
    phone,
    address,
    email,
    bloodType,
    nationalID,
  } = req.body;

  // Parse age safely
  const age = rawAge != null 
    ? (typeof rawAge === 'string' ? parseInt(rawAge, 10) : rawAge)
    : null;

  if (age !== null && (isNaN(age)  age < 0  age > 120)) {
    return res.status(400).json({ error: 'Invalid age value' });
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        name,
        age,                  
        gender,
        phone,
        address,
        email,
        bloodType,
        nationalID,
      },
    });

    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ ALL with pagination
export const getPatients = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.patient.count(),
  ]);

  res.json({
    data: patients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
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
