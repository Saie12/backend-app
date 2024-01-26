import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video

    if (!videoId.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id")
    };

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found")
    };

    const isLikedAllReady = await Like.find({
        video: videoId,
        likedBy: req.user?._id,
    });

    if (isLikedAllReady.length === 0) {
        const likeDoc = await Like.create({
            video: videoId,
            likedBy: req.user?._id,
        });
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Liked Video")
        );
    } else {
        const deleteDoc = await Like.findByIdAndDelete(isLikedAllReady[0]._id);
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Removed like from Video")
        );
    };
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    if (!commentId.trim() || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment Id")
    };

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    };

    const isLikedAllReady = await Like.find({
        comment: commentId,
        likedBy: req.user?._id,
    });

    if (isLikedAllReady.length === 0) {
        const likeDoc = await Like.create({
            comment: commentId,
            likedBy: req.user?._id,
        });
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Liked Comment")
        )
    } else {
        const deleteDoc = await Like.findByIdAndDelete(isLikedAllReady[0]._id);
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Removed like from Comment")
        );
    };
});



const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet

    if (!tweetId.trim() || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Tweet Id is required or Inavlid")
    };

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    };

    const isLikedAllReady = await Like.find({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    if (isLikedAllReady.length === 0) {
        const likeDoc = await Like.create({
            tweet: tweetId,
            likedBy: req.user?._id,
        });
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Liked Tweet")
        );
    } else {
        const deleteDoc = await Like.findByIdAndDelete(isLikedAllReady[0]._id);
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Removed Like from Tweet")
        );
    };
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const userId = new mongoose.Types.ObjectId(req.user?._id);

    const pipeline = [
        {
            $match: {
                video: {
                    $exists: true
                },
                likedBy: userId,
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            views: 1,
                            owner: 1,
                            videoFile: 1,
                            duration: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                video: {
                    $first: "$video",
                },
            }
        },
        {
            $project: {
                video: 1,
            },
        },
    ];

    const videos = await Like.aggregate(pipeline);

    if (videos.length === 0) {
        throw new ApiError(404, "No Liked Videos")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            { videos, videosCount: videos.length },
            "Liked Videos"
        )
    );

});



export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}