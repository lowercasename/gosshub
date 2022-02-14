import React, { useState } from 'react';
import { useSelector } from "react-redux";
import { Link, useLocation } from 'wouter';
import { apiCall, formatDate } from '../util';

const Comment = ({ uuid, node, depth }) => {
    const [location, setLocation] = useLocation();
    const [ showEditor, setShowEditor ] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const loggedIn = useSelector(state => state.loggedIn);

    const handlePostComment = () => {
        if (!editorContent.length) return;
        apiCall('/comment', true, 'post', { body: editorContent, uuid, parent_id: node.id })
            .then(() => window.location.reload())
    };

    return (
        <div className="document__comment">
            <header className="document__comment__meta">
                <i className="far fa-user-circle"></i> { node.username ? <Link href={`/user/${node.username}`}>{ node.username }</Link> : <em>Deleted user</em> } on { formatDate(node.date) }
            </header>
            <main>
                { node.body }
                <div className='document__comment__controls'>
                    { loggedIn && depth <= 3 && <button className='document__comment__button' onClick={() => setShowEditor(!showEditor)}><i className='far fa-reply'></i> Reply</button> }
                </div>
                { showEditor && depth <= 3 && <div className='document__comment__editor'>
                    <textarea value={editorContent} onChange={(e) => setEditorContent(e.currentTarget.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handlePostComment())}/>
                    <button className='document__comment__button' onClick={handlePostComment}><i className='far fa-comment'></i> Post comment</button>
                </div> }
            </main>
            { node.children && node.children.map(node => <Comment uuid={uuid} key={node.id} node={node} depth={depth+1}/>) }
        </div>
    );
}

export default Comment;
