import express from "express";
import { getNearbyRides, acceptRide } from "../controllers/driverController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../lib/validate.js";
import { createRideSchema } from "../schemas/rideschemas.js";
import {
  createRide,
  arriveRide,
  startRide,
  completeRide,
  cancelRide,
  getRideById,
  updateOfferedFare,
} from "../controllers/rideController.js";
import {
  rideIdParamSchema,
  updateOfferedFareSchema,
} from "../schemas/rideschemas.js";
import { validateParams } from "../lib/validate.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireRole("rider"),
  validate(createRideSchema),
  createRide,
);
router.get("/nearby", requireAuth, requireRole("driver"), getNearbyRides);

router.get("/:id", requireAuth, validateParams(rideIdParamSchema), getRideById);

router.patch(
  "/:id/offer",
  requireAuth,
  requireRole("rider"),
  validateParams(rideIdParamSchema),
  validate(updateOfferedFareSchema),
  updateOfferedFare,
);

router.patch("/:id/accept", requireAuth, requireRole("driver"), acceptRide);

router.patch(
  "/:id/arrive",
  requireAuth,
  requireRole("driver"),
  validateParams(rideIdParamSchema),
  arriveRide,
);
router.patch(
  "/:id/start",
  requireAuth,
  requireRole("driver"),
  validateParams(rideIdParamSchema),
  startRide,
);
router.patch(
  "/:id/complete",
  requireAuth,
  requireRole("driver"),
  validateParams(rideIdParamSchema),
  completeRide,
);
router.patch(
  "/:id/cancel",
  requireAuth,
  validateParams(rideIdParamSchema),
  cancelRide,
);

export default router;
