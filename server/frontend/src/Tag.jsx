import React, { useState, useEffect } from 'react';
import { apiCall } from './util';
import Document from './components/document.jsx';

const Tag = ({ slug }) => {
    const [documents, setDocuments] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiCall(`/tag?slug=${slug}`, true)
            .then(data => {
                setDocuments(data);
                setLoading(false);
            })
            .catch(error => {
                console.log(error);
                setLoading(false);
            })
    }, [ slug ]);

    {
        return (!loading && (document
        ? <>
            <h2>Documents tagged '{slug}'</h2>
            { documents.map(document => <Document key={document.uuid} document={document} />) }
            </>
            : <Message text="This tag does not exist." />
        ))
    }
}
export default Tag;
