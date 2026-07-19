import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import {User} from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import apiResponse from "../utils/apiResponse.js"

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

export {registerUser, loginUser, logoutUser};