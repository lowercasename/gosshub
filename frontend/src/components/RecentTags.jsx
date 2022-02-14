import React, { useState, useEffect } from 'react';
import { apiCall } from '../util';
import TagButton from './TagButton'

const RecentTags = () => {
    const [tags, setTags] = useState(false);

    useEffect(() => {
        apiCall('/tag')
            .then(data => {
                setTags(data);
            })
            .catch(error => {
                console.log(error);
            })
    }, []);


    return ( <div className="recent-tags">
            { tags.length
            ? tags.slice(0, 20).map(tag => <TagButton key={tag.name} slug={tag.name} count={tag.count} />)
            : <p className="muted">No tags to display.</p>}
        </div>) 
}

export default RecentTags;
