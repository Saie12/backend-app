import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    //TODO: create playlist

    if (!name && !description) {
        throw new ApiError(400, "Name and Description are required")
    };

    const playlist = await Playlist.create({
        name,
        description,
        owner: new mongoose.Types.ObjectId(req.user?._id),
    });

    if (!playlist) {
        throw new ApiError(500, "Error while creating Playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "New Playlist created successfully")
    )
})


const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    //TODO: get user playlists

    if (!userId.trim() || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User Id")
    };

    const playlistCheck = await Playlist.find({
        owner: new mongoose.Types.ObjectId(userId),
    });

    if (!playlistCheck) {
        throw new ApiError(400, "Playlist not found")
    };

    const pipeline = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideo",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1,
                            videoFile: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                        },
                    },
                ],
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                playlistVideo: 1,
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ];

    const playlist = await Playlist.aggregate(pipeline);

    if (playlist.length === 0) {
        throw new ApiError(400, "Playlist not found")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    )
})


const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id
    const playlistAccess = await Playlist.findById(playlistId)

    if (playlistAccess.owner.toString() != (req.user?._id).toString()) {
        throw new ApiError(400, "Unauthorised User")
    };

    const pipeline = [
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideo",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1,
                            videoFile: 1,
                            title: 1,
                            description: 1,
                            views: 1,
                            duration: 1,
                        },
                    },
                ],
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                playlistVideo: 1,
            },
        },
    ];

    const playlist = await Playlist.aggregate(pipeline);

    if (playlist.length === 0) {
        throw new ApiError(404, "Playlist not found")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist fetched")
    )
})


const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!playlistId.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "PlaylistId is required or Invalid")
    };

    if (!videoId.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "VideoId is required or Invalid")
    };

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found")
    };

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    };

    if (playlist.owner.toString() != (req.user?._id).toString()) {
        throw new ApiError(400, "Unauthorised User")
    };

    if (playlist.videos.includes(new mongoose.Types.ObjectId(videoId))) {
        throw new ApiError(500, "Video already exists in Playlist")
    };

    const addVideoplaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push: {
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            new: true,
        }
    );

    if (!addVideoplaylist) {
        throw new ApiError(500, "cannot add a Video in Playlist")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(200, addVideoplaylist, "Video added successfully")
    );
})


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist

    if (!playlistId.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist Id is required or Invalid")
    };

    if (!videoId.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Video Id is required or Invalid")
    };

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found")
    };

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    };

    if (playlist.owner.toString() != (req.user?._id).toString()) {
        throw new ApiError(401, "Unauthorised User")
    };

    if (!playlist.videos.includes(videoId)) {
        throw new ApiError(400, "Video is not added to Playlist so you can't remove it")
    };

    const removeVideoplaylist = await Playlist.findByIdAndUpdate(
        playlist,
        {
            $pull: {
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            new: true,
        }
    );

    if (!removeVideoplaylist) {
        throw new ApiError(500, "Cannot add a video in Playlist")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(200, removeVideoplaylist, "Video removed successfully")
    );
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist

    if (!playlistId.trim() || isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist Id is required or Invalid")
    };

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    };

    if (playlist.owner.toString() != (req.user?._id)) {
        throw new ApiError(401, "Unauthorised User")
    };

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Playlist deleted successfully")
    );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    if (!playlistId.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Playlist Id is required or Invalid")
    };

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    };

    if (playlist.owner.toString() != (req.user?._id)) {
        throw new ApiError(401, "Unauthorised User")
    };

    if (!name && !description) {
        throw new ApiError(400, "Name and Description are required")
    };

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description,
            }
        },
        {
            new: true,
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "error while updating the Playlist")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedPlaylist, "Playlist Updated Successfully")
    );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};