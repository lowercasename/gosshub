import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Document from './components/document';
import { useLocation } from 'wouter';
import { apiCall } from './util';

const Home = () => {
    const [location, setLocation] = useLocation();
    const [documents, setDocuments] = useState([]);
    const loggedIn = useSelector(state => state.loggedIn);
    
    useEffect(() => {
        // On mount
        apiCall('/document')
            .then(data => {
                setDocuments(data);
            })
    }, []);

    return (
        <>
            { loggedIn &&
                <div className="document">
                    <main>
                        <div className="document-fake-editor" onClick={() => setLocation('/new')}>Write something new!</div>
                    </main>
                </div>
            }
            { documents.map(document => <Document key={document.uuid} document={document} />) }
        </>
    );
}

export default Home;
