import React, { useState, useEffect } from "react";
import { apiCall } from './util';
import Document from './components/document';

const SingleDocument = ({ uuid, edit }) => {
    const [document, setDocument] = useState(false);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        apiCall(`/document?uuid=${uuid}`, true)
            .then(data => (setDocument(data), setLoading(false)))
            .catch(error => (console.log(error), setLoading(false)))
    }, [])
    
    return (!loading && (document
        ? <Document document={document} full={true} edit={edit} />
        : <p>This document doesn't exist. It may have been deleted.</p>
    ))
}

export default SingleDocument;
