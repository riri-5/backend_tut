import {v2 as cloudinary} from "cloudinary";
import fs from "fs";    //file system

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => 
    {
        try
        {
            if(!localFilePath)  return null;

            //upload file on cloudinary
            const response = await cloudinary.uploader.upload(localFilePath, 
                {
                    resource_type: "auto"
                });
            
            //file has been uploaded successfully
            // console.log("File is uploaded on Cloudinary", response.url);

            fs.unlinkSync(localFilePath);
            return response;
        }

        catch(error)
        {
            fs.unlinkSync(localFilePath)    //removes locally saved temp file 
            //as the upload operation failed, we don't want mailicious/corrupted files on our server
            return null;
        }
    }

export default uploadOnCloudinary;

