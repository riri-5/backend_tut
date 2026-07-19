import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => 
{
    try
    {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        user.accessToken = accessToken;

        return {accessToken, refreshToken};
    }

    catch(error)
    {
        //throw new apiError(500, "Something went wrong while generating access and refresh token");
        console.log(error);
        throw error;
    }
};

const registerUser = asyncHandler(async (req, res) => 
    {
        // get user details frm frontend
        // check validity - not empty
        // check if user alr exists: using email/username
        // check for images, check for avatar(req)
        // store in cloudinary, check: multer, cloudinary
        // create user obj: create entry in db (.create)
        // remove password n refresh token frm response
        // check response n if successful user creation
        // return res

        const {fullname, email, username, password} = req.body;
        // console.log(req.body);
        // console.log("email: ", email);

        if(
            [fullname, email, username, password].some((field) => field?.trim() === "")
        ) {
            throw new apiError(400, "All fields are required");
        }

        // if(fullName === "")
        // {
        //     throw new apiError(400, "fullname required");
        // }

        const existedUser = await User.findOne({
            $or: [{username}, {email}]
        });

        if(existedUser) {
            throw new apiError(409, "User already exists");
        }

        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

        if(!avatarLocalPath){
            throw new apiError(400, "Avatar required");
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if(!avatar){
            throw new apiError(400, "Avatar is required");
        }

        const user = await User.create({
            fullname, avatar: avatar.url, coverImage: coverImage?.url || "", email, 
            password, username: username.toLowerCase()
        });

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );

        if(!createdUser) {
            throw new apiError(500, "Something went wrong while registering user");
        }

        return res.status(201).json(
            new apiResponse(200, createdUser, "User registered successfully")
        )

    });

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // check if user alr exists - register first
    // password check
    // give new refresh token n access token
    // send cookie

    const {email, username, password} = req.body;
    console.log(email);
    
    if(!(username || email))
    {
        throw new apiError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    });

    if(!user)
    {
        throw new apiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid)
    {
        throw new apiError(401, "Password incorrect");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = 
    {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json
    (
        new apiResponse(200, 
        {
            user: loggedInUser, accessToken, refreshToken
        }, "User logged in successfully")
    )
});

const logoutUser = asyncHandler(async(req, res) => 
    {
        await User.findByIdAndUpdate(req.user._id, {
            $set: {refreshToken: undefined}
        },
        {
            new: true   //returns new updated response
        });
        
        const options = {
            httpOnly: true,
            secure: true
        };

        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "user logged out successfully"))
    });

const refreshAccessToken = asyncHandler(async (req, res) => 
    {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if(!incomingRefreshToken)
        {
            throw new apiError(401, "unauthorized request");
        }

        try {
            const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
            const user = await User.findById(decodedToken?._id);
    
            if(!user)
            {
                throw new apiError(401, "Invalid refresh token");
            }
            
            if(incomingRefreshToken !== user?.refreshToken)
            {
                throw new apiError(401, "Refresh token is used or expired");
            }
    
            const options = {
                httpOnly: true, 
                secure: true
            };
    
            const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
            return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new apiResponse(200, {accessToken, refreshToken: newRefreshToken}, "access token refreshed")
            );
        } catch (error) {
            throw new apiError(401, error?.message || "invalid refresh token");
        }

    });

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword, confPassword} = req.body;

    if(!(newPassword === confPassword))
    {
        throw new apiError(400, "new and confirm password must match");
    }

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPassowrdCorrect(oldPassword);

    if(!isPasswordCorrect)
    {
        throw new apiError(400, "invalid old password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});
    return res
    .status(200)
    .json(
        new apiResponse(200, {}, "password changed successfully")
    );
});

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully")
});

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body;

    if(!fullname || !email)
    {
        throw new apiError(400, "all fields are required");
    }

    const user = User.findByIdAndUpdate(req.user?._id, 
    {
        $set: {
            fullname, email: email
        }
    }, {new: true}).select("-password");

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "account details updated successfully")
    );
});

const updateAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath)
    {
        throw new apiError(400, "avatar file is misisng");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url)
    {
        throw new apiError(400, "error while uploading on cloudinary");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {avatar: avatar.url}
    }, {new: true}).select("-password");

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "avatar updated successfully")
    );
});

const updateCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath)
    {
        throw new apiError(400, "cover image is misisng");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url)
    {
        throw new apiError(400, "error while uploading on cloudinary");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set: {coverImage: coverImage.url}
    }, {new: true}).select("-password");

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "cover image updated successfully")
    );
});

export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, 
    getCurrentUser, updateAccountDetails, updateAvatar, updateCoverImage};