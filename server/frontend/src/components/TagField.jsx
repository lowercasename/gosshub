import React, { useState, useEffect } from 'react';

const TagField = ({ existingTags, onChange }) => {
    const [tags, setTags] = useState(existingTags || []);
    const [input, setInput] = useState('');
    const [isKeyReleased, setIsKeyReleased] = useState(false);
    
    useEffect(() => {
        onChange(tags);
    }, [tags])

    const onKeyDown = (e) => {
        const { key } = e;
        if (key === "Backspace" && !input.length && tags.length && isKeyReleased) {
            e.preventDefault();
            const tagsCopy = [...tags];
            const poppedTag = tagsCopy.pop();

            setTags(tagsCopy);
            setInput(poppedTag);
        }

        const whitelist = /[^a-z0-9-]/g;
        if (!key.replace(whitelist, '').length) e.preventDefault();
        const sanitizedInput = input.trim().replace(whitelist, '');
        if ((key === ' ' || key === 'Enter' || key === ',') && sanitizedInput.length && !tags.includes(sanitizedInput) && tags.length < 3) {
            e.preventDefault();
            setTags(prevState => [...prevState, sanitizedInput]);
            setInput('');
        }

        setIsKeyReleased(false);
    }

    const onKeyUp = () => {
        setIsKeyReleased(true);
    }

    const deleteTag = (index) => {
        setTags(prevState => prevState.filter((tag, i) => i !== index))
    }

    return (
        <>
            <p><strong>Tags (maximum 3; lowercase letters, numbers, and hyphen only.)</strong></p>
            <div className='tag-field'>
                {tags.map((tag, index) => (
                    <div className='tag-field__tag' key={tag}>
                        {tag}
                        <button className="tag-field__delete-button" onClick={() => deleteTag(index)}><i className="far fa-times"></i></button>
                    </div>
                ))}
                <input
                    className='tag-field__input'
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.currentTarget.value)}
                    onKeyDown={onKeyDown}
                    onKeyUp={onKeyUp}
                    placeholder="Add a tag"
                />
            </div>
        </>
    )
}

export default TagField;
