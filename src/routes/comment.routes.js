import { Router } from "express";
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all the routes in this file

router.route("/video-id"),get(getVideoComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).post(updateComment);

export default router;