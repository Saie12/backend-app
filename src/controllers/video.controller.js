import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Like } from "../models/like.model.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    page = isNaN(page) ? 1 : Number(page);
    limit = isNaN(limit) ? 10 : Number(limit);

    if (page < 0) {
        page = 1
    };

    if (page <= 0) {
        limit = 10
    };

    const matchStage = {};

    if (userId && isValidObjectId(userId)) {
        matchStage["$match"] = {
            owner: new mongoose.Types.ObjectId(userId),
        };
    } else if (query) {
        matchStage["$match"] = {
            $or: [
                {
                    title: {
                        $regex: query,
                        $options: "i"
                    },
                },
                {
                    description: {
                        $regex: query,
                        $options: "i",
                    },
                },
            ],
        };
    } else {
        matchStage["$match"] = {};
    };

    if (User && query) {
        matchStage["$match"] = {
            $and: [
                {
                    owner: new mongoose.Types.ObjectId(userId)
                },
                {
                    $or: [
                        {
                            title: {
                                $regex: query,
                                $options: "i"
                            },
                        },
                        {
                            description: {
                                $regex: query,
                                $options: "i",
                            },
                        },
                    ],
                },
            ],
        };
    };

    const sortStage = {};

    if (sortBy && sortType) {
        sortStage["$sort"] = {
            [sortBy]: sortType === "asc" ? 1 : -1,
        };
    } else {
        sortStage["$sort"] = {
            createdAt: -1,
        };
    };

    const skipStage = { $skip: (page - 1) * limit};

    const limitStage = { $limit: limit};

    const videos = await Video.aggregate([
        matchStage,
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        sortStage,
        {
            $skip: (page - 1) * limit,
        },
        {
            $limit: limit,
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                },
                likes: {
                    $size: "$likes",
                },
            },
        },
    ]);

    if (!videos) {
        throw new ApiError(404, "No Videos found")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "Video fetched Successfully",
        )
    )
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if (!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title or Description is required")
    };

    const thumbnailLocalPath = req.files?.thumbnail[0].path;

    const videoFileLocalPath = req.files?.videoFile[0].path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required")
    };

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required")
    };

    const responseThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    const responseVideofile = await uploadOnCloudinary(videoFileLocalPath);

    if (!responseThumbnail && !responseVideofile) {
        throw new ApiError(500, "Something went wrong")
    };

    const video = await Video.create({
        title: title,
        description,
        videoFile: responseVideofile.url,
        thumbnail: responseThumbnail.url,
        duration: responseVideofile.duration,
        owner: new mongoose.Types.ObjectId(req.user?._id),
    });

    const newVideo = await Video.findById(video._id).select("-owner");

    if (!newVideo) {
        throw new ApiError(500, "Something went wrong when Publishing Video")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(200, newVideo, "Video Published Successfully")
    )
});


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if (!videoId.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Video Id required or Invalid")
    };

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found")
    };

    video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner",
                },
                likes: {
                    $size: "$likes",
                },
            },
        },
        {
            $addFields: {
                views: {
                    $add: [1, "$views"],
                },
            },
        },
    ]);

    if (video.length !== 0) {
        video = video[0];
    };

    await Video.findByIdAndDelete(videoId, {
        $set: {
            views: video.views,
        },
    });

    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Video get Successfully")
    );
});


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body;

    if (!videoId.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Video Id is required or Invalid")
    };

    if (!title && !description) {
        throw new ApiError(400, "All fields are required")
    };

    const videoC = await Video.findById(videoId);

    if (!videoC) {
        throw new ApiError(404, "Video not found")
    };

    if (videoC.owner.toString() !== (req.user?._id).toString()) {
        throw new ApiError(401, "Unauthorised User")
    };

    const thumbnailLocalFilePath = req.file?.path;

    if (thumbnailLocalFilePath) {
        var response = await uploadOnCloudinary(thumbnailLocalFilePath);
        console.log(response);

        if (!response.url) {
            throw new ApiError(500, "Error while Uploading in Cloudinary")
        };
    };

    const video = await Video.findById(videoId);

    const updatedVideo = await Video.findByIdAndDelete(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: response?.url?response.url : video.thumbnail,
            },
        },
        {
            new: true,
        },
    );

    if (!updatedVideo) {
        throw new ApiError(500, "Error while Updating Video")
    };

    const publicId = getPublicId(video.thumbnail);

    const deleteres = response?.url ? await deleteOnCloudinary(publicId) : null;

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedVideo, "Update Video Successfully")
    );

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!videoId.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Video Id is required or Invalid")
    };

    const videoC = await Video.findById(videoId);

    if (!videoC) {
        throw new ApiError(404, "Video Not found")
    };

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    const thumbnailPublicId = getPublicId(deletedVideo.thumbnail);

    const videoPublicId = getPublicId(deletedVideo.videoFile);

    if (delResponse) {
        await Promise.all([
            Like.deleteMany({ video: _id }),
            Comment.deleteMany({ video: _id }),
            deleteOnCloudinary(videoPublicId, "video"),
            deleteOnCloudinary(thumbnailPublicId),
        ]);
    } else {
        throw new ApiError(500, "Something went wrong while Deleting Video")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(200, deletedVideo, "Deleted Successfully")
    );
});


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(404, "Video not found")
    };

    if (video.owner.toString() !== (req.user?._id).toString()) {
        throw new ApiError(401, "Unauthorised User")
    };

    video.isPublished = !(video.isPublished);

    await video.save();

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Toggle state of publish")
    );
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}