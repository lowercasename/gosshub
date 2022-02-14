import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from "react-redux";
import { apiCall } from './util';
import Document from './components/document.jsx';
import Message from './components/message';

const Tag = ({ slug }) => {
    // const [documents, setDocuments] = useState(false);
    const [loading, setLoading] = useState(true);
    const documents = useSelector(state => state.documents);
    const dispatch = useDispatch();

    // On mount and when tag changes
    useEffect(() => {
        apiCall(`/tag?slug=${slug}`)
            .then(data => {
                dispatch({ type : 'documents/set', payload: data });
                setLoading(false);
            })
            .catch(error => {
                console.log(error);
                setLoading(false);
            })
    }, [ slug ]);

    return (!loading && (documents
        ? <>
            <h2>Documents tagged '{slug}'</h2>
            { documents.map(document => <Document key={document.uuid} document={document} />) }
            </>
            : <Message text="This tag does not exist." />
        ))
}
export default Tag;
