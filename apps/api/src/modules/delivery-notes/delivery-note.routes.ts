import { Router } from "express";

import { asyncHandler } from "../../lib/http";

import {
  confirmDeliveryNote,
  createDeliveryNote,
  getDeliveryNoteTraceability,
  listDeliveryNotes,
} from "./delivery-note.service";

export const deliveryNoteRouter = Router();

deliveryNoteRouter.get(
  "/delivery-notes",
  asyncHandler(async (_req, res) => {
    const deliveryNotes = await listDeliveryNotes();
    res.json(deliveryNotes);
  }),
);

deliveryNoteRouter.post(
  "/delivery-notes",
  asyncHandler(async (req, res) => {
    const deliveryNote = await createDeliveryNote(req.body);
    res.status(201).json(deliveryNote);
  }),
);

deliveryNoteRouter.get(
  "/delivery-notes/:id/traceability",
  asyncHandler(async (req, res) => {
    const deliveryNoteId = String(req.params.id);
    const deliveryNote = await getDeliveryNoteTraceability(deliveryNoteId);
    res.json(deliveryNote);
  }),
);

deliveryNoteRouter.post(
  "/delivery-notes/:id/confirm",
  asyncHandler(async (req, res) => {
    const deliveryNoteId = String(req.params.id);
    const deliveryNote = await confirmDeliveryNote(deliveryNoteId, req.body);
    res.json(deliveryNote);
  }),
);
