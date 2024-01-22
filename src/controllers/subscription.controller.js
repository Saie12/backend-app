import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if (!channelId.trim() || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Channel Id is required or Invalid")
    };

    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel is not Found")
    };

    const isAlredySubscribed = await Subscription.find({
        subscriber: new mongoose.Types.ObjectId(req.user?._id),
        channel: new mongoose.Types.ObjectId(channelId),
    });

    if (isAlredySubscribed.length === 0) {
        const subscribedDoc = await Subscription.create({
            subscriber: new mongoose.Types.ObjectId(req.user?._id),
            channel: new mongoose.Types.ObjectId(channelId),
        });
        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "Subscription Added")
            )
    } else {
        const deletedDoc = await Subscription.findOneAndDelete(
            isAlredySubscribed._id
        );
        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "Removed Subscription")
            )
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId.trim() || !isValidObjectId(channelId)) {
        throw new ApiError(400, "Channel Id is required or Invalid")
    };

    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel is not Found")
    };

    const subscriber = await Subscription.aggregate([
        {
            $match: new mongoose.Types.ObjectId(channelId)
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",
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
            $addFields: {
                subscriber: {
                    $first: "$subscribers",
                },
            },
        },
        {
            $project: {
                subscribers: 1,
            },
        },
    ]);

    if (subscriber.length === 0) {
        throw new ApiError(404, "No Subscriber found")
    };

    return res
    .status(200)
    .json(
        new ApiResponse(200, subscriber, "Fetched Subscriber successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!subscriberId.trim() || !isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Subscriber Id is required or Invalid")
    };

    const subscriber = await User.findById(subscriberId);

    if (!subscriber) {
        throw new ApiError(404, "Subscriber not found")
    };

    const subscriptions = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannelLists",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                subscribedChannelLists: {
                    $first: "$subscribedChannelLists",
                },
            },
        },
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(200, { subscribedChannelLists: subscriptions[0]?.subscribedChannelLists || [] }, "Channel List fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}