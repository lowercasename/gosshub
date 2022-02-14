import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Document from './components/document';
import { useLocation } from 'wouter';
import { apiCall } from './util';

const Home = ({ searchQuery }) => {
    const [location, setLocation] = useLocation();
    const [page, setPage] = useState(1);
    const [showPageNavigation, setShowPageNavigation] = useState(true);
    const [firstRender, setFirstRender] = useState(true);
    const documents = useSelector(state => state.documents);
    const loggedIn = useSelector(state => state.loggedIn);
    const dispatch = useDispatch();
    
    // On mount only
    useEffect(() => {
        apiCall(`/document?page=${page}${searchQuery ? `&query=${searchQuery}` : ''}`)
            .then(data => {
                dispatch({ type: firstRender || searchQuery ? 'documents/set' : 'documents/append', payload: data }) 
                setFirstRender(false);
            });
        // Make a second call to see if there's another page to come
        apiCall(`/document?page=${page+1}${searchQuery ? `&query=${searchQuery}` : ''}`)
            .then(data => !data.length ? setShowPageNavigation(false) : setShowPageNavigation(true));
    }, [page, searchQuery]);

    const navigatePage = () => {
        setPage(page + 1);
    }

    return (
        <>
            { loggedIn && !searchQuery &&
                <div className="document">
                    <main>
                        <div className="document-fake-editor" onClick={() => setLocation('/new')}>Write something new!</div>
                    </main>
                </div>
            }
            { searchQuery && <h2>Results for '{searchQuery}'</h2> }
            { documents.map(document => <Document key={document.uuid} document={document} />) }
            <div className="flex-centered">
                { showPageNavigation ? <button className="gh-button" onClick={navigatePage}>Older documents</button> : <p className="muted"><i className="far fa-face-sleeping"></i> No more documents to display.</p> }
            </div>
        </>
    );
}

export default Home;
