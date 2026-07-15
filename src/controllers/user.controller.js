import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import {User} from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary..js"
import apiResponse from "../utils/apiResponse.js"

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

        const {fullName, email, username, password} = req.body;
        console.log("email: ", email);

        if(
            [fullName, email, username, password].some((field) => field?.trim() === "")
        ) {
            throw new apiError(400, "All fields are required");
        }

        // if(fullName === "")
        // {
        //     throw new apiError(400, "fullname required");
        // }

        const existedUser = User.findOne({
            $or: [{username}, {email}]
        });

        if(existedUser) {
            throw apiError(409, "User already exists");
        }

        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImageLocalPath = req.files?.coverIMage[0]?.path;

        if(!avatarLocalPath){
            throw new apiError(400, "Avatar required");
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if(!avatar){
            throw new apiError(400, "Avatar is required");
        }

        const user = await User.create({
            fullName, avatar: avatar.url, coverImage: coverImage?.url || "", email, 
            password, username.toLowerCase()
        });

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );

        if(!createdUser) {
            throw new apiError(500, "Something went wrong while registering user");
        }

        return res.status(201).json(
            new apiResponse(200, createdUser, "User registered successfully");
        )

    });

export {registerUser};