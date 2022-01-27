import React, { useState, useEffect } from "react";
import Document from './components/document';
import { apiCall } from './util';

const Home = () => {
    const [documents, setDocuments] = useState([]);
    useEffect(() => {
        // On mount
        apiCall('/document')
            .then(data => {
                setDocuments(data);
            })
    }, []);

    return (
        <>
            { documents.map(document => <Document key={document.uuid} document={document} />) }
        </>
    );
}

export default Home;
