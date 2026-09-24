import User from "../models/User.js";
import Ride from "../models/Ride.js";
import { getRoute } from "../lib/osrm.js";

export const updateVehicleInfo = async (req, res) => {
  try {
    const { vehicleModel, vehicleNumber, vehicleColor } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { vehicleModel, vehicleNumber, vehicleColor },
      { new: true },
    );
    res.status(200).json({
      vehicleModel: user.vehicleModel,
      vehicleNumber: user.vehicleNumber,
      vehicleColor: user.vehicleColor,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateDriverStatus = async (req, res) => {
  try {
    const { isOnline, coordinates } = req.body;

    if (isOnline) {
      const driver = await User.findById(req.user.userId);
      if (
        !driver.vehicleModel ||
        !driver.vehicleNumber ||
        !driver.vehicleColor
      ) {
        return res.status(400).json({
          error: "Add your bike's model, number and color before going online",
        });
      }
    }

    const update = { isOnline };
    if (coordinates) {
      update.location = { type: "Point", coordinates };
    }

    const user = await User.findByIdAndUpdate(req.user.userId, update, {
      new: true,
    });
    res.status(200).json({ isOnline: user.isOnline, location: user.location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getNearbyRides = async (req, res) => {
  try {
    const driver = await User.findById(req.user.userId);
    if (!driver.location?.coordinates) {
      return res
        .status(400)
        .json({ error: "Location not set — go online first" });
    }

    const RADIUS_KM = 5;
    const rides = await Ride.find({
      status: "requested",
      pickup: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: driver.location.coordinates,
          },
          $maxDistance: RADIUS_KM * 1000, // meters
        },
      },
    }).limit(10);

    res.status(200).json({ rides });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const acceptRide = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await User.findById(req.user.userId);

    // Atomic: only updates if status is STILL "requested" at the exact moment of this query
    const ride = await Ride.findOneAndUpdate(
      { _id: id, status: "requested" },
      { status: "accepted", driverId: req.user.userId },
      { new: true },
    );

    if (!ride) {
      // Either the ride doesn't exist, or someone else already accepted it first
      return res
        .status(409)
        .json({ error: "This ride is no longer available" });
    }

    // Best-effort: never let a slow/down OSRM block the accept itself —
    // the driver still gets the ride, just without a route line yet.
    if (driver?.location?.coordinates) {
      try {
        const { polyline } = await getRoute(
          driver.location.coordinates,
          ride.pickup.coordinates,
        );
        ride.routeToPickup = polyline;
        await ride.save();
      } catch (routeErr) {
        console.error("Failed to compute routeToPickup:", routeErr.message);
      }
    }

    res.status(200).json({ ride });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
