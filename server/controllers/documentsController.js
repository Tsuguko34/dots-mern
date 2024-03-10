import asyncHandler from 'express-async-handler'
import db from '../config/database.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid';
import generateOTP from '../utils/generateOTP.js'
import { otpEmailTemplate } from '../utils/otpEmailTemplate.js'
import mailer from '../utils/mailer.js'
import { promises as fs } from 'fs'
import path from 'path'
import formatTime from '../utils/formatTime.js'
import { urgentEmailTemplate } from '../utils/urgentEmailTemplate.js'



dotenv.config()

const uploadFiles = asyncHandler(async (req, res) => {
    const fileDetails = JSON.parse(req.body.file_Details);

    const queries = fileDetails.map((file) => {
        return new Promise((resolve, reject) => {
            const uniqueID = uuidv4()
            const q = "INSERT INTO document_files (`file_id`, `document_id`, `file_Name`, `file_Size`) VALUES (?)"

            const values = [
                uniqueID,
                req.query.document_id,
                file.file_Name,
                file.file_Size
            ]

            db.query(q, [values], (err, files) => {
                if (err) {
                    reject(err); // Reject the promise if there's an error
                }
                else {
                    resolve(files);
                }
            });
        });
    });

    try {
        const results = await Promise.all(queries);
        // At this point, all queries have completed successfully
        return res.status(200).json({ hasData: true, files: results });
    } catch (error) {
        console.log(error);
        // If any query fails, this block will be executed
        return res.status(400).json({ errorMessage: 'An error occurred while uploading the files.' });
    }
})

const getFiles = asyncHandler(async (req, res) => {
    const { document_id } = req.body

    const q = `SELECT * FROM document_files WHERE document_id = '${document_id}'`

    db.query(q, async(err, files) => {
        if (err) return res.status(400).json({errorMessage: 'Query Error'})

        if(files.length > 0){
            return res.status(200).json({ hasData: true, files: files })
        }
        else{
            const getInArchiveFiles = `SELECT * FROM archive_files WHERE archive_id = '${document_id}'`
            db.query(getInArchiveFiles, async(err, archiveFiles) => {
                if (err) return res.status(400).json({errorMessage: 'Query Error'})
                if(archiveFiles.length > 0){
                    return res.status(200).json({ hasData: true, files: archiveFiles })
                }
                else{
                    return res.status(200).json({ hasData: false })
                }
            })
        }
    })
})

const deleteFiles = asyncHandler(async (req, res) => {
    const fileDetails = JSON.parse(req.body.file_Details);
    const uploadPath = './document_Files';

    const deleteFile = fileDetails.map((file) => {
        if(file.file_id){
            return new Promise((resolve, reject) => {
                const q = "DELETE FROM document_files WHERE file_id = ?";
    
                const values = [
                    file.file_id,
                ];
    
                db.query(q, [values], (err, result) => {
                    if (err) {
                        reject(err); // Reject the promise if there's an error
                    } else {
                        const filename = `${file.document_id}-${file.file_Name}`
                        const filePath = path.join(uploadPath, filename);
                        fs.unlink(filePath).catch(err => {
                            console.error(`Error deleting file: ${filename}`, err);
                            throw err;
                        });
                        resolve(result); // Resolve the promise with the result of the deletion
                    }
                });
            });
        }
        else{
            return Promise.resolve()
        }
        
    });

    try {
        // Delete each file in the array and wait for all deletions to complete
        await Promise.all(deleteFile);
        return res.status(200).json({ success: true })
    } catch (error) {
        return res.status(400).json({errorMessage: 'An error occured while adding the document.'})
    }
})

const getDocuments = asyncHandler(async (req, res) => {
    const { documentType } = req.body
    let q = ''

    if(documentType === 'Communication' || documentType === 'Memorandum'){
        q = `SELECT * FROM documents WHERE document_Type = '${documentType}'`
    }
    else if(documentType === 'Other'){
        q = `SELECT * FROM documents WHERE document_Type NOT IN ('Communication', 'Memorandum')`
    }
    else if(documentType === 'Pending'){
        q = `SELECT * FROM documents WHERE status NOT IN ('Approved', 'Rejected')`
    }
    else if(documentType === 'History'){
        q = `SELECT * FROM documents WHERE status NOT IN ('Approved', 'Rejected')`
    }
    else if(documentType === 'All'){
        q = `SELECT * FROM documents`
    }
    else{
        q = `SELECT * FROM documents WHERE status = '${documentType}'`
    }

    db.query(q, async(err, documents) => {
        if (err) return res.status(400).json({errorMessage: 'Query Error'})

        if(documents.length > 0){
            return res.status(200).json({ hasData: true, documents: documents })
        }
        else{
            return res.status(200).json({ hasData: false })
        }
    })
})

const getDocument = asyncHandler(async (req, res) => {
    const { document_id } = req.body
    const q = `SELECT * FROM documents WHERE document_id = '${document_id}'`

    db.query(q, async(err, document) => {
        if (err) return res.status(400).json({errorMessage: 'Query Error'})

        if(document.length > 0){
            return res.status(200).json({ hasData: true, document: document })
        }
        else{
            const getInArchive = `SELECT * FROM archives WHERE archive_id = '${document_id}'`
            db.query(getInArchive, async(err, archives) => {
                if (err) return res.status(400).json({errorMessage: 'Query Error'})
                if(archives.length > 0){
                    return res.status(200).json({ hasData: true, document: archives })
                }
                else{
                    return res.status(200).json({ hasData: false })
                }
            })
        }
    })
})

const addDocument = asyncHandler(async (req, res) => {
    const { 
        document_id,
    } = req.body

    const io = req.app.locals.io

    const columns = Object.keys(req.body).join(', ');
    const values = Object.values(req.body).map(value => typeof value === 'string' ? `'${value}'` : value).join(', ');

    const q = `INSERT INTO documents (${columns}) VALUES (${values})`;

    db.query(q, async(err, document) => {
        if (err) return res.status(400).json({errorMessage: 'Query Error'})

        if(document){
            // sendUrgentEmail({ sender: '', date: '', time: '', receiver: '' })
            if(req.body.forward_To){
                const uniqueID = uuidv4()
                const notificationData = [
                    uniqueID,
                    req.body.forward_To,
                    document_id,
                    0,
                    'Forward',
                    `${req.body.document_Name} is forwarded to you.`,
                    new Date()
                ]

                const notificationQuery = "INSERT INTO notifications (`notification_id`, `user_id`, `document_id`, `isRead`, `notification_Type`, `notification_Text`, `date_Created`) VALUES (?)";

                db.query(notificationQuery, [notificationData],async(err, notification) => {
                    console.log(err);
                    if(err) return res.status(400).json({errorMessage: 'Query Error'})

                    if(notification){
                        io.emit('notifications', {user_id: req.body.forward_To, action: 'Add Document'})
                        return res.status(200).json({ hasData: true, document: document, document_id: document_id })
                    }
                })
            }
            else{
                return res.status(200).json({ hasData: true, document: document, document_id: document_id })
            }
        }
        else{
            return res.status(400).json({errorMessage: 'An error occured while adding the document.'})
        }
    })
})

const editDocument = asyncHandler(async (req, res) => {
    const { 
        document_id,
    } = req.body;

    // Update all fields in the request body
    const updates = Object.entries(req.body)
        .filter(([key, value]) => key !== 'document_id')
        .map(([key, value]) => `${key} = ${typeof value === 'string' ? `'${value}'` : value}`)
        .join(', ');

    const q = `UPDATE documents SET ${updates} WHERE document_id = '${document_id}'`;

    db.query(q, async (err, result) => {
        if (err) {
            console.log(err);
            return res.status(400).json({ errorMessage: 'Query Error' });
        } else if (result.affectedRows > 0) {
            return res.status(200).json({ hasData: true, document_id: document_id, message: 'Document updated successfully.' });
        } else {
            return res.status(400).json({ errorMessage: 'An error occurred while updating the document.' });
        }
    });
});

const forwardDocument = asyncHandler(async (req, res) => {
    const { 
        document_Name,
        document_id,
        comment,
        status,
        forward_To,
        forwarded_By,
        action,
        forwarded_Datetime,
        accepted_Rejected_Date,
        accepted_Rejected_By
    } = req.body;

    let user_ids = req.body['user_ids[]'];

    // Convert to array if user_ids is not already an array
    if (!Array.isArray(user_ids)) {
        user_ids = [user_ids];
    }
    console.log(req.body['user_ids[]']);

    const io = req.app.locals.io

    let q = ''
    let values = []

    if(action === 'Forward'){
        q = "UPDATE documents SET `forward_To` = ?, `comment` = ?, `forwarded_By` = ?, `forwarded_Datetime` = ?, `status` = ? WHERE document_id = ?";

        values = [
            forward_To,
            comment,
            forwarded_By,
            forwarded_Datetime,
            status
        ]
    }
    else{
        q = "UPDATE documents SET `forward_To` = ?, `comment` = ?, `forwarded_By` = ?, `forwarded_Datetime` = ?, `accepted_Rejected_Date` = ?, `accepted_Rejected_By` = ?, `status` = ? WHERE document_id = ?";

        values = [
            forward_To,
            comment,
            forwarded_By,
            forwarded_Datetime,
            accepted_Rejected_Date,
            accepted_Rejected_By,
            status
        ]
    }

    db.query(q, [...values, document_id], async (err, result) => {
        if (err) {
            console.log(err);
            return res.status(400).json({ errorMessage: 'Query Error' });
        } else if (result.affectedRows > 0) {
            const createNotifications = user_ids.map((user_id) => {
                return new Promise((resolve, reject) => {
                    const uniqueID = uuidv4()
                    const notificationData = [
                        uniqueID,
                        user_id,
                        document_id,
                        0,
                        'Forward',
                        `${document_Name} is ${action === 'Forward' ? 'Forwarded' : action}.`,
                        new Date()
                    ]
    
                    const notificationQuery = "INSERT INTO notifications (`notification_id`, `user_id`, `document_id`, `isRead`, `notification_Type`, `notification_Text`, `date_Created`) VALUES (?)";
    
                    db.query(notificationQuery, [notificationData],async(err, notification) => {
                        console.log(err);
                        if(err) return reject(err)
    
                        if(notification){
                            io.emit('notifications', {user_id: req.body.forward_To, action: 'Forward Document'})
                            return resolve(notification)
                        }
                    })
                })
            })

            try {
                const results = await Promise.all(createNotifications);
                // At this point, all queries have completed successfully
                return res.status(200).json({ hasData: true });
            } catch (error) {
                console.log(error);
                // If any query fails, this block will be executed
                return res.status(400).json({ errorMessage: 'An error occurred while uploading the files.' });
            }
        } else {
            return res.status(400).json({ errorMessage: 'An error occurred while updating the document.' });
        }
    });
});

const archiveDocument = asyncHandler(async (req, res) => {
    const { document_id } = req.body;
    const q = `SELECT * FROM documents WHERE document_id = '${document_id}'`;

    db.query(q, async (err, document) => {
        if (err) return res.status(400).json({ errorMessage: 'Query Error' });

        if (document.length > 0) {
            const dataToArchive = document[0];
            // Remove 'document_id' from the list of columns and replace it with 'archive_id'
            const columns = Object.keys(dataToArchive).filter(column => column !== 'document_id').join(', ');
            const values = Object.keys(dataToArchive)
                .filter(column => column !== 'document_id')
                .map(key => {
                    const value = dataToArchive[key];
                    if (value === null || value === undefined) {
                        return 'NULL';
                    } else if (typeof value === 'string') {
                        return value !== '' ? `'${value}'` : 'NULL';
                    } else {
                        return value;
                    }
            }).join(', ');

            // Insert 'archive_id' instead of 'document_id'
            const archiveQuery = `INSERT INTO archives (archive_id, ${columns}) VALUES ('${document_id}', ${values})`;

            db.query(archiveQuery, async (err, archive) => {
                if (err) {
                    return res.status(400).json({ errorMessage: 'Query Error' });
                }
                if (archive) {
                    const findFilesQuery = `SELECT * FROM document_files WHERE document_id = '${document_id}'`
                    db.query(findFilesQuery, async (err, files) => {
                        if (err) {
                            console.log(err);
                            return res.status(400).json({ errorMessage: 'Query Error' });
                        }
                        if(files){
                            const fileTransfer = files.map((file) => {
                                return new Promise((resolve, reject) => {
                                    const columns = Object.keys(file).filter(column => column !== 'document_id').join(', ');
                                    const values = Object.keys(file)
                                        .filter(column => column !== 'document_id')
                                        .map(key => {
                                            const value = file[key];
                                            if (value === null || value === undefined) {
                                                return 'NULL';
                                            } else if (typeof value === 'string') {
                                                return value !== '' ? `'${value}'` : 'NULL';
                                            } else {
                                                return value;
                                            }
                                    }).join(', ');

                                    // Insert 'archive_id' instead of 'document_id'
                                    const archiveFileQuery = `INSERT INTO archive_files (archive_id, ${columns}) VALUES ('${document_id}', ${values})`;
                                    db.query(archiveFileQuery, async (err, archiveFile) => {
                                        if(err){
                                            reject(err)
                                        }
                                        else{
                                            resolve(archiveFile)
                                        }
                                    })
                                })
                            })

                            try{
                                const results = await Promise.all(fileTransfer);
                                if(results){
                                    try{
                                        const deleted = await deleteFilesAfterArchive(document_id)
                                        if(deleted){
                                            return res.status(200).json({ message: 'Document and associated files deleted successfully' });
                                        }
                                        else{
                                            return res.status(400).json({ errorMessage: 'An error occured while removing the files and document.' });
                                        }
                                    }
                                    catch(e){
                                        return res.status(400).json({ errorMessage: 'An error occured while removing the files and document.' });
                                    }
                                }  
                            }
                            catch(e){
                                console.log(e);
                                return res.status(400).json({ errorMessage: 'An error occurred while archiving the document files.' });
                            }
                        }
                        else{
                            return res.status(400).json({ errorMessage: 'An error occurred while archiving the document files.' });
                        }

                    })
                } else {
                    return res.status(400).json({ errorMessage: 'An error occurred while archiving the document.' });
                }
            });
        } else {
            return res.status(400).json({ hasData: false });
        }
    });
});

const deleteFilesAfterArchive = async (document_id) => {
    return new Promise((resolve, reject) => {
        // Delete documents from the documents table
        const deleteDocumentsQuery = `DELETE FROM documents WHERE document_id = ?`;

        db.query(deleteDocumentsQuery, [document_id], async (err, result) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(true);
        });
    });
};



// const sendUrgentEmail = async(props) => {
//     const sender = props.sender
//     const date = new Date(props.date).toLocaleDateString('en-us', {year: 'numeric', month: 'long', day: 'numeric'})
//     const time = formatTime(props.time)


//     var receiver = props.receiver
//     var subject = 'Urgent Document'
//     var body = urgentEmailTemplate(sender, date, time)

//     await mailer({ receiver, subject, body })
//         .then(() => {
//             console.log('sent');
//             return res.status(200).json({
//             status: 'success',
//             })
//         })
//         .catch((error) => {
//             return res.status(400)
//         })
// }

const getArchives = asyncHandler(async (req, res) => {
    const q = `SELECT * FROM archives`

    db.query(q, async(err, archives) => {
        if (err) return res.status(400).json({errorMessage: 'Query Error'})

        if(archives.length > 0){
            return res.status(200).json({ hasData: true, archives: archives })
        }
        else{
            return res.status(200).json({ hasData: false })
        }
    })
})

const getNotifications = asyncHandler(async (req, res) => {
    const q = `SELECT * FROM notifications`

    db.query(q, async(err, notifications) => {
        if (err) return res.status(400).json({errorMessage: 'Query Error'})

        if(notifications){
            return res.status(200).json({ hasData: true, notifications: notifications })
        }
    })
})

const deleteNotification = asyncHandler(async (req, res) => {
    const { 
        notification_id,
        forward_To
    } = req.body;

    const io = req.app.locals.io

    const q = `DELETE FROM notifications WHERE notification_id = ?`;

    db.query(q, [notification_id], async(err, result) => {
        if (err) {
            return res.status(400).json({ errorMessage: 'Failed to delete notification', error: err });
        } else {
            if (result.affectedRows > 0) {
                io.emit('notifications', {user_id: req.body.forward_To, action: 'Delete Notification'})
                return res.status(200).json({ success: true, message: 'Notification deleted successfully' });
            } else {
                return res.status(404).json({ errorMessage: 'Notification not found' });
            }
        }
    });
})


export{
    getDocuments,
    getDocument,
    addDocument,
    uploadFiles,
    getFiles,
    editDocument,
    deleteFiles,
    archiveDocument,
    getArchives,
    getNotifications,
    deleteNotification,
    forwardDocument
}