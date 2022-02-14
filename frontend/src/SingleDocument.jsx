import React, { useState, useEffect } from "react";
import { apiCall } from './util';
import Document from './components/document';
import Message from './components/message';

const SingleDocument = ({ uuid, hash, edit }) => {
    const [document, setDocument] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    useEffect(() => {
        apiCall(`/document?uuid=${uuid}`)
            .then(data => {
                if (hash && !data.transformations.find(({ hash: transformationHash }) => transformationHash === hash )) {
                    setError('There is no document version matching this hash.');
                    return setLoading(false);
                }
                setDocument(data);
                setLoading(false);
            })
            .catch(error => {
                console.log(error);
                setLoading(false);
                setError("This document doesn't exist. It may have been deleted.");
            })
    }, [])
    
    return (!loading && (document
        ? <Document document={document} full={true} edit={edit} hash={hash} />
        : <Message text={error} />
    ))
}

export default SingleDocument;
