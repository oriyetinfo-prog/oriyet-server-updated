import express from "express";
import { sendDetails } from "../Controller/sendDetails.controller.js";

const router = express.Router();

router.post("/send-details", sendDetails);

export default router;
