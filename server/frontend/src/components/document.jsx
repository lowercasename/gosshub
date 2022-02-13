import React, { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import ReactMarkdown from 'react-markdown';
import { Tooltip } from 'react-tippy';
import { apiCall } from '../util';
import TagField from './TagField';
import TagButton from './TagButton'

const Document = ({ document, hash, full, edit }) => {
    const [location, setLocation] = useLocation();
    const [transformation, setTransformation ] = useState(0);
    const [editorContent, setEditorContent] = useState(document.transformations[0].body);
    const [tags, setTags] = useState(document.transformations[0].tags);
    const formatDate = (date) => new Date(date).toLocaleDateString();
    const onTagFieldChange = (tags) => setTags(tags);

    const navigateTransformations = (step) => {
        if (document.transformations[transformation + step]) {
            // Only show the hash in the URL if it's _not_ the most recent transformation
            if (transformation + step === 0) {
                return setLocation(`/document/${document.uuid}`)
            }
            setLocation(`/document/${document.uuid}/hash/${document.transformations[transformation + step].hash}`)
        } 
    }
    const tippyProps = { position: "bottom", arrow: true, animation: "fade", theme: "light", distance: 17, size: "small", delay: 350, hideDelay: 0 };

    const areEqual = (arr1, arr2) => {
        if (arr1.length !== arr2.length) return false;
        return arr1.every((el, index) => el === arr2[index]);
    }

    const restoreDocument = () => {
        apiCall(`/document?uuid=${document.uuid}`, true, 'put', { body: document.transformations[transformation].body, tags: document.transformations[transformation].tags })
            .then(() => window.location.reload())
    }
    const editDocument = () => {
        if (editorContent === document.transformations[0].body && areEqual(tags, document.transformations[0].tags)) return false;
        apiCall(`/document?uuid=${document.uuid}`, true, 'put', { body: editorContent, tags })
            .then(() => setLocation(`/document/${document.uuid}`))
    }

    const transformationForHash = (needle) => {
        return document.transformations.findIndex(({ hash }) => hash === needle);
    }

    useEffect(() => {
        if (hash) setTransformation(transformationForHash(hash));
    }, [ transformation, hash]);

    return (edit
        ? <div className="document-editor">
            <textarea autoFocus value={editorContent} onChange={(e) => setEditorContent(e.currentTarget.value)} />
            <TagField existingTags={tags} onChange={onTagFieldChange} />
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
                <div className="document__tags">
                    {document.transformations[transformation].tags.map(tag => <TagButton key={tag} slug={tag} />)}
                </div>
            </main>
            <footer>
                <div className="document__meta">
                    <i className="far fa-user-circle"></i> { document.transformations[transformation].username ? <Link to={`/user/${document.transformations[transformation].username}`}>{ document.transformations[transformation].username }</Link> : <em>Deleted user</em> } on { formatDate(document.transformations[transformation].date) }
                </div>
                <div className="document__controls">
                    { document.transformations[transformation+1] && <Tooltip title="Oldest version" {...tippyProps}><button className="document__button" onClick={() => setLocation(`/document/${document.uuid}/hash/${document.transformations[document.transformations.length-1].hash}`)}><i className="far fa-chevrons-left"></i></button></Tooltip> }
                    { document.transformations[transformation+1] && <Tooltip title="Older version" {...tippyProps}><button className="document__button" onClick={() => navigateTransformations(1)}><i className="far fa-chevron-left"></i></button></Tooltip> }
                    { document.transformations[transformation-1] && <Tooltip title="Newer version" {...tippyProps}><button className="document__button" onClick={() => navigateTransformations(-1)}><i className="far fa-chevron-right"></i></button></Tooltip> }
                    { document.transformations[transformation-1] && <Tooltip title="Newest version" {...tippyProps}><button className="document__button" onClick={() => setLocation(`/document/${document.uuid}`)}><i className="far fa-chevrons-right"></i></button></Tooltip> }
                    { transformation !== 0 && <Tooltip title="Restore this version" {...tippyProps}><button className="document__button" onClick={restoreDocument}><i className="far fa-angles-up"></i></button></Tooltip> }
                    { transformation === 0 && <Tooltip title="Edit document" {...tippyProps}><button className="document__button" onClick={() => setLocation(`/document/${document.uuid}/edit`)}><i className="far fa-pencil"></i></button></Tooltip> }
                    { !full && <Tooltip title="View document" {...tippyProps}><button className="document__button" onClick={() => setLocation(`/document/${document.uuid}`)}><i className="far fa-eye"></i></button></Tooltip> }
                </div>
            </footer>
        </article>
    )
}

export default Document;
