import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async () => {
    try
    {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log("\nMongoDB Connected Successfully ^^ DB Host : ", connectionInstance.connection.host, " DB Name : ", connectionInstance.connection.name, "\n");
    }

    catch(error)
    {
        console.log("MongoDB Connection Failed TT : ", error);
        process.exit(1);
    }
}

export default connectDB;
