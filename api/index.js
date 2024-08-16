require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = 8000;
const fs = require('fs');
const fileUpload = require("express-fileupload");

let UploadCount = 0;
const corsOptions = {

    origin: "https://google-photo-app.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow these methods
    allowedHeaders: ["Content-Type"]
}
app.use(cors(corsOptions));
app.use(fileUpload());


const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID = process.env.CLIENT_ID,
    CLIENT_SECRET = process.env.CLIENT_SECRET,
    CALLBACK_URL = process.env.CALLBACK_URL
);
let access_token = "";

app.get('/Authenticate', (req, res) => {
    const scope = ["https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata", "https://www.googleapis.com/auth/photoslibrary.appendonly"];
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Request refresh token
        scope
    });

    return res.send(authUrl);
});

app.get("/callback", async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.status(400).send("Authorization code not found.");
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log("Tokens:", tokens);
        access_token = tokens.access_token;
        oauth2Client.setCredentials(tokens);
        return res.redirect("https://google-photo-app.vercel.app")

    } catch (error) {
        console.error("Error exchanging code for tokens:", error.message);
        return res.status(500).send("Error retrieving tokens.");
    }
});

app.get('/GetData', async (req, res) => {
    try {

        const response = await axios({
            url: "https://photoslibrary.googleapis.com/v1/mediaItems",
            method: "get",
            headers: {
                Authorization: `Bearer ${access_token}` // Send token in the Authorization header
            }
        });
        if (response.data) {
           return res.status(200).send(response.data);
        }

    } catch (error) {
        console.error(error);
    }

});

app.get('/GetAccessToken', async (req, res) => {
    try {

      if(!access_token){
        return res.status(404).send("User Not Authenticated")
      } 
      return res.status(200).send("User Authenticated");

    } catch (error) {
        console.error(error);
    }

});

const getUploadToken = async (myimage) => {
    try {
      
        const mimeType = myimage.mimetype;

        console.log(myimage);

        const response = await axios({
            url: "https://photoslibrary.googleapis.com/v1/uploads",
            method: "post",
            data: myimage.data,
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/octet-stream',
                'X-Goog-Upload-File-Name': myimage.name,
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-Content-Type': mimeType, // Send token in the Authorization header
            }
        });
        if (response.data) {
            return response.data;
        }
    } catch (error) {
        console.error(error);
    }
};

// const CreateAlbum = async () => {
//     try {

//         const response = await axios({
//             url: "https://photoslibrary.googleapis.com/v1/albums",
//             method: "post",
//             data: {
//                 album: {
//                     title: "My Google Api Album",
//                     isWriteable: true
//                 }
//             },
//             headers: {
//                 Authorization: `Bearer ${access_token}` // Send token in the Authorization header
//             }
//         });
//         if (response.data) {
//             console.log(response.data);
//             console.log(access_token);
//             Album_id = response.data.id;

//             return;
//         }
//     } catch (error) {
//         console.error(error);
//     }
// }

app.post('/UploadImage', async (req, res) => {
    try {
        
        const myimage = req.files.UploadImage;
        const uploadToken = await getUploadToken(myimage);
        const response = await axios({
            url: "https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate",
            method: "post",
            data: {
                newMediaItems: [
                    {
                        description: 'Uploaded via API',
                        simpleMediaItem: {
                            uploadToken: uploadToken,
                        }
                    }
                ]
            },
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json'// Send token in the Authorization header
            }
        });
        if (response.data) {
            console.log(response.data);
            return res.send(response.data);
        }

    } catch (error) {
        console.error(error);
    }

});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
