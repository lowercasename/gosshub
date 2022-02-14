import React, { useState, useRef } from "react";
import { useLocation } from "wouter";
import { apiCall } from './util';
import TagField from './components/TagField';

const Document = () => {
    const [location, setLocation] = useLocation();
    const [editorContent, setEditorContent] = useState("");
    const [tags, setTags] = useState([]);

    const createDocument = () => {
        apiCall('/document', true, 'post', { body: editorContent, tags })
            .then(() => setLocation('/'))
    }

    const onTagFieldChange = (tags) => setTags(tags);

    return (
        <div className="document-editor">
            <textarea autoFocus value={editorContent} onChange={(e) => setEditorContent(e.currentTarget.value)} />
            <TagField onChange={onTagFieldChange} />
            <div className="document-editor__controls">
                <button className="gh-button" onClick={() => setLocation('/')}>Exit editor</button>
                <button className="gh-button" onClick={createDocument} >Create document</button>
            </div>
        </div>
    );
}

export default Document;
