import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import ReactMarkdown from 'react-markdown';
import { Tooltip } from 'react-tippy';
import { apiCall } from '../util';

const Document = ({ document, full, edit }) => {
    console.log(document);
    const [location, setLocation] = useLocation();
    const [transformation, setTransformation ] = useState(0);
    const [editorContent, setEditorContent] = useState(document.transformations[0].body);
    const formatDate = (date) => new Date(date).toLocaleDateString();
    const navigateTransformations = (step) => {
        if (document.transformations[transformation + step]) {
            setTransformation(transformation + step);
        } 
    }
    const tippyProps = { position: "bottom", arrow: true, animation: "fade", theme: "light", distance: 17, size: "small", delay: 350, hideDelay: 0 };
    const restoreDocument = () => {
        apiCall(`/document?uuid=${document.uuid}`, true, 'put', { body: document.transformations[transformation].body })
            .then(() => window.location.reload())
    }
    const editDocument = () => {
        if (editorContent === document.transformations[0].body) return false;
        apiCall(`/document?uuid=${document.uuid}`, true, 'put', { body: editorContent })
            .then(() => setLocation(`/document/${document.uuid}`))
    }
    return (edit
        ? <div className="document-editor">
            <textarea value={editorContent} onChange={(e) => setEditorContent(e.currentTarget.value)} />
            <div className="document-editor__controls">
                <button className="gh-button" onClick={() => setLocation(`/document/${document.uuid}`)}>Exit editor</button>
                <button className="gh-button" onClick={editDocument} >Save changes</button>
            </div>
        </div>
        : <article className="document">
            { transformation != 0 &&
            <header className="document__header document__header--previous-version">
                <span><i className="far fa-clock-rotate-left"></i> Viewing a previous version of this document (version {transformation+1} of {document.transformations.length})</span>
            </header>
            }
            <main>
                <ReactMarkdown>{ document.transformations[transformation].body }</ReactMarkdown>
            </main>
            <footer>
                <div className="document__meta">
                    <i className="far fa-user-circle"></i> <Link to={`/user/${document.transformations[transformation].username}`}>{ document.transformations[transformation].username }</Link> on { formatDate(document.transformations[transformation].date) }
                </div>
                <div className="document__controls">
                    { document.transformations[transformation+1] && <Tooltip title="Older version" {...tippyProps}><button className="document__button" onClick={() => navigateTransformations(1)}><i className="far fa-chevron-left"></i></button></Tooltip> }
                    { document.transformations[transformation-1] && <Tooltip title="Newer version" {...tippyProps}><button className="document__button" onClick={() => navigateTransformations(-1)}><i className="far fa-chevron-right"></i></button></Tooltip> }
                    { transformation !== 0 && <Tooltip title="Restore this version" {...tippyProps}><button className="document__button" onClick={restoreDocument}><i className="far fa-angles-up"></i></button></Tooltip> }
                    { transformation === 0 && <Tooltip title="Edit document" {...tippyProps}><button className="document__button" onClick={() => setLocation(`/document/${document.uuid}/edit`)}><i className="far fa-pencil"></i></button></Tooltip> }
                    { !full && <Tooltip title="View document" {...tippyProps}><button className="document__button" onClick={() => setLocation(`/document/${document.uuid}`)}><i className="far fa-eye"></i></button></Tooltip> }
                </div>
            </footer>
        </article>
    )
}

export default Document;
